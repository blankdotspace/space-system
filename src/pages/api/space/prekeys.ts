import requestHandler, {
  BlankspaceResponse,
} from "@/common/data/api/requestHandler";
import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import { SignedFile, validateSignable } from "@/common/lib/signedFiles";
import { preKeysPath } from "@/constants/supabase";
import stringify from "fast-json-stable-stringify";
import { isArray, isUndefined, map } from "lodash";
import { NextApiRequest, NextApiResponse } from "next/types";

export type PreKeyRequest = {
  file: SignedFile;
  prekeyPublicKey: string;
  identityPublicKey: string;
};

export type PreKeyResponseData = string[];

export type PreKeyResponse = BlankspaceResponse<PreKeyResponseData>;

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<PreKeyResponse>,
) {
  // Take in a request with information about the prekeys that will be saved
  // And write it to the storage bucket
  // After verifying that the signatures are valid
  const { file, prekeyPublicKey, identityPublicKey } =
    req.body as Partial<PreKeyRequest>;
  if (
    isUndefined(file) ||
    isUndefined(prekeyPublicKey) ||
    isUndefined(identityPublicKey)
  ) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Must provide file with signature, the identity public key, and the public key of the prekey being created",
      },
    });
  } else {
    if (file.publicKey !== identityPublicKey) {
      res.status(400).json({
        result: "error",
        error: {
          message: "File public key must match the identity public key",
        },
      });
      return;
    }
    if (!validateSignable(file)) {
      res.status(400).json({
        result: "error",
        error: {
          message: "Provided signature invalid",
        },
      });
      return;
    }
    const { error: storageError } = await createSupabaseServerClient()
      .storage
      .from("private")
      .upload(
        `${preKeysPath(identityPublicKey)}/${prekeyPublicKey}`,
        new Blob([stringify(file)], { type: "application/json" }),
        {
          upsert: true,
        },
      );
    if (storageError) {
      console.error(storageError);
      res.status(500).json({
        result: "error",
        error: {
          message: "An error occurred saving the file, please try again",
        },
      });
    } else {
      res.status(200).json({
        result: "success",
        value: [`${preKeysPath(identityPublicKey)}/${prekeyPublicKey}`],
      });
    }
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<PreKeyResponse>,
) {
  // Returns a list of prekeys for a given identity public key
  const identityPublicKey = req.query.publicKey;
  if (isUndefined(identityPublicKey) || isArray(identityPublicKey)) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "publicKey query parameter must be provided as a single string",
      },
    });
  } else {
    const { data, error } = await createSupabaseServerClient()
      .storage
      .from("private")
      .list(preKeysPath(identityPublicKey));
    if (error !== null) {
      res.status(500).json({
        result: "error",
        error: {
          message: `An error occurred loading data from the bucket: ${error.message}`,
        },
      });
    } else if (data !== null) {
      res.status(200).json({
        result: "success",
        value: map(data, (d) => `${preKeysPath(identityPublicKey)}${d.name}`),
      });
    } else {
      res.status(200).json({
        result: "success",
        value: [],
      });
    }
  }
}

export default requestHandler({
  post: handlePost,
  get: handleGet,
});
