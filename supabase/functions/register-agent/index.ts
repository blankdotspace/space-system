import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createPublicClient, http, encodeAbiParameters } from "npm:viem@2";
import { optimism } from "npm:viem@2/chains";
import { mnemonicToAccount } from "npm:viem@2/accounts";
import { ed25519 } from "npm:@noble/curves@1/ed25519";
import { blake3 } from "npm:@noble/hashes@1/blake3";
import stringify from "npm:fast-json-stable-stringify@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Farcaster IdRegistry on Optimism
const ID_REGISTRY_ADDRESS =
  "0x00000000Fc6c5F01Fc30151999387Bb99A9f489b" as const;

const idOfAbi = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "idOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Farcaster KeyGateway on Optimism
const KEY_GATEWAY_ADDRESS =
  "0x00000000fC56947c7E7183f8Ca4B62398CaAdf0B" as const;

// EIP-712 constants for SignedKeyRequest
const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
  name: "Farcaster SignedKeyRequestValidator",
  version: "1",
  chainId: 10,
  verifyingContract:
    "0x00000000FC700472606ED4fA22623Acf62c60553" as `0x${string}`,
};

const SIGNED_KEY_REQUEST_TYPE = [
  { name: "requestFid", type: "uint256" },
  { name: "key", type: "bytes" },
  { name: "deadline", type: "uint256" },
] as const;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function hashObject(obj: object): Uint8Array {
  const encoder = new TextEncoder();
  return blake3(encoder.encode(stringify(obj)), { dkLen: 256 });
}

