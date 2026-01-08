import React from "react";
import type { Metadata } from "next/types";

import { CastParamType } from "@neynar/nodejs-sdk/build/api";
import neynar from "@/common/data/api/neynar";
import { getCastMetadataStructure } from "@/common/lib/utils/castMetadata";
import { getDefaultFrame } from "@/constants/metadata";
import { loadSystemConfig, type SystemConfig } from "@/config";
import { resolveBaseUrl } from "@/common/lib/utils/resolveBaseUrl";
import { resolveAssetUrl } from "@/common/lib/utils/resolveAssetUrl";
import type { Embed } from "@neynar/nodejs-sdk/build/api";

async function buildDefaultMetadata(systemConfig: SystemConfig, baseUrl: string): Promise<Metadata> {
  const defaultFrame = await getDefaultFrame({ systemConfig, baseUrl });
  return {
    other: {
      "fc:frame": JSON.stringify(defaultFrame),
    },
  };
}

function resolveCastEmbedImageUrl(embeds?: Embed[]): string | undefined {
  if (!embeds || embeds.length === 0) {
    return undefined;
  }

  for (const embed of embeds) {
    if ("url" in embed) {
      const ogImageUrl = embed.metadata?.html?.ogImage?.[0]?.url;
      if (ogImageUrl) {
        return ogImageUrl;
      }

      if (embed.metadata?.content_type?.startsWith("image/")) {
        return embed.url;
      }
    }
  }

  return undefined;
}

export async function generateMetadata({ params }): Promise<Metadata> {
  const systemConfig = await loadSystemConfig();
  const baseUrl = await resolveBaseUrl({ systemConfig });
  const brandName = systemConfig.brand.displayName;
  const twitterHandle = systemConfig.community.social?.x;
  const splashImageUrl =
    resolveAssetUrl(systemConfig.assets.logos.splash, baseUrl) ??
    systemConfig.assets.logos.splash;
  const { slug } = await params;
  const segments: string[] = Array.isArray(slug) ? slug : [];
  let castHash: string | undefined;
  let username: string | undefined;

  if (segments.length >= 3 && segments[0] === "c") {
    username = decodeURIComponent(segments[1]);
    castHash = decodeURIComponent(segments[2]);
  } else if (segments.length >= 2) {
    castHash = decodeURIComponent(segments[1]);
  }

  if (!castHash) {
    return buildDefaultMetadata(systemConfig, baseUrl);
  }

  try {
    const { cast } = await neynar.lookupCastByHashOrWarpcastUrl({
      identifier: castHash,
      type: CastParamType.Hash,
    });
    const embedImageUrl = resolveCastEmbedImageUrl(cast.embeds);

    const baseMetadata = getCastMetadataStructure(
      {
        hash: cast.hash,
        username: cast.author.username,
        displayName: cast.author.display_name,
        pfpUrl: cast.author.pfp_url,
        text: cast.text,
        embedImageUrl,
      },
      { baseUrl, brandName, twitterHandle },
    );

    const castUrl = `${baseUrl}/homebase/c/${cast.author.username}/${cast.hash}`;
    const ogImageUrl = baseMetadata.openGraph?.images?.[0]?.url ?? "";

    const castFrame = {
      version: "next",
      imageUrl: ogImageUrl,
      button: {
        title: `View @${cast.author.username}'s Cast`,
        action: {
          type: "launch_frame",
          url: castUrl,
          name: `Cast by @${cast.author.username} on ${brandName}`,
          splashImageUrl,
          splashBackgroundColor: "#FFFFFF",
        },
      },
    };

    return {
      ...baseMetadata,
      other: { "fc:frame": JSON.stringify(castFrame) },
    };
  } catch (error) {
    console.error("Error generating cast metadata:", error);
    const baseMetadata = getCastMetadataStructure(
      { hash: castHash, username },
      { baseUrl, brandName, twitterHandle },
    );
    const castUrl = username && castHash ? `${baseUrl}/homebase/c/${username}/${castHash}` : undefined;
    const ogImageUrl = baseMetadata.openGraph?.images?.[0]?.url ?? "";
    const castFrame = {
      version: "next",
      imageUrl: ogImageUrl,
      button: {
        title: "View Cast",
        action: {
          type: "launch_frame",
          url: castUrl,
          name: `Farcaster Cast on ${brandName}`,
          splashImageUrl,
          splashBackgroundColor: "#FFFFFF",
        },
      },
    };
    return { ...baseMetadata, other: { "fc:frame": JSON.stringify(castFrame) } };
  }
}

export default function HomebaseSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
