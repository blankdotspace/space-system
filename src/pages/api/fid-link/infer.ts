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

  // Use server time (not client-provided timestamp) to avoid clock skew attacks.
  const serverNow = moment().toISOString();

  // Check if a FID registration already exists.
  // Selecting all needed fields to make the correct decision about whether to update.
  const { data: existing, error: queryError } = await supabase
    .from("fidRegistrations")
    .select("fid, created, identityPublicKey")
    .eq("fid", inferredFid);

  if (queryError) {
    return res.status(500).json({
      result: "error",
      error: { message: queryError.message },
    });
  }

  if (existing && existing.length > 0) {
    const currentRecord = first(existing);
    const existingIdentityPublicKey = currentRecord?.identityPublicKey as string | null | undefined;

    // SECURITY: If this FID is already linked to a different identity, reject the reassignment.
    // This prevents an attacker from taking over a FID they don't own.
    if (existingIdentityPublicKey && existingIdentityPublicKey !== body.identityPublicKey) {
      return res.status(400).json({
        result: "error",
        error: { message: "FID is already linked to a different identity" },
      });
    }

    // If the existing record was created after our request timestamp,
    // the record is newer, so return the existing data without updating.
    if (moment(currentRecord?.created).isAfter(body.timestamp)) {
      return res.status(200).json({
        result: "success",
        value: {
          fid: inferredFid,
          identityPublicKey: currentRecord!.identityPublicKey,
          created: currentRecord!.created,
          inferredFromAddress: walletAddress,
        },
      });
    }

    // Record is older than the request, so update it with the new information.
    // NOTE: Do NOT clear out signer fields here. If a signer was previously authorized,
    // we should preserve it. Only infer/update the identity link.
    const { error: updateError } = await supabase
      .from("fidRegistrations")
      .update({
        identityPublicKey: body.identityPublicKey,
        // Do NOT set signer fields to null—preserve existing signer if present
      })
      .eq("fid", inferredFid)
      .select();

    if (updateError) {
      return res.status(500).json({ result: "error", error: { message: updateError.message } });
    }

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

  // NOTE: Do NOT create a fidRegistrations record here with null/false signer fields.
  // fidRegistrations should only be created when a user has a valid, authenticated signer.
  // The inferred FID is returned to the client for use in client state, but NO database
  // record is created yet. When the user later performs a write action, they will
  // authorize a signer, at which point a full fidRegistration will be created.
  //
  // This preserves the security invariant: fidRegistrations always represents
  // authenticated ownership of a FID.

  return res.status(200).json({
    result: "success",
    value: {
      fid: inferredFid,
      identityPublicKey: body.identityPublicKey,
      created: serverNow,
      inferredFromAddress: walletAddress,
    },
  });
}

export default requestHandler({ post: inferAndLinkFid });