function rootKeyPath(
  identityPublicKey: string,
  walletAddress: string,
): string {
  return `${identityPublicKey}/keys/root/${walletAddress}`;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── create-signer-request ───────────────────────────────────────────

async function handleCreateSignerRequest(
  custodyAddress: string,
  signerPublicKey: string,
): Promise<Response> {
  // Validate inputs
  if (
    !custodyAddress ||
    !/^0x[a-fA-F0-9]{40}$/.test(custodyAddress)
  ) {
    return jsonResponse(
      { success: false, error: "Invalid custody address" },
      400,
    );
  }
  if (
    !signerPublicKey ||
    !/^0x[a-fA-F0-9]{64}$/.test(signerPublicKey)
  ) {
    return jsonResponse(
      {
        success: false,
        error:
          "Invalid signer public key — must be 0x-prefixed 32-byte hex",
      },
      400,
    );
  }

  // 1. Look up FID on-chain
  const publicClient = createPublicClient({
    chain: optimism,
    transport: http(),
  });

  let fid: bigint;
  try {
    fid = (await publicClient.readContract({
      address: ID_REGISTRY_ADDRESS,
      abi: idOfAbi,
      functionName: "idOf",
      args: [custodyAddress as `0x${string}`],
    })) as bigint;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse(
      { success: false, error: "Failed to look up FID on-chain: " + msg },
      500,
    );
  }

  if (!fid || fid === 0n) {
    return jsonResponse(
      {
        success: false,
        error: "No FID found for this custody address",
      },
      404,
    );
  }

  // 2. Get or create wallet identity
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      { success: false, error: "Server misconfigured" },
      500,
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const walletLower = custodyAddress.toLowerCase();

  const { data: existingIdentity } = await supabase
    .from("walletIdentities")
    .select("identityPublicKey")
    .eq("walletAddress", walletLower)
    .limit(1)
    .single();

  let identityPublicKey: string;

  if (existingIdentity) {
    identityPublicKey = existingIdentity.identityPublicKey;
  } else {
    // Generate ED25519 identity keypair server-side
    const identityPrivateKey = ed25519.utils.randomPrivateKey();
    const identityPublicKeyBytes = ed25519.getPublicKey(identityPrivateKey);
    identityPublicKey = bytesToHex(identityPublicKeyBytes);

    const nonce = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Build unsigned identity request
    const unsignedRequest = {
      type: "Create",
      identityPublicKey,
      walletAddress: walletLower,
      nonce,
      timestamp,
    };

    // Sign with Blake3 hash + Ed25519 (same pattern as deploy-community-config)
    const messageHash = hashObject(unsignedRequest);
    const signature = bytesToHex(
      ed25519.sign(messageHash, identityPrivateKey),
    );

    // Insert walletIdentity
    const { error: insertError } = await supabase
      .from("walletIdentities")
      .insert({
        type: "Create",
        identityPublicKey,
        walletAddress: walletLower,
        nonce,
        timestamp,
        signature,
      });

    if (insertError) {
      console.error("Error creating identity:", insertError);
      return jsonResponse(
        {
          success: false,
          error: "Failed to create identity",
          details: insertError.message,
        },
        500,
      );
    }

    // Build and store signed key file
    // Store the full RootSpaceKeys structure so the app can load it directly
    const salt = crypto.randomUUID();
    const rootSpaceKeys = {
      publicKey: identityPublicKey,
      privateKey: bytesToHex(identityPrivateKey),
      type: "root",
      salt,
    };
    const encoder = new TextEncoder();
    const keyFileData = {
      publicKey: identityPublicKey,
      fileData: bytesToHex(encoder.encode(JSON.stringify(rootSpaceKeys))),
      fileType: "json",
      isEncrypted: false,
      timestamp,
    };
    const keyFileHash = hashObject(keyFileData);
    const keyFileSignature = bytesToHex(
      ed25519.sign(keyFileHash, identityPrivateKey),
    );
    const signedKeyFile = { ...keyFileData, signature: keyFileSignature };

    const keyFilePath = rootKeyPath(identityPublicKey, walletLower);
    const { error: storageError } = await supabase.storage
      .from("private")
      .upload(
        keyFilePath,
        new Blob([JSON.stringify(signedKeyFile)], {
          type: "application/json",
        }),
        { upsert: true },
      );

    if (storageError) {
      console.error("Error uploading key file:", storageError);
      return jsonResponse(
        {
          success: false,
          error: "Failed to store identity key file",
          details: storageError.message,
        },
        500,
      );
    }
  }

  // 3. Sign the key request with APP_MNEMONIC
  const APP_MNEMONIC = Deno.env.get("APP_MNEMONIC");
  const APP_FID = Deno.env.get("APP_FID");
  if (!APP_MNEMONIC || !APP_FID) {
    return jsonResponse(
      { success: false, error: "Server misconfigured (app credentials)" },
      500,
    );
  }

  const appAccount = mnemonicToAccount(APP_MNEMONIC);
  const appFid = BigInt(APP_FID);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours

  const eip712Signature = await appAccount.signTypedData({
    domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
    types: {
      SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE,
    },
    primaryType: "SignedKeyRequest",
    message: {
      requestFid: appFid,
      key: signerPublicKey as `0x${string}`,
      deadline,
    },
  });

  const metadata = encodeAbiParameters(
    [
      {
        components: [
          { name: "requestFid", type: "uint256" },
          { name: "requestSigner", type: "address" },
          { name: "signature", type: "bytes" },
          { name: "deadline", type: "uint256" },
        ],
        type: "tuple",
      },
    ],
    [
      {
        requestFid: appFid,
        requestSigner: appAccount.address,
        signature: eip712Signature,
        deadline,
      },
    ],
  );

  return jsonResponse({
    success: true,
    fid: Number(fid),
    identityPublicKey,
    metadata,
    deadline: Number(deadline),
    keyGatewayAddress: KEY_GATEWAY_ADDRESS,
  });
}

// ─── complete-registration ───────────────────────────────────────────

async function handleCompleteRegistration(
  custodyAddress: string,
  signerPublicKey: string,
  txHash: string,
): Promise<Response> {
  if (
    !custodyAddress ||
    !/^0x[a-fA-F0-9]{40}$/.test(custodyAddress)
  ) {
    return jsonResponse(
      { success: false, error: "Invalid custody address" },
      400,
    );
  }
  if (
    !signerPublicKey ||
    !/^0x[a-fA-F0-9]{64}$/.test(signerPublicKey)
  ) {
    return jsonResponse(
      { success: false, error: "Invalid signer public key" },
      400,
    );
  }
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return jsonResponse(
      { success: false, error: "Invalid transaction hash" },
      400,
    );
  }

  // 1. Verify transaction on Optimism
  const publicClient = createPublicClient({
    chain: optimism,
    transport: http(),
  });

  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse(
      {
        success: false,
        error: "Failed to fetch transaction receipt: " + msg,
      },
      500,
    );
  }

  if (!receipt || receipt.status !== "success") {
    return jsonResponse(
      {
        success: false,
        error: "Transaction not confirmed or failed",
      },
      400,
    );
  }

  // 2. Look up FID for custody address
  let fid: bigint;
  try {
    fid = (await publicClient.readContract({
      address: ID_REGISTRY_ADDRESS,
      abi: idOfAbi,
      functionName: "idOf",
      args: [custodyAddress as `0x${string}`],
    })) as bigint;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse(
      { success: false, error: "Failed to look up FID: " + msg },
      500,
    );
  }

  if (!fid || fid === 0n) {
    return jsonResponse(
      { success: false, error: "No FID found for this custody address" },
      404,
    );
  }

  // 3. Look up identity for wallet
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      { success: false, error: "Server misconfigured" },
      500,
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const walletLower = custodyAddress.toLowerCase();

  const { data: identity, error: identityError } = await supabase
    .from("walletIdentities")
    .select("identityPublicKey")
    .eq("walletAddress", walletLower)
    .limit(1)
    .single();

  if (identityError || !identity) {
    return jsonResponse(
      {
        success: false,
        error:
          "No identity found for this wallet. Call create-signer-request first.",
      },
      400,
    );
  }

  // 4. Insert into fidRegistrations (upsert on fid)
  const now = new Date().toISOString();
  const { error: regError } = await supabase
    .from("fidRegistrations")
    .upsert(
      {
        fid: Number(fid),
        identityPublicKey: identity.identityPublicKey,
        signingPublicKey: signerPublicKey.startsWith("0x")
          ? signerPublicKey.slice(2)
          : signerPublicKey,
        isSigningKeyValid: true,
        signingKeyLastValidatedAt: now,
        signature: txHash.startsWith("0x") ? txHash.slice(2) : txHash,
      },
      { onConflict: "fid" },
    );

  if (regError) {
    console.error("Error inserting fidRegistration:", regError);
    return jsonResponse(
      {
        success: false,
        error: "Failed to create FID registration",
        details: regError.message,
      },
      500,
    );
  }

  return jsonResponse({
    success: true,
    fid: Number(fid),
    identityPublicKey: identity.identityPublicKey,
  });
}

