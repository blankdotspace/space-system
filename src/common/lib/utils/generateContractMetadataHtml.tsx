import { MasterToken } from "@/common/providers/TokenProvider";
import { Metadata } from 'next/types';
import { WEBSITE_URL } from "@/constants/app";

export type UserMetadata = {
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
};

export const generateContractMetadataHtml = (
  contractAddress?: string | null,
  tokenData?: MasterToken | null,
  baseUrl: string = WEBSITE_URL,
): Metadata => {
  const spaceUrl = tokenData?.network && contractAddress
    ? `${baseUrl}/t/${tokenData?.network}/${contractAddress}`
    : baseUrl;
  const priceInfo = tokenData?.geckoData?.price_usd
    ? ` - $${Number(tokenData.geckoData?.price_usd)} USD`
    : "";

  const symbol =
    tokenData?.clankerData?.symbol || tokenData?.geckoData?.symbol || "";

  const title = `${symbol}${priceInfo}`;

  const metadata = {
    title,
    openGraph: {
      title,
      url: spaceUrl,
    },
    twitter: {
      title,
      domain: (() => {
        try {
          return new URL(baseUrl).hostname;
        } catch {
          return baseUrl.replace(/^https?:\/\//, "");
        }
      })(),
      url: spaceUrl,
    },
  };

  return metadata;
};
