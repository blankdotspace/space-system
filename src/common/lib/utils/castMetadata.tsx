import { merge } from "lodash";
import { Metadata } from "next";
import { WEBSITE_URL } from "@/constants/app";
import type { MetadataContext } from "@/common/lib/utils/metadataContext";
import { normalizeTwitterHandle } from "@/common/lib/utils/normalizeTwitterHandle";

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
  const brandName = context?.brandName ?? "Nounspace";
  const twitterHandle = normalizeTwitterHandle(context?.twitterHandle);

  const title = displayName
    ? `${displayName}'s Cast`
    : username
    ? `@${username}'s Cast`
    : `Cast on ${brandName}`;

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
