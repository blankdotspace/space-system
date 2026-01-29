import type { NextApiRequest, NextApiResponse } from "next";
import { ed25519 } from "@noble/curves/ed25519";
import moment from "moment";
import { first, isArray } from "lodash";

import requestHandler, { NounspaceResponse } from "@/common/data/api/requestHandler";
import neynar from "@/common/data/api/neynar";
import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import { hashObject } from "@/common/lib/signedFiles";

export type InferFidLinkRequest = {
  identityPublicKey: string;
  walletAddress: string;
  timestamp: string;
  signature: string;
};

export type InferFidLinkResponse = NounspaceResponse<{
  fid: number;
  identityPublicKey: string;
  created: string;
  inferredFromAddress: string;
} | null>;

function isInferFidLinkRequest(maybe: unknown): maybe is InferFidLinkRequest {
  return (
    !!maybe &&
    typeof maybe === "object" &&
    typeof (maybe as any).identityPublicKey === "string" &&
    typeof (maybe as any).walletAddress === "string" &&
    typeof (maybe as any).timestamp === "string" &&
    typeof (maybe as any).signature === "string"
  );
}

function validateRequestSignature(req: InferFidLinkRequest) {
  const message = hashObject({
    identityPublicKey: req.identityPublicKey,
    walletAddress: req.walletAddress,
    timestamp: req.timestamp,
  });
  try {
    return ed25519.verify(req.signature, message, req.identityPublicKey);
  } catch {
    return false;
  }
}

async function inferAndLinkFid(req: NextApiRequest, res: NextApiResponse<InferFidLinkResponse>) {
  const body = req.body;
  if (!isInferFidLinkRequest(body)) {
    return res.status(400).json({
      result: "error",
      error: { message: "Request requires identityPublicKey, walletAddress, timestamp, signature" },
    });
  }
  if (!validateRequestSignature(body)) {
    return res.status(400).json({
      result: "error",
      error: { message: "Invalid signature" },
    });
  }

  // If Neynar isn't configured, we can't infer an FID during signup.
  // Treat as "no inferred FID" so the client can fall back to prompting Farcaster connection.
  if (!process.env.NEYNAR_API_KEY) {
    return res.status(200).json({ result: "success", value: null });
  }

  const walletAddress = body.walletAddress.toLowerCase();
  const supabase = createSupabaseServerClient();

  // Ensure this identity is actually associated with the wallet address in our DB.
  const { data: walletIdentity, error: walletIdentityError } = await supabase
    .from("walletIdentities")
    .select("identityPublicKey, walletAddress")
    .eq("identityPublicKey", body.identityPublicKey)
    .maybeSingle();

  if (walletIdentityError) {
    return res.status(500).json({
      result: "error",
      error: { message: walletIdentityError.message },
    });
  }
  if (!walletIdentity) {
    return res.status(400).json({
      result: "error",
      error: { message: "Identity is not linked to provided wallet address" },
    });
  }

  // wallet addresses may be checksummed; match case-insensitively
  if (walletIdentity.walletAddress.toLowerCase() !== walletAddress) {
    return res.status(400).json({
      result: "error",
      error: { message: "Identity is not linked to provided wallet address" },
    });
  }

  let inferredFid: number | null = null;
  try {
    const response = await neynar.fetchBulkUsersByEthOrSolAddress({ addresses: [walletAddress] });
    const mapping = (response as any)?.[walletAddress];
    const user = isArray(mapping) ? first(mapping) : undefined;
    if (user && typeof user.fid === "number") inferredFid = user.fid;
  } catch (e: any) {
    const status = e?.response?.status;
    // If Neynar rejects due to auth/config, treat as "can't infer" rather than blocking signup.
    if (status === 401 || status === 403) {
      return res.status(200).json({ result: "success", value: null });
    }
    return res.status(500).json({
      result: "error",
      error: { message: e?.message || "Failed to infer FID from address" },
    });
  }

  if (!inferredFid) {
    return res.status(200).json({ result: "success", value: null });
  }

  const created = body.timestamp || moment().toISOString();

  // Upsert by fid (unique), but allow signer-related fields to remain null.
  const { data: existing } = await supabase
    .from("fidRegistrations")
    .select("fid, created")
    .eq("fid", inferredFid);

  if (existing && existing.length > 0) {
    const currentRecord = first(existing);
    if (moment(currentRecord?.created).isAfter(created)) {
      return res.status(200).json({
        result: "success",
        value: {
          fid: inferredFid,
          identityPublicKey: body.identityPublicKey,
          created: currentRecord!.created,
          inferredFromAddress: walletAddress,
        },
      });
    }
    const { data, error } = await supabase
      .from("fidRegistrations")
      .update({
        created,
        identityPublicKey: body.identityPublicKey,
        isSigningKeyValid: false,
        signature: null,
        signingKeyLastValidatedAt: null,
        signingPublicKey: null,
      })
      .eq("fid", inferredFid)
      .select();
    if (error) {
      return res.status(500).json({ result: "error", error: { message: error.message } });
    }
    return res.status(200).json({
      result: "success",
      value: {
        fid: inferredFid,
        identityPublicKey: body.identityPublicKey,
        created,
        inferredFromAddress: walletAddress,
      },
    });
  }

  const { error: insertError } = await supabase.from("fidRegistrations").insert({
    fid: inferredFid,
    created,
    identityPublicKey: body.identityPublicKey,
    isSigningKeyValid: false,
    signature: null,
    signingKeyLastValidatedAt: null,
    signingPublicKey: null,
  });

  if (insertError) {
    return res.status(500).json({ result: "error", error: { message: insertError.message } });
  }

  return res.status(200).json({
    result: "success",
    value: {
      fid: inferredFid,
      identityPublicKey: body.identityPublicKey,
      created,
      inferredFromAddress: walletAddress,
    },
  });
}

export default requestHandler({ post: inferAndLinkFid });
