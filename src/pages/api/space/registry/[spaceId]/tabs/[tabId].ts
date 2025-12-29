// Edit and delete tabs
import requestHandler, {
  NounspaceResponse,
} from "@/common/data/api/requestHandler";
import {
  Signable,
  SignedFile,
  isSignable,
  isSignedFile,
  validateSignable,
} from "@/common/lib/signedFiles";
import { findIndex, isNull } from "lodash";
import { NextApiRequest, NextApiResponse } from "next/types";
import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";
import stringify from "fast-json-stable-stringify";
import { StorageError, StorageApiError } from "@supabase/storage-js";
import { identitiesCanModifySpace } from "../../[spaceId]";

export type UnsignedDeleteSpaceTabRequest = {
  publicKey: string;
  timestamp: string;
  spaceId: string;
  tabName: string;
  network?: string;
};

export type DeleteSpaceTabRequest = UnsignedDeleteSpaceTabRequest & Signable;

function isDeleteSpaceTabRequest(
  maybe: unknown,
): maybe is DeleteSpaceTabRequest {
  return (
    isSignable(maybe) &&
    typeof maybe["spaceId"] === "string" &&
    typeof maybe["publicKey"] === "string" &&
    typeof maybe["timestamp"] === "string" &&
    typeof maybe["signature"] === "string" &&
    typeof maybe["tabName"] === "string"
  );
}

export type UpdateSpaceTabRequest = SignedFile & {
  isEncrypted: false;
  fileName: string;
};

export async function identityCanModifySpace(
  identity: string,
  spaceId: string,
  network?: string,
) {
  // console.log("identityCanModifySpace", identity, spaceId, network);
  const data = await identitiesCanModifySpace(spaceId, network);
  return findIndex(data, (i) => i === identity) !== -1;
}

async function updateSpace(
  incReq: NextApiRequest,
  res: NextApiResponse<NounspaceResponse>,
): Promise<void> {
  const req = incReq.body;
  const spaceId = incReq.query.spaceId as string;
  const tabName = incReq.query.tabId as string;
  const network = req.network ? (req.network as string) : undefined;

  const fileData = { ...req };
  if (fileData.network) fileData.network = undefined;

  if (!isSignedFile(fileData)) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Config must contain publicKey, fileData, fileType, isEncrypted, and timestamp",
      },
    });
    return;
  }
  if (!validateSignable(fileData)) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Invalid signature",
      },
    });
    return;
  }
  if (!(await identityCanModifySpace(req.publicKey, spaceId, network))) {
    res.status(400).json({
      result: "error",
      error: {
        message: `Identity ${req.publicKey} cannot update space ${spaceId}`,
      },
    });
    return;
  }
  // Handle rename (move file) - but only if file exists
  if (req.fileName !== tabName) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.storage
      .from("spaces")
      .move(`${spaceId}/tabs/${tabName}`, `${spaceId}/tabs/${req.fileName}`);
    
    // Handle "file not found" gracefully (new tab that was renamed before commit)
    if (error) {
      // Check if it's a StorageApiError (has HTTP status) or base StorageError
      const isApiError = error instanceof StorageApiError;
      const status = isApiError ? error.status : undefined;
      
      // Check for 404 status (file not found) - StorageApiError.status is a number
      if (status === 404) {
        // Expected case: File doesn't exist - this is fine for new tabs renamed before commit
        // We'll create it at the new location via upload with upsert
        console.log(`[Expected] File ${tabName} not found, creating at ${req.fileName} instead`);
      } else {
        // Unexpected error - fail and log for monitoring
        console.error(`[Unexpected] Move failed for ${tabName} → ${req.fileName}:`, {
          status,
          message: error.message,
          errorType: isApiError ? 'StorageApiError' : 'StorageError',
          error: error,
        });
        res.status(500).json({
          result: "error",
          error: {
            message: error.message || "Failed to move file",
          },
        });
        return;
      }
    }
  }
  
  // Update/create file (uses upload with upsert to handle both registration and updates)
  const supabase = createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage
    .from("spaces")
    .upload(
      `${spaceId}/tabs/${req.fileName}`,
      new Blob([stringify(fileData)], { type: "application/json" }),
      { upsert: true }, // Creates if doesn't exist, updates if it does
    );
  if (uploadError) {
    // Check if it's a StorageApiError (has HTTP status) or base StorageError
    const isApiError = uploadError instanceof StorageApiError;
    const status = isApiError ? uploadError.status : undefined;
    
    console.error(`[Unexpected] Upload failed for ${req.fileName}:`, {
      status,
      message: uploadError.message,
      errorType: isApiError ? 'StorageApiError' : 'StorageError',
      error: uploadError,
    });
    res.status(500).json({
      result: "error",
      error: {
        message: uploadError.message || "Failed to upload file",
      },
    });
    return;
  }
  res.status(200).json({
    result: "success",
    value: true,
  });
}

async function deleteSpace(req: NextApiRequest, res: NextApiResponse) {
  const deleteReq = req.body;
  // console.log("deleteReq", deleteReq);
  const spaceId = req.query.spaceId as string;
  const tabId = req.query.tabId as string;
  if (!isDeleteSpaceTabRequest(deleteReq)) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Must provide newName, identityPublicKey, timestamp, and signature to update a Space Name",
      },
    });
    return;
  }
  if (
    !(await identityCanModifySpace(
      deleteReq.publicKey,
      spaceId,
      deleteReq.network,
    ))
  ) {
    res.status(400).json({
      result: "error",
      error: {
        message: `Identity ${deleteReq.publicKey} cannot update space ${spaceId}`,
      },
    });
    return;
  }
  if (!validateSignable(deleteReq)) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Invalid signature on request",
      },
    });
    return;
  }
  if (deleteReq.spaceId !== spaceId) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Space ID in request does not match target space's ID",
      },
    });
    return;
  }
  if (deleteReq.tabName !== tabId) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Space ID in request does not match target space's ID",
      },
    });
    return;
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.storage
    .from("spaces")
    .remove([`${deleteReq.spaceId}/tabs/${deleteReq.tabName}`]);
  if (!isNull(error)) {
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
  });
}

export default requestHandler({
  post: updateSpace,
  delete: deleteSpace,
});
