import requestHandler, {
  BlankspaceResponse,
} from "@/common/data/api/requestHandler";
import {
  isSignable,
  Signable,
  validateSignable,
} from "@/common/lib/signedFiles";
import { NextApiRequest, NextApiResponse } from "next/types";
import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import { homebaseTabsPath } from "@/constants/supabase";
import { isArray, isNil, isUndefined, map } from "lodash";
import { StorageError } from "@supabase/storage-js";
import stringify from "fast-json-stable-stringify";

const homeBaseTabRequestTypes = ["create", "rename", "delete"] as const;
export type HomeBaseTabRequestType = (typeof homeBaseTabRequestTypes)[number];

type ListHomebaseTabsResult = string[];

export type ManageHomebaseTabsResponse =
  BlankspaceResponse<ListHomebaseTabsResult>;

export type UnsignedManageHomebaseTabsRequest = {
  publicKey: string;
  type: HomeBaseTabRequestType;
  tabName: string;
  newName?: string;
};
export type ManageHomebaseTabsRequest = Signable &
  UnsignedManageHomebaseTabsRequest;

function isUpdateHomebaseRequest(
  maybe: unknown,
): maybe is ManageHomebaseTabsRequest {
  return (
    isSignable(maybe) &&
    typeof maybe["publicKey"] === "string" &&
    typeof maybe["type"] === "string" &&
    homeBaseTabRequestTypes.includes(maybe.type as HomeBaseTabRequestType) &&
    typeof maybe["tabName"] === "string"
  );
}

async function manageHomebaseTabs(
  req: NextApiRequest,
  res: NextApiResponse<ManageHomebaseTabsResponse>,
) {
  const updateReq: ManageHomebaseTabsRequest = req.body.request;
  if (!isUpdateHomebaseRequest(updateReq)) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Update body must include publicKey, type, tabName, and signature",
      },
    });
    return;
  }
  if (updateReq.type === "rename" && isUndefined(updateReq.newName)) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Update body must include newName if type is rename",
      },
    });
    return;
  }
  if (!validateSignable(updateReq)) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Invalid signature",
      },
    });
    return;
  }
  let errorResult: StorageError | null;

  if (updateReq.type === "create") {
    const { error } = await createSupabaseServerClient()
      .storage
      .from("private")
      .upload(
        `${homebaseTabsPath(updateReq.publicKey, updateReq.tabName)}`,
        new Blob([stringify(req.body.file)], { type: "application/json" }),
      );
    errorResult = error;
  } else if (updateReq.type === "delete") {
    const { error } = await createSupabaseServerClient()
      .storage
      .from("private")
      .remove([`${homebaseTabsPath(updateReq.publicKey, updateReq.tabName)}`]);
    errorResult = error;
  } else {
    const { error } = await createSupabaseServerClient()
      .storage
      .from("private")
      .move(
        `${homebaseTabsPath(updateReq.publicKey, updateReq.tabName)}`,
        `${homebaseTabsPath(updateReq.publicKey, updateReq.newName!)}`,
      );
    errorResult = error;
  }

  if (errorResult) {
    res.status(500).json({
      result: "error",
      error: {
        message: errorResult.message,
      },
    });
    return;
  }
  res.status(200).json({
    result: "success",
    value: await listTabsForIdentity(updateReq.publicKey),
  });
}

export async function listTabsForIdentity(
  identityPublicKey: string,
): Promise<string[]> {
  const { data: listResults, error: listErrors } = await createSupabaseServerClient()
    .storage
    .from("private")
    .list(`${homebaseTabsPath(identityPublicKey, "")}`);
  if (listErrors) {
    return [];
  }
  if (isNil(listResults) || listResults.length === 0) {
    return [];
  }
  return map(listResults, (f) => f.name);
}

async function handleListTabsForIdentity(
  req: NextApiRequest,
  res: NextApiResponse<ManageHomebaseTabsResponse>,
) {
  const publicKey = req.query.identityPublicKey;
  if (!isUndefined(publicKey) && !isArray(publicKey)) {
    res.status(200).json({
      result: "success",
      value: await listTabsForIdentity(publicKey),
    });
  } else {
    res.status(400).json({
      result: "error",
      error: {
        message: "Must provide identityPublicKey as a single string",
      },
    });
  }
}

export default requestHandler({
  post: manageHomebaseTabs,
  get: handleListTabsForIdentity,
});
