import { merge } from "lodash";
import { Metadata } from "next";
import { WEBSITE_URL } from "@/constants/app";
import type { MetadataContext } from "@/common/lib/utils/metadataContext";
import { normalizeTwitterHandle } from "@/common/lib/utils/normalizeTwitterHandle";

export type UserMetadata = {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  walletAddress?: string;
};

export const getUserMetadataStructure = (
  userMetadata: UserMetadata,
  context?: MetadataContext,
): Metadata => {
  if (!userMetadata) {
    return {};
  }

  const { username, displayName, pfpUrl, bio } = userMetadata;
  const baseUrl = context?.baseUrl ?? WEBSITE_URL;
  const brandName = context?.brandName ?? "Blankspace";
  const twitterHandle = normalizeTwitterHandle(context?.twitterHandle);

  const title = `${displayName} (@${username}) on ${brandName}`;
  const spaceUrl = username ? `${baseUrl}/s/${username}` : undefined;

  const params = new URLSearchParams({
    username: username || "",
    displayName: displayName || "",
    pfpUrl: pfpUrl || "",
    bio: bio || "",
  });

  const ogImageUrl = `${baseUrl}/api/metadata/spaces?${params.toString()}`;
  const ogImage = {
    url: ogImageUrl,
    width: 1200,
    height: 630,
  };

  const metadata: Metadata = {
    title,
    openGraph: {
      title,
      url: spaceUrl,
      images: [ogImage],
    },
    twitter: {
      title,
      images: [ogImage],
      card: "summary_large_image",
      ...(twitterHandle ? { site: twitterHandle } : {}),
    },
  };

  if (bio) {
    merge(metadata, {
      description: bio,
      openGraph: {
        description: bio,
      },
      twitter: {
        description: bio,
      },
    });
  }

  return metadata;
};
