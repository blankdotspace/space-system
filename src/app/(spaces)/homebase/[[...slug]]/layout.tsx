import React from "react";
import type { Metadata } from "next/types";

import { WEBSITE_URL } from "@/constants/app";
import { CastParamType } from "@neynar/nodejs-sdk/build/api";
import neynar from "@/common/data/api/neynar";
import { getCastMetadataStructure } from "@/common/lib/utils/castMetadata";
import { getDefaultFrame } from "@/constants/metadata";

async function buildDefaultMetadata(): Promise<Metadata> {
  const defaultFrame = await getDefaultFrame();
  return {
    other: {
      "fc:frame": JSON.stringify(defaultFrame),
    },
  };
}

export async function generateMetadata({ params }): Promise<Metadata> {
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
    return buildDefaultMetadata();
  }

  try {
    const { cast } = await neynar.lookupCastByHashOrWarpcastUrl({
      identifier: castHash,
      type: CastParamType.Hash,
    });

    const baseMetadata = getCastMetadataStructure({
      hash: cast.hash,
      username: cast.author.username,
      displayName: cast.author.display_name,
      pfpUrl: cast.author.pfp_url,
      text: cast.text,
    });

    const castUrl = `${WEBSITE_URL}/homebase/c/${cast.author.username}/${cast.hash}`;
    const ogImageUrl = baseMetadata.openGraph?.images?.[0]?.url ?? "";

    const castFrame = {
      version: "next",
      imageUrl: ogImageUrl,
      button: {
        title: `View @${cast.author.username}'s Cast`,
        action: {
          type: "launch_frame",
          url: castUrl,
          name: `Cast by @${cast.author.username} on Nounspace`,
          splashImageUrl: `${WEBSITE_URL}/images/nounspace_logo.png`,
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
    const baseMetadata = getCastMetadataStructure({ hash: castHash, username });
    const castUrl = username && castHash ? `${WEBSITE_URL}/homebase/c/${username}/${castHash}` : undefined;
    const ogImageUrl = baseMetadata.openGraph?.images?.[0]?.url ?? "";
    const castFrame = {
      version: "next",
      imageUrl: ogImageUrl,
      button: {
        title: "View Cast",
        action: {
          type: "launch_frame",
          url: castUrl,
          name: "Farcaster Cast on Nounspace",
          splashImageUrl: `${WEBSITE_URL}/images/nounspace_logo.png`,
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
