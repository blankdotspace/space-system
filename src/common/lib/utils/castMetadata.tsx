import { merge } from "lodash";
import { Metadata } from "next";
import { WEBSITE_URL } from "@/constants/app";

type MetadataContext = {
  baseUrl: string;
  brandName: string;
};

export type CastMetadata = {
  hash?: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  text?: string;
};

export const getCastMetadataStructure = (
  cast: CastMetadata,
  context?: MetadataContext,
): Metadata => {
  if (!cast) {
    return {};
  }

  const { hash, username, displayName, pfpUrl, text } = cast;
  const baseUrl = context?.baseUrl ?? WEBSITE_URL;

  const title = displayName
    ? `${displayName}'s Cast`
    : username
    ? `@${username}'s Cast`
    : "Farcaster Cast";

  const castUrl =
    hash && username
      ? `${baseUrl}/homebase/c/${username}/${hash}`
      : undefined;

  const params = new URLSearchParams({
    username: username || "",
    displayName: displayName || "",
    pfpUrl: pfpUrl || "",
    text: text || "",
  });

  const ogImageUrl = `${baseUrl}/api/metadata/cast?${params.toString()}`;

  const ogImage = {
    url: ogImageUrl,
    width: 1200,
    height: 630,
  };

  const metadata: Metadata = {
    title,
    openGraph: {
      title,
      url: castUrl,
      images: [ogImage],
    },
    twitter: {
      title,
      site: baseUrl,
      images: [ogImage],
      card: "summary_large_image",
    },
  };

  if (text) {
    merge(metadata, {
      description: text,
      openGraph: { description: text },
      twitter: { description: text },
    });
  }

  return metadata;
};
