import requestHandler, {
  BlankspaceResponse,
} from "@/common/data/api/requestHandler";
import {
  SignedFile,
  isSignedFile,
  validateSignable,
} from "@/common/lib/signedFiles";
import { NextApiRequest, NextApiResponse } from "next/types";
import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import stringify from "fast-json-stable-stringify";
import { homebasePath } from "@/constants/supabase";

export type UpdateHomebaseResponse = BlankspaceResponse<boolean>;
export type UpdateHomebaseRequest = SignedFile;

async function updateHomebase(
  req: NextApiRequest,
  res: NextApiResponse<UpdateHomebaseResponse>,
) {
  const file: UpdateHomebaseRequest = req.body;
  if (!isSignedFile(file)) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Config must contain publicKey, fileData, fileType, isEncrypted, and timestamp",
      },
    });
    return;
  }
  if (!validateSignable(file)) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Invalid signature",
      },
    });
    return;
  }
  const { error } = await createSupabaseServerClient()
    .storage
    .from("private")
    .upload(
      homebasePath(file.publicKey),
      new Blob([stringify(file)], { type: "application/json" }),
      {
        upsert: true,
      },
    );
  if (error) {
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
    value: true,
  });
}

export default requestHandler({
  post: updateHomebase,
});
