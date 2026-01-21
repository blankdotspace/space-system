import { merge } from "lodash";
import { Metadata } from "next";
import { WEBSITE_URL } from "@/constants/app";
import type { MetadataContext } from "@/common/lib/utils/metadataContext";
import { normalizeTwitterHandle } from "@/common/lib/utils/normalizeTwitterHandle";

export type TokenMetadata = {
  name?: string;
  symbol?: string;
  imageUrl?: string;
  contractAddress?: string;
  marketCap?: string;
  price?: string;
  priceChange?: string;
  network?: string;
};

export const getTokenMetadataStructure = (
  token: TokenMetadata,
  context?: MetadataContext,
): Metadata => {
  if (!token) {
    return {};
  }

  const {
    name,
    symbol,
    imageUrl,
    contractAddress,
    marketCap,
    price,
    priceChange,
    network,
  } = token;

  const baseUrl = context?.baseUrl ?? WEBSITE_URL;
  const brandName = context?.brandName ?? "Nounspace";
  const twitterHandle = normalizeTwitterHandle(context?.twitterHandle);

  const spaceUrl =
    network && contractAddress
      ? `${baseUrl}/t/${network}/${contractAddress}`
      : undefined;
  const title = symbol ? `${symbol} on ${brandName}` : `Token Space on ${brandName}`;

  const params = new URLSearchParams({
    name: name || "",
    symbol: symbol || "",
    imageUrl: imageUrl || "",
    address: contractAddress || "",
    marketCap: marketCap || "",
    price: price || "",
    priceChange: priceChange || "",
  });

  const ogImageUrl = `${baseUrl}/api/metadata/token?${params.toString()}`;

  const metadata: Metadata = {
    title,
    openGraph: {
      title,
      url: spaceUrl,
      images: [ogImageUrl],
    },
    twitter: {
      title,
      images: [ogImageUrl],
      card: "summary_large_image",
      ...(twitterHandle ? { site: twitterHandle } : {}),
    },
  };

  if (marketCap || priceChange || price) {
    const descParts: string[] = [];
    if (marketCap) descParts.push(`Market Cap: $${marketCap}`);
    if (price) descParts.push(`Price: ${price}`);
    if (priceChange) descParts.push(`24h: ${priceChange}%`);
    const description = descParts.join(" | ");
    merge(metadata, {
      description,
      openGraph: { description },
      twitter: { description },
    });
  }

  return metadata;
};
