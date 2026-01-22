import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";
import neynar from "@/common/data/api/neynar";
import { unstable_noStore as noStore } from "next/cache";
import {
  ChannelSpacePageData,
  SPACE_TYPES,
} from "@/common/types/spaceData";
import { createInitialChannelSpaceConfig } from "@/config";
import { Channel, ChannelType } from "@neynar/nodejs-sdk/build/api";
import { loadSpaceDefaultTab } from "@/common/utils/tabUtils";

export const getChannelMetadata = async (
  channelId: string,
): Promise<Channel | null> => {
  try {
    const { channel } = await neynar.lookupChannel({
      id: channelId,
      type: ChannelType.Id,
    });
    return channel;
  } catch (error) {
    console.error("Error fetching channel metadata:", error);
    return null;
  }
};

export const createChannelSpaceData = async (
  spaceId: string | undefined,
  channelId: string,
  channelDisplayName: string | undefined,
  channelDescription: string | undefined,
  channelImageUrl: string | undefined,
  channelFollowerCount: number | undefined,
  moderatorFids: number[],
  tabName: string,
  identityPublicKey?: string,
): Promise<Omit<ChannelSpacePageData, "isEditable" | "spacePageUrl">> => {
  const config = {
    ...createInitialChannelSpaceConfig(channelId),
    timestamp: new Date().toISOString(),
  };

  // Load dynamic default tab from storage, fallback to "Channel"
  const defaultTab = await loadSpaceDefaultTab(spaceId, "Channel");

  return {
    spaceId,
    spaceName: channelId,
    spaceType: SPACE_TYPES.CHANNEL,
    updatedAt: new Date().toISOString(),
    defaultTab,
    currentTab: tabName,
    config,
    spaceOwnerFid: moderatorFids[0],
    channelId,
    channelDisplayName,
    channelDescription,
    channelImageUrl,
    channelFollowerCount,
    moderatorFids,
    identityPublicKey,
  };
};

export const loadChannelSpaceRegistration = async (
  channelId: string,
): Promise<{
  spaceId?: string;
  identityPublicKey?: string;
  fid?: number | null;
} | null> => {
  noStore();
  try {
    const { data, error } = await createSupabaseServerClient()
      .from("spaceRegistrations")
      .select("spaceId, identityPublicKey, fid")
      .eq("channelId", channelId)
      .order("timestamp", { ascending: true })
      .limit(1);

    if (error) {
      console.error("Error fetching channel space registration:", error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Exception in loadChannelSpaceRegistration:", error);
    return null;
  }
};

export const loadChannelSpaceData = async (
  channelId: string,
  tabNameParam?: string,
): Promise<Omit<ChannelSpacePageData, "isEditable" | "spacePageUrl"> | null> => {
  noStore();

  const channelMetadata = await getChannelMetadata(channelId);

  if (!channelMetadata) {
    return null;
  }

  const registration = await loadChannelSpaceRegistration(channelId);
  const spaceId = registration?.spaceId;
  const identityPublicKey = registration?.identityPublicKey;

  const tabName = tabNameParam || "Channel";

  return await createChannelSpaceData(
    spaceId,
    channelId,
    channelMetadata.name,
    channelMetadata.description,
    channelMetadata.image_url,
    channelMetadata.follower_count,
    channelMetadata.moderator_fids || [],
    tabName,
    identityPublicKey,
  );
};
