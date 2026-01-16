import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";
import requestHandler, {
  NounspaceResponse,
} from "@/common/data/api/requestHandler";
import {
  isSignable,
  Signable,
  validateSignable,
} from "@/common/lib/signedFiles";
import { isArray } from "lodash";
import { NextApiRequest, NextApiResponse } from "next/types";
import { NavigationConfig, NavigationItem } from "@/config/systemConfig";
import { SPACE_TYPES } from "@/common/types/spaceData";
import { Json } from "@/supabase/database";
import {
  validateNavItemLabel,
  validateNavItemHref,
} from "@/common/utils/navUtils";
import moment from "moment";

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
  if (
    !isSignable(thing) ||
    typeof thing["communityId"] !== "string" ||
    typeof thing["publicKey"] !== "string" ||
    typeof thing["timestamp"] !== "string" ||
    thing["navigationConfig"] === undefined ||
    typeof thing["navigationConfig"] !== "object"
  ) {
    return false;
  }

  const navigationConfig = thing["navigationConfig"];
  
  // If items is present, validate it's an array and each item has required fields
  if (navigationConfig["items"] !== undefined) {
    if (!isArray(navigationConfig["items"])) {
      return false;
    }
    
    // Validate each item's shape
    for (const item of navigationConfig["items"]) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item["id"] !== "string" ||
        typeof item["label"] !== "string" ||
        typeof item["href"] !== "string"
      ) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Validates that a timestamp is fresh to prevent replay attacks.
 * 
 * Checks that the timestamp:
 * - Is not more than 15 minutes old (prevents replay attacks)
 * - Is not more than 5 minutes in the future (handles clock skew)
 * 
 * @param timestamp - ISO 8601 timestamp string
 * @returns true if timestamp is valid and fresh, false otherwise
 */
function isTimestampFresh(timestamp: string): boolean {
  const requestTime = moment(timestamp);
  const now = moment();
  
  // Check if timestamp is valid
  if (!requestTime.isValid()) {
    return false;
  }
  
  // Check if timestamp is not more than 15 minutes old
  const fifteenMinutesAgo = now.clone().subtract(15, 'minutes');
  if (requestTime.isBefore(fifteenMinutesAgo)) {
    return false;
  }
  
  // Check if timestamp is not more than 5 minutes in the future (clock skew tolerance)
  const fiveMinutesFromNow = now.clone().add(5, 'minutes');
  if (requestTime.isAfter(fiveMinutesFromNow)) {
    return false;
  }
  
  return true;
}

