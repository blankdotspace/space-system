import { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";
import { rootKeyPath } from "@/constants/supabase";
import { isUndefined } from "lodash";
import { ed25519 } from "@noble/curves/ed25519";
import stringify from "fast-json-stable-stringify";
import requestHandler, {
  NounspaceResponse,
} from "@/common/data/api/requestHandler";
import {
  SignedFile,
  hashObject,
  validateSignable,
} from "@/common/lib/signedFiles";

export interface UnsignedIdentityRequest {
  type: "Create" | "Revoke";
  identityPublicKey: string;
  walletAddress: string;
  nonce: string;
  timestamp: string;
}

export interface IdentityRequest extends UnsignedIdentityRequest {
  signature: string;
}

interface IdentityResponseError {
  message: string;
}

export type IdentityResponse = NounspaceResponse<
  IdentityRequest | IdentityRequest[],
  IdentityResponseError
>;

function validateRequestSignature(req: IdentityRequest) {
  const message = hashObject({
    ...req,
    signature: undefined,
  });
  return ed25519.verify(req.signature, message, req.identityPublicKey);
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<IdentityResponse>,
) {
  try {
    const { file, identityRequest } = req.body as {
      file?: SignedFile;
      identityRequest: IdentityRequest;
    };
    if (!validateRequestSignature(identityRequest)) {
      throw Error("Invalid signature on request");
    }
    if (identityRequest.type === "Create" && !isUndefined(file)) {
      if (!validateSignable(file)) {
        throw Error("Invalid signature on keys file");
      }
      const supabase = createSupabaseServerClient();
      const { error } = await supabase
        .from("walletIdentities")
        .insert(identityRequest);
      if (error) {
        throw error;
      }
      const { error: storageError } = await supabase.storage
        .from("private")
        .upload(
          rootKeyPath(
            identityRequest.identityPublicKey,
            identityRequest.walletAddress,
          ),
          new Blob([stringify(file)], { type: "application/json" }),
          {
            upsert: true,
          },
        );
      if (storageError) {
        throw storageError;
      }
    }
    res.status(200).json({
      result: "success",
      value: identityRequest,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      result: "error",
      error: {
        message: "Malformed POST request",
      },
    });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<IdentityResponse>,
) {
  const query = req.query;
  if (query.address) {
    const address = Array.isArray(query.address) ? query.address[0] : query.address;
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("walletIdentities")
      .select()
      .ilike("walletAddress", address);
    if (error) {
      res.status(500).json({
        result: "error",
        error: {
          message: error.message,
        },
      });
    } else {
      res.status(200).json({
        result: "success",
        value: data as IdentityRequest | IdentityRequest[],
      });
    }
  } else {
    res.status(400).json({
      result: "error",
      error: {
        message: "Must provide `address` in the query",
      },
    });
  }
}

export default requestHandler({
  post: handlePost,
  get: handleGet,
});
