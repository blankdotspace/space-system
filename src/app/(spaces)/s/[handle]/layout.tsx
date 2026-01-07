import React from "react";
import { getUserMetadata } from "./utils";
import type { Metadata } from "next/types";
import { getUserMetadataStructure } from "@/common/lib/utils/userMetadata";
import { getDefaultFrame } from "@/constants/metadata";
import { loadSystemConfig, type SystemConfig } from "@/config";
import { resolveBaseUrl } from "@/common/lib/utils/resolveBaseUrl";
import { resolveAssetUrl } from "@/common/lib/utils/resolveAssetUrl";

// Default metadata (used as fallback)
const buildDefaultMetadata = async (systemConfig: SystemConfig, baseUrl: string) => {
  const defaultFrame = await getDefaultFrame({ systemConfig, baseUrl });
  return {
    other: {
      "fc:frame": JSON.stringify(defaultFrame),
    },
  };
};

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ handle: string; tabName?: string }> 
}): Promise<Metadata> {
  const systemConfig = await loadSystemConfig();
  const baseUrl = await resolveBaseUrl({ systemConfig });
  const brandName = systemConfig.brand.displayName;
  const splashImageUrl =
    resolveAssetUrl(systemConfig.assets.logos.splash, baseUrl) ??
    systemConfig.assets.logos.splash;
  const { handle, tabName: tabNameParam } = await params;

  if (!handle) {
    return buildDefaultMetadata(systemConfig, baseUrl); // Return default metadata if no handle
  }

  const normalizedHandle = handle.toLowerCase();
  const userMetadata = await getUserMetadata(handle);
  if (!userMetadata) {
    const defaultFrame = await getDefaultFrame({ systemConfig, baseUrl });
    const baseMetadata = getUserMetadataStructure(
      { username: normalizedHandle },
      { baseUrl, brandName },
    );
    return {
      ...baseMetadata,
      other: { "fc:frame": JSON.stringify(defaultFrame) },
    };
  }

  // Process tabName parameter if it exists
  const tabName = tabNameParam ? decodeURIComponent(tabNameParam) : undefined;
  
  // Create Frame metadata for Farcaster with the correct path
  const canonicalHandle = userMetadata?.username || normalizedHandle;
  const frameUrl = tabName
    ? `${baseUrl}/s/${canonicalHandle}/${encodeURIComponent(tabName)}`
    : `${baseUrl}/s/${canonicalHandle}`;
    
  const displayName =
    userMetadata?.displayName || userMetadata?.username || handle;

  // Build Open Graph image URL matching the dynamic metadata
  const ogParams = new URLSearchParams({
    username: canonicalHandle,
    displayName: displayName || "",
    pfpUrl: userMetadata?.pfpUrl || "",
    bio: userMetadata?.bio || "",
  });
  const ogImageUrl = `${baseUrl}/api/metadata/spaces?${ogParams.toString()}`;

  const spaceFrame = {
    version: "next",
    imageUrl: ogImageUrl,
    button: {
      title: `Visit ${displayName}'s Space`,
      action: {
        type: "launch_frame",
        url: frameUrl,
        name: `${displayName}'s ${brandName}`,
        splashImageUrl,
        splashBackgroundColor: "#FFFFFF",
      }
    }
  };

  const baseMetadata = getUserMetadataStructure(userMetadata, { baseUrl, brandName });
  
  // Type-safe way to add frame metadata
  const metadataWithFrame = {
    ...baseMetadata,
    title: `${displayName}'s Space | ${brandName}`,
    description: userMetadata?.bio || 
      `${displayName}'s customized space on ${brandName}, the customizable web3 social app built on Farcaster.`,
  };
  
  // Add the fc:frame metadata
  if (!metadataWithFrame.other) {
    metadataWithFrame.other = {};
  }
  
  metadataWithFrame.other['fc:frame'] = JSON.stringify(spaceFrame);
  
  return metadataWithFrame;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
