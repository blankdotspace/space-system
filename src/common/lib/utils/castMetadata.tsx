import { merge } from "lodash";
import { Metadata } from "next";
import { WEBSITE_URL } from "@/constants/app";

type MetadataContext = {
  baseUrl: string;
  brandName: string;
  twitterHandle?: string;
};

export type CastMetadata = {
  hash?: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  text?: string;
  embedImageUrl?: string;
};

export const getCastMetadataStructure = (
  cast: CastMetadata,
  context?: MetadataContext,
): Metadata => {
  if (!cast) {
    return {};
  }

  const { hash, username, displayName, pfpUrl, text, embedImageUrl } = cast;
  const baseUrl = context?.baseUrl ?? WEBSITE_URL;
  const twitterHandle = normalizeTwitterHandle(context?.twitterHandle);

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
  if (embedImageUrl) {
    params.set("imageUrl", embedImageUrl);
  }

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
      images: [ogImage],
      card: "summary_large_image",
      ...(twitterHandle ? { site: twitterHandle } : {}),
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

const normalizeTwitterHandle = (handle?: string): string | undefined => {
  if (!handle) {
    return undefined;
  }
  const trimmed = handle.trim();
  if (!trimmed) {
    return undefined;
  }
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  const cleaned = withoutAt.replace(/^https?:\/\//i, "");
  const parts = cleaned.split("/");
  const lastPart = parts[parts.length - 1]?.replace(/^@/, "");
  if (!lastPart) {
    return undefined;
  }
  return `@${lastPart}`;
};