async function updateNavigationConfig(
  req: NextApiRequest,
  res: NextApiResponse<UpdateNavigationConfigResponse>,
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[API] Received navigation config update request');
  }
  const updateRequest = req.body;

  if (!isUpdateNavigationConfigRequest(updateRequest)) {
    console.error("Invalid request structure:", {
      hasBody: !!updateRequest,
      hasCommunityId: !!updateRequest?.communityId,
      hasNavigationConfig: !!updateRequest?.navigationConfig,
      hasItems: !!updateRequest?.navigationConfig?.items,
      itemsCount: Array.isArray(updateRequest?.navigationConfig?.items) ? updateRequest.navigationConfig.items.length : 'not array',
    });
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
    console.error('[API] Invalid signature for navigation config update');
    res.status(400).json({
      result: "error",
      error: {
        message: "Invalid signature",
      },
    });
    return;
  }
  
  // Validate timestamp freshness to prevent replay attacks
  if (!isTimestampFresh(updateRequest.timestamp)) {
    console.error('[API] Timestamp validation failed:', {
      timestamp: updateRequest.timestamp,
      isOld: moment(updateRequest.timestamp).isBefore(moment().subtract(15, 'minutes')),
      isFuture: moment(updateRequest.timestamp).isAfter(moment().add(5, 'minutes')),
    });
    res.status(400).json({
      result: "error",
      error: {
        message: "Request timestamp is invalid or too old. Please try again.",
      },
    });
    return;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[API] Received navigation items:', {
      communityId: updateRequest.communityId,
      itemCount: updateRequest.navigationConfig.items?.length || 0,
      items: updateRequest.navigationConfig.items?.map((item: NavigationItem) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        spaceId: item.spaceId
      }))
    });
  }

  const supabase = createSupabaseServerClient();

  // Check if the identity is an admin for this community and get current config
  if (process.env.NODE_ENV === 'development') {
    console.log('[API] Fetching community config for:', updateRequest.communityId);
  }
  const { data: config, error: fetchError } = await supabase
    .from("community_configs")
    .select("admin_identity_public_keys, navigation_config")
    .eq("community_id", updateRequest.communityId)
    .eq("is_published", true)
    .single();

  if (fetchError || !config) {
    console.error('[API] Community config not found:', {
      communityId: updateRequest.communityId,
      error: fetchError?.message
    });
    res.status(404).json({
      result: "error",
      error: {
        message: `Community config not found for communityId: ${updateRequest.communityId}`,
      },
    });
    return;
  }
  
  const oldNavConfig = (config.navigation_config as unknown as NavigationConfig) || {};
  if (process.env.NODE_ENV === 'development') {
    console.log('[API] Community config found:', {
      communityId: updateRequest.communityId,
      adminKeyCount: config.admin_identity_public_keys?.length || 0,
      currentItemCount: oldNavConfig?.items?.length || 0
    });
  }
  
  // oldNavConfig is now available for use below

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

  // Validate all navigation items before updating
  const itemsToValidate = updateRequest.navigationConfig.items || [];
  
  // Validate all labels
  for (const item of itemsToValidate) {
    const labelError = validateNavItemLabel(item.label);
    if (labelError) {
      res.status(400).json({
        result: "error",
        error: {
          message: `Invalid label for item "${item.label}": ${labelError}`,
        },
      });
      return;
    }
    
    const hrefError = validateNavItemHref(item.href);
    if (hrefError) {
      res.status(400).json({
        result: "error",
        error: {
          message: `Invalid href for item "${item.label}": ${hrefError}`,
        },
      });
      return;
    }
  }
  
  // Check for duplicate labels (case-insensitive)
  const labels = itemsToValidate.map((item: NavigationItem) => item.label.toLowerCase().trim());
  if (new Set(labels).size !== labels.length) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Duplicate navigation labels found. Labels must be unique (case-insensitive).",
      },
    });
    return;
  }
  
  // Check for duplicate hrefs (case-sensitive)
  const hrefs = itemsToValidate.map((item: NavigationItem) => item.href.trim());
  if (new Set(hrefs).size !== hrefs.length) {
    res.status(400).json({
      result: "error",
      error: {
        message: "Duplicate navigation hrefs found. Each navigation item must have a unique href.",
      },
    });
    return;
  }

  // Calculate deleted items (before update, for later cleanup)
  const oldItems = oldNavConfig?.items || [];
  const newItems = updateRequest.navigationConfig.items || [];
  const newItemIds = new Set(newItems.map((item: any) => item.id));
  const deletedItems = oldItems.filter((item: any) => !newItemIds.has(item.id));

  // Merge new items with existing config to preserve other fields (logoTooltip, showMusicPlayer, showSocials)
  // Start with existing config to preserve optional fields, then override with new config (which includes items)
  const mergedNavigationConfig = {
    ...oldNavConfig,
    ...updateRequest.navigationConfig, // This includes items and any other fields if explicitly provided
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[API] Merged navigation config:', {
      oldItemCount: oldNavConfig?.items?.length || 0,
      newItemCount: updateRequest.navigationConfig.items?.length || 0,
      mergedItemCount: mergedNavigationConfig.items?.length || 0,
      preservedFields: {
        logoTooltip: mergedNavigationConfig.logoTooltip,
        showMusicPlayer: mergedNavigationConfig.showMusicPlayer,
        showSocials: mergedNavigationConfig.showSocials
      }
    });
  }

  // Convert to Json type by serializing/deserializing to ensure JSON compatibility
  // This provides runtime safety while working around TypeScript's Json type limitations
  const navigationConfigJson: Json = JSON.parse(JSON.stringify(mergedNavigationConfig));

  // Update the navigation_config column with merged config FIRST
  // Use .select() to verify that a row was actually updated
  // This ensures we only perform cleanup operations after confirming the update succeeded
  if (process.env.NODE_ENV === 'development') {
    console.log('[API] Updating navigation config in database');
  }
  const { data: updatedRows, error: updateError } = await supabase
    .from("community_configs")
    .update({
      navigation_config: navigationConfigJson,
      updated_at: new Date().toISOString(),
    })
    .eq("community_id", updateRequest.communityId)
    .eq("is_published", true)
    .select();

  // Check for database errors
  if (updateError) {
    console.error('[API] Error updating navigation config:', {
      error: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint
    });
    res.status(500).json({
      result: "error",
      error: {
        message: `Database error: ${updateError.message}`,
      },
    });
    return;
  }

  // Verify that at least one row was actually updated
  // This can happen if:
  // - The community config doesn't exist
  // - The community config exists but is_published is false (unpublished)
  // - Race condition: row was deleted/unpublished between our fetch and update
  if (!updatedRows || updatedRows.length === 0) {
    console.error('[API] Navigation config update failed: No rows updated:', {
      communityId: updateRequest.communityId,
      updatedRowsCount: updatedRows?.length || 0
    });
    res.status(409).json({
      result: "error",
      error: {
        message: `No navigation config found to update for community "${updateRequest.communityId}". ` +
          `The config may not exist or may not be published.`,
      },
    });
    return;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[API] Navigation config updated successfully:', {
      communityId: updateRequest.communityId,
      updatedRowsCount: updatedRows.length,
      finalItemCount: mergedNavigationConfig.items?.length || 0
    });
  }

  // Only perform cleanup operations AFTER confirming the database update succeeded
  // This prevents inconsistent state if the update fails (we don't delete storage/registrations
  // if the config update didn't commit)
  if (deletedItems.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] Cleaning up spaces for deleted navigation items:', {
        deletedItemCount: deletedItems.length,
        deletedSpaceIds: deletedItems.map((item: any) => item.spaceId).filter(Boolean)
      });
    }

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
          // The config update already succeeded, so this is best-effort cleanup
          console.warn(`Failed to delete space ${item.spaceId} for deleted nav item:`, spaceDeleteError);
        }
      }
    }
  }

  res.status(200).json({
    result: "success",
    value: true,
  });
}

export default requestHandler({
  put: updateNavigationConfig,
});