// ─── Neynar hub helpers ──────────────────────────────────────────────

const NEYNAR_HUB_URL = "https://hub-api.neynar.com";

function getNeynarApiKey(): string | null {
  return Deno.env.get("NEYNAR_API_KEY") || null;
}

async function publishMessageToHub(
  messageBytes: Uint8Array,
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  const apiKey = getNeynarApiKey();
  if (!apiKey) {
    return { success: false, error: "Server misconfigured (missing Neynar API key)" };
  }

  try {
    const resp = await fetch(`${NEYNAR_HUB_URL}/v1/submitMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-api-key": apiKey,
      },
      body: messageBytes,
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { success: false, error: `Hub rejected message (${resp.status}): ${text}` };
    }

    const data = await resp.json();
    return { success: true, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: "Failed to publish to hub: " + msg };
  }
}

// ─── set-fname ───────────────────────────────────────────────────────

const FARCASTER_FNAME_ENDPOINT = "https://fnames.farcaster.xyz/transfers";

async function handleSetFname(
  username: string,
  fid: number,
  owner: string,
  timestamp: number,
  signature: string,
): Promise<Response> {
  if (!username || typeof username !== "string") {
    return jsonResponse({ success: false, error: "Missing username" }, 400);
  }
  if (!fid || typeof fid !== "number") {
    return jsonResponse({ success: false, error: "Missing or invalid fid" }, 400);
  }
  if (!owner || !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
    return jsonResponse({ success: false, error: "Missing or invalid owner address" }, 400);
  }
  if (!timestamp || typeof timestamp !== "number") {
    return jsonResponse({ success: false, error: "Missing or invalid timestamp" }, 400);
  }
  if (!signature || !signature.startsWith("0x")) {
    return jsonResponse({ success: false, error: "Missing or invalid signature" }, 400);
  }

  // Register fname with the Farcaster fname server
  try {
    const fnameResp = await fetch(FARCASTER_FNAME_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: username,
        from: 0,
        to: fid,
        fid: fid,
        owner,
        timestamp,
        signature,
      }),
    });

    if (!fnameResp.ok) {
      const errData = await fnameResp.json().catch(() => ({}));
      const d = errData as Record<string, unknown>;
      const errMsg = d?.error || d?.code || fnameResp.statusText;
      return jsonResponse(
        { success: false, error: `Fname server rejected: ${errMsg}` },
        fnameResp.status,
      );
    }

    const fnameData = await fnameResp.json();
    return jsonResponse({ success: true, transfer: fnameData });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse(
      { success: false, error: "Failed to register fname: " + msg },
      500,
    );
  }
}

// ─── publish-message ─────────────────────────────────────────────────

async function handlePublishMessage(
  messageBytes: string,
): Promise<Response> {
  if (!messageBytes || typeof messageBytes !== "string") {
    return jsonResponse(
      { success: false, error: "Missing messageBytes (hex-encoded protobuf)" },
      400,
    );
  }

  const bytes = hexToBytes(messageBytes);
  const result = await publishMessageToHub(bytes);

  if (!result.success) {
    return jsonResponse({ success: false, error: result.error }, 500);
  }

  return jsonResponse({ success: true, data: result.data });
}

// ─── Main handler ────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON body" },
      400,
    );
  }

  const { operation } = body;

  switch (operation) {
    case "create-signer-request":
      return handleCreateSignerRequest(
        body.custodyAddress as string,
        body.signerPublicKey as string,
      );
    case "complete-registration":
      return handleCompleteRegistration(
        body.custodyAddress as string,
        body.signerPublicKey as string,
        body.txHash as string,
      );
    case "set-fname":
      return handleSetFname(
        body.username as string,
        body.fid as number,
        body.owner as string,
        body.timestamp as number,
        body.signature as string,
      );
    case "publish-message":
      return handlePublishMessage(
        body.messageBytes as string,
      );
    default:
      return jsonResponse(
        {
          success: false,
          error:
            'Unknown operation. Use "create-signer-request", "complete-registration", "set-fname", or "publish-message".',
        },
        400,
      );
  }
});
