import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";
import requestHandler, {
  NounspaceResponse,
} from "@/common/data/api/requestHandler";
import {
  isSignable,
  Signable,
  validateSignable,
} from "@/common/lib/signedFiles";
import { isArray, isString } from "lodash";
import { NextApiRequest, NextApiResponse } from "next/types";
import { NavigationConfig } from "@/config/systemConfig";

export type UnsignedUpdateNavigationConfigRequest = {
  communityId: string;
  navigationConfig: NavigationConfig;
  publicKey: string;
  timestamp: string;
};

export type UpdateNavigationConfigRequest = UnsignedUpdateNavigationConfigRequest & Signable;

export type UpdateNavigationConfigResponse = NounspaceResponse<boolean>;

function isUpdateNavigationConfigRequest(
  thing: unknown,
): thing is UpdateNavigationConfigRequest {
  return (
    isSignable(thing) &&
    typeof thing["communityId"] === "string" &&
    typeof thing["publicKey"] === "string" &&
    typeof thing["timestamp"] === "string" &&
    thing["navigationConfig"] !== undefined &&
    typeof thing["navigationConfig"] === "object" &&
    (thing["navigationConfig"]["items"] === undefined ||
      isArray(thing["navigationConfig"]["items"]))
  );
}

async function updateNavigationConfig(
  req: NextApiRequest,
  res: NextApiResponse<UpdateNavigationConfigResponse>,
) {
  const updateRequest = req.body;

  if (!isUpdateNavigationConfigRequest(updateRequest)) {
    res.status(400).json({
      result: "error",
      error: {
        message:
          "Update navigation config requires: communityId, navigationConfig, publicKey, timestamp, and signature",
      },
    });
    return;
  }

  if (!validateSignable(updateRequest)) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Invalid signature",
      },
    });
    return;
  }

  const supabase = createSupabaseServerClient();

  // Check if the identity is an admin for this community
  const { data: config, error: fetchError } = await supabase
    .from("community_configs")
    .select("admin_identity_public_keys")
    .eq("community_id", updateRequest.communityId)
    .eq("is_published", true)
    .single();

  if (fetchError || !config) {
    res.status(404).json({
      result: "error",
      error: {
        message: `Community config not found for communityId: ${updateRequest.communityId}`,
      },
    });
    return;
  }

  const adminKeys = config.admin_identity_public_keys || [];
  if (!isArray(adminKeys) || !adminKeys.includes(updateRequest.publicKey)) {
    res.status(403).json({
      result: "error",
      error: {
        message: `Identity ${updateRequest.publicKey} is not an admin for community ${updateRequest.communityId}`,
      },
    });
    return;
  }

  // Update the navigation_config column
  const { error: updateError } = await supabase
    .from("community_configs")
    .update({
      navigation_config: updateRequest.navigationConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("community_id", updateRequest.communityId)
    .eq("is_published", true);

  if (updateError) {
    console.error("Error updating navigation config:", updateError);
    res.status(500).json({
      result: "error",
      error: {
        message: updateError.message,
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
  put: updateNavigationConfig,
});

