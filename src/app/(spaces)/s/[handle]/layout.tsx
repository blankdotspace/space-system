import React from "react";
import { getUserMetadata } from "./utils";
import type { Metadata } from "next/types";
import { getUserMetadataStructure } from "@/common/lib/utils/userMetadata";
import { loadSystemConfig, type SystemConfig } from "@/config";
import { resolveBaseUrl } from "@/common/lib/utils/resolveBaseUrl";
import { buildDefaultFrameMetadata, getDefaultFrameAssets } from "@/common/lib/utils/defaultMetadata";
import { buildMiniAppEmbed } from "@/common/lib/utils/miniAppEmbed";
import { resolveMiniAppDomain } from "@/common/lib/utils/miniAppDomain";

// Default metadata (used as fallback)
async function buildDefaultMetadata(systemConfig: SystemConfig, baseUrl: string): Promise<Metadata> {
  const { defaultFrame, defaultImage, splashImageUrl } = await getDefaultFrameAssets(systemConfig, baseUrl);
  const brandName = systemConfig.brand.displayName;
  const miniAppDomain = resolveMiniAppDomain(baseUrl);
  const defaultMiniApp = buildMiniAppEmbed({
    imageUrl: defaultImage,
    buttonTitle: `Open ${brandName}`,
    actionUrl: baseUrl,
    actionName: brandName,
    splashImageUrl,
  });
  return {
    other: {
      "fc:frame": JSON.stringify(defaultFrame),
      "fc:miniapp": JSON.stringify(defaultMiniApp),
      "fc:miniapp:domain": miniAppDomain,
    },
  };
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ handle: string; tabName?: string }> 
}): Promise<Metadata> {
  const systemConfig = await loadSystemConfig();
  const baseUrl = await resolveBaseUrl({ systemConfig });
  const brandName = systemConfig.brand.displayName;
  const miniAppDomain = resolveMiniAppDomain(baseUrl);
  const twitterHandle = systemConfig.community.social?.x;
  const { splashImageUrl, defaultFrame, defaultImage } = await getDefaultFrameAssets(systemConfig, baseUrl);
  const { handle, tabName: tabNameParam } = await params;

  if (!handle) {
    return buildDefaultMetadata(systemConfig, baseUrl); // Return default metadata if no handle
  }

  const normalizedHandle = handle.toLowerCase();
  const userMetadata = await getUserMetadata(handle);
  if (!userMetadata) {
    const baseMetadata = getUserMetadataStructure(
      { username: normalizedHandle },
      { baseUrl, brandName, twitterHandle },
    );
    const ogImageUrl = baseMetadata.openGraph?.images?.[0]?.url ?? "";
    const fallbackImageUrl = ogImageUrl || defaultImage;
    return {
      ...baseMetadata,
      other: {
        "fc:frame": JSON.stringify(defaultFrame),
        "fc:miniapp": JSON.stringify(
          buildMiniAppEmbed({
            imageUrl: fallbackImageUrl,
            buttonTitle: `Open ${brandName}`,
            actionUrl: baseUrl,
            actionName: brandName,
            splashImageUrl,
          }),
        ),
        "fc:miniapp:domain": miniAppDomain,
      },
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

  const spaceMiniApp = buildMiniAppEmbed({
    imageUrl: ogImageUrl,
    buttonTitle: `Visit ${displayName}'s Space`,
    actionUrl: frameUrl,
    actionName: `${displayName}'s ${brandName}`,
    splashImageUrl,
  });

  const baseMetadata = getUserMetadataStructure(
    userMetadata,
    { baseUrl, brandName, twitterHandle },
  );
  
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
  
  metadataWithFrame.other["fc:frame"] = JSON.stringify(spaceFrame);
  metadataWithFrame.other["fc:miniapp"] = JSON.stringify(spaceMiniApp);
  metadataWithFrame.other["fc:miniapp:domain"] = miniAppDomain;
  
  return metadataWithFrame;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
