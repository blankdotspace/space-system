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
import { SPACE_TYPES } from "@/common/types/spaceData";

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

  // Check if the identity is an admin for this community and get current config
  const { data: config, error: fetchError } = await supabase
    .from("community_configs")
    .select("admin_identity_public_keys, navigation_config")
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

  // Clean up spaces for deleted navigation items
  const oldNavConfig = config.navigation_config as NavigationConfig | null;
  const oldItems = oldNavConfig?.items || [];
  const newItems = updateRequest.navigationConfig.items || [];
  
  // Find deleted items by comparing old vs new (using IDs, so renames don't affect this)
  const newItemIds = new Set(newItems.map((item: any) => item.id));
  const deletedItems = oldItems.filter((item: any) => !newItemIds.has(item.id));
  
  // Delete spaces for deleted nav items
  for (const item of deletedItems) {
    if (item.spaceId) {
      try {
        // List all tab files in the space directory
        // This lists actual files from storage, so tab renames don't matter - we delete whatever exists
        const { data: tabFiles } = await supabase.storage
          .from("spaces")
          .list(`${item.spaceId}/tabs`);
        
        // Build list of all file paths to delete
        const pathsToDelete: string[] = [];
        
        // Add tabOrder
        pathsToDelete.push(`${item.spaceId}/tabOrder`);
        
        // Add all tab files (using actual file names from storage, handles renames correctly)
        if (tabFiles) {
          for (const tabFile of tabFiles) {
            pathsToDelete.push(`${item.spaceId}/tabs/${tabFile.name}`);
          }
        }
        
        // Delete all storage files
        if (pathsToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from("spaces")
            .remove(pathsToDelete);
          
          if (deleteError) {
            console.warn(`Failed to delete storage files for space ${item.spaceId}:`, deleteError);
          }
        }
        
        // Delete space registration from database
        const { error: registrationError } = await supabase
          .from("spaceRegistrations")
          .delete()
          .eq("spaceId", item.spaceId)
          .eq("spaceType", SPACE_TYPES.NAV_PAGE);
        
        if (registrationError) {
          console.warn(`Failed to delete space registration for ${item.spaceId}:`, registrationError);
        }
      } catch (spaceDeleteError: any) {
        // Log but don't fail the entire update if space deletion fails
        console.warn(`Failed to delete space ${item.spaceId} for deleted nav item:`, spaceDeleteError);
      }
    }
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

