import requestHandler, {
  BlankspaceResponse,
} from "@/common/data/api/requestHandler";
import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import { SignedFile, validateSignable } from "@/common/lib/signedFiles";
import { authenticatorsPath, preKeysPath } from "@/constants/supabase";
import stringify from "fast-json-stable-stringify";
import { indexOf, isUndefined, map } from "lodash";
import { NextApiRequest, NextApiResponse } from "next/types";

export type AuthenticatorResponse = BlankspaceResponse;

export type AuthenticatorUpdateRequest = {
  file: SignedFile;
  identityPublicKey: string;
};

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<AuthenticatorResponse>,
) {
  const { file, identityPublicKey } =
    req.body as Partial<AuthenticatorUpdateRequest>;
  if (isUndefined(file) || isUndefined(identityPublicKey)) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Must provide file with signature, and the identity public key",
      },
    });
  } else {
    if (!validateSignable(file)) {
      res.status(400).json({
        result: "error",
        error: {
          message: "Provided signature invalid",
        },
      });
      return;
    }
    const { data, error } = await createSupabaseServerClient()
      .storage
      .from("private")
      .list(preKeysPath(identityPublicKey));
    if (error !== null || data === null) {
      res.status(500).json({
        result: "error",
        error: {
          message: `Could not validate pre-keys`,
        },
      });
    } else {
      const prekeys = map(data, (d) => d.name);
      if (indexOf(prekeys, file.publicKey) === -1) {
        res.status(400).json({
          result: "error",
          error: {
            message: `Prekey ${file.publicKey} is not a valid prekey for identity ${identityPublicKey}`,
          },
        });
      } else {
        const { error: storageError } = await createSupabaseServerClient()
          .storage
          .from("private")
          .upload(
            `${authenticatorsPath(identityPublicKey)}`,
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
              message: "Failed to save Authenticator data",
            },
          });
        } else {
          res.status(200).json({
            result: "success",
          });
        }
      }
    }
  }
}

export default requestHandler({
  post: handlePost,
});
