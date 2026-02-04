import requestHandler, {
  NounspaceResponse,
} from "@/common/data/api/requestHandler";
import { isSignable, validateSignable } from "@/common/lib/signedFiles";
import { NextApiRequest, NextApiResponse } from "next";
import neynar from "@/common/data/api/neynar";
import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import moment from "moment";
import { first, isArray, isUndefined, map } from "lodash";

export type FidLinkToIdentityRequest = {
  fid: number;
  identityPublicKey: string;
  timestamp: string;
  signature: string;
  signingPublicKey: string;
};

function isFidLinkToIdentityRequest(
  maybe: unknown,
): maybe is FidLinkToIdentityRequest {
  if (!isSignable(maybe, "signingPublicKey")) {
    return false;
  }
  return (
    typeof maybe["fid"] === "number" &&
    typeof maybe["timestamp"] === "string" &&
    typeof maybe["identityPublicKey"] === "string"
  );
}

export type FidLinkToIdentityResponse = NounspaceResponse<{
  fid: number;
  identityPublicKey: string;
  created: string;
  signature: string | null;
  signingPublicKey: string | null;
  isSigningKeyValid: boolean;
}>;

async function checkSigningKeyValidForFid(fid: number, signingKey: string) {
  try {
    const result = await neynar.lookupDeveloperManagedSigner({publicKey: signingKey});
    return result.fid === fid && result.status === "approved";
  } catch {
    return false;
  }
}

async function linkFidToIdentity(
  req: NextApiRequest,
  res: NextApiResponse<FidLinkToIdentityResponse>,
) {
  const reqBody = req.body;
  if (!isFidLinkToIdentityRequest(reqBody)) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Registration request requires fid, timestamp, identityPublicKey, signingPublicKey, and a signature",
      },
    });
    return;
  }
  if (!validateSignable(reqBody, "signingPublicKey")) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Invalid signature",
      },
    });
    return;
  }
  if (!(await checkSigningKeyValidForFid(reqBody.fid, reqBody.signingPublicKey))) {
    res.status(400).json({
      result: "error",
      error: {
        message: `Signing key ${reqBody.signingPublicKey} is not valid for fid ${reqBody.fid}`,
      },
    });
    return;
  }
  const { data: checkExistsData } = await createSupabaseServerClient()
    .from("fidRegistrations")
    .select("fid, created")
    .eq("fid", reqBody.fid);
  if (checkExistsData && checkExistsData.length > 0) {
    const currentRecord = first(checkExistsData);
    if (moment(currentRecord?.created).isAfter(reqBody.timestamp)) {
      res.status(400).json({
        result: "error",
        error: {
          message:
            "New registration is less recent than current registration, try again",
        },
      });
      return;
    }
    const { data, error } = await createSupabaseServerClient()
      .from("fidRegistrations")
      .update({
        created: reqBody.timestamp,
        identityPublicKey: reqBody.identityPublicKey,
        isSigningKeyValid: true,
        signature: reqBody.signature,
        signingKeyLastValidatedAt: moment().toISOString(),
        signingPublicKey: reqBody.signingPublicKey,
      })
      .eq("fid", reqBody.fid)
      .select();
    if (error !== null) {
      res.status(500).json({
        result: "error",
        error: {
          message: error.message,
        },
      });
      return;
    }
    res.status(200).json({
      result: "success",
      value: first(data),
    });
  } else {
    const { data, error } = await createSupabaseServerClient()
      .from("fidRegistrations")
      .insert({
        fid: reqBody.fid,
        created: reqBody.timestamp,
        identityPublicKey: reqBody.identityPublicKey,
        isSigningKeyValid: true,
        signature: reqBody.signature,
        signingKeyLastValidatedAt: moment().toISOString(),
        signingPublicKey: reqBody.signingPublicKey,
      })
      .select();
    if (error !== null) {
      res.status(500).json({
        result: "error",
        error: {
          message: error.message,
        },
      });
      return;
    }
    res.status(200).json({
      result: "success",
      value: first(data),
    });
  }
}

export type FidsLinkedToIdentityResponse = NounspaceResponse<{
  identity: string;
  fids: number[];
}>;

async function lookUpFidsForIdentity(
  req: NextApiRequest,
  res: NextApiResponse<FidsLinkedToIdentityResponse>,
) {
  const identity = req.query.identityPublicKey;
  if (isUndefined(identity) || isArray(identity)) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "identityPublicKey must be provided as a single query argument",
      },
    });
    return;
  }
  const { data, error } = await createSupabaseServerClient()
    .from("fidRegistrations")
    .select("fid")
    .eq("identityPublicKey", identity)
    ;
  if (error) {
    res.status(500).json({
      result: "error",
      error: {
        message: error.message,
      },
    });
    return;
  }
  // TO DO: Refresh that these signatures are valid
  let results: number[] = [];
  if (data !== null) {
    results = map(data, ({ fid }) => fid);
  }
  res.status(200).json({
    result: "success",
    value: {
      identity,
      fids: results,
    },
  });
}

export default requestHandler({
  post: linkFidToIdentity,
  get: lookUpFidsForIdentity,
});
