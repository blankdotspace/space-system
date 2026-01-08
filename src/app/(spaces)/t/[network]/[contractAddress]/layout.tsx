import { Metadata } from "next/types";
import React from "react";
import { getTokenMetadataStructure } from "@/common/lib/utils/tokenMetadata";
import { getDefaultFrame } from "@/constants/metadata";
import { fetchMasterTokenServer } from "@/common/data/queries/serverTokenData";
import { EtherScanChainName } from "@/constants/etherscanChainIds";
import { loadSystemConfig, type SystemConfig } from "@/config";
import { resolveBaseUrl } from "@/common/lib/utils/resolveBaseUrl";
import { resolveAssetUrl } from "@/common/lib/utils/resolveAssetUrl";

// Default metadata (used as fallback)
async function buildDefaultMetadata(systemConfig: SystemConfig, baseUrl: string): Promise<Metadata> {
  const defaultFrame = await getDefaultFrame({ systemConfig, baseUrl });
  return {
    other: {
      "fc:frame": JSON.stringify(defaultFrame),
    },
  };
}

export async function generateMetadata({
  params,
}): Promise<Metadata> {
  const systemConfig = await loadSystemConfig();
  const baseUrl = await resolveBaseUrl({ systemConfig });
  const brandName = systemConfig.brand.displayName;
  const twitterHandle = systemConfig.community.social?.x;
  const splashImageUrl =
    resolveAssetUrl(systemConfig.assets.logos.splash, baseUrl) ??
    systemConfig.assets.logos.splash;
  const { network, contractAddress, tabName: tabNameParam } = await params;
  const defaultMetadata = await buildDefaultMetadata(systemConfig, baseUrl);
  
  if (!network || !contractAddress) {
    return defaultMetadata; // Return default metadata if no network/contractAddress
  }
  
  // Try to fetch token data using fetchMasterToken
  let symbol = "";
  let price = "";
  let name = "";
  let imageUrl = "";
  let marketCap = "";
  let priceChange = "";
  
  try {
    // Use fetchMasterToken to get all token data in one consolidated call
    const masterToken = await fetchMasterTokenServer(contractAddress, network as EtherScanChainName);
    
    symbol = masterToken.clankerData?.symbol || masterToken.geckoData?.symbol || "";
    name = masterToken.clankerData?.name || masterToken.geckoData?.name || "";
    imageUrl =
      masterToken.clankerData?.img_url ||
      (masterToken.geckoData?.image_url !== "missing.png" ? masterToken.geckoData?.image_url || "" : "");
    marketCap = masterToken.geckoData?.market_cap_usd || "";
    priceChange = masterToken.geckoData?.priceChange || "";

    if (masterToken.geckoData?.price_usd && Number(masterToken.geckoData.price_usd) !== 0) {
      const priceNumber = Number(masterToken.geckoData.price_usd);
      const formatted = priceNumber.toLocaleString(undefined, {
        minimumFractionDigits: priceNumber < 0.01 ? 4 : 2,
        maximumFractionDigits: priceNumber < 0.01 ? 6 : 2,
      });
      price = `$${formatted}`;
    } else if (masterToken.geckoData?.price_usd === "0" || Number(masterToken.geckoData?.price_usd) === 0) {
      price = "TBD ";
    } else {
      price = "";
    }
  } catch (error) {
    console.error("Error fetching token data for frame metadata:", error);
  }
  
  // Process tabName parameter if it exists
  const tabName = tabNameParam ? decodeURIComponent(tabNameParam) : undefined;
  
  // Create Frame metadata for Farcaster with the correct path
  const frameUrl = tabName 
    ? `${baseUrl}/t/${network}/${contractAddress}/${encodeURIComponent(tabName)}`
    : `${baseUrl}/t/${network}/${contractAddress}`;
    
  // Create token frame with the symbol if available
  const queryParams = new URLSearchParams({
    name,
    symbol,
    imageUrl,
    address: contractAddress,
    marketCap,
    price,
    priceChange,
  });

  const ogImageUrl = `${baseUrl}/api/metadata/token?${queryParams.toString()}`;

  const tokenFrame = {
    version: "next",
    imageUrl: ogImageUrl,
    button: {
      title: symbol ? `Visit ${symbol}` : "Visit Token Space",
      action: {
        type: "launch_frame",
        url: frameUrl,
        name: symbol ? `${symbol} on ${brandName}` : `Token Space on ${brandName}`,
        splashImageUrl,
        splashBackgroundColor: "#FFFFFF",
      }
    }
  };
  
  // Create metadata object with token data if available
  const tokenMetadata = getTokenMetadataStructure(
    {
      name,
      symbol,
      imageUrl,
      contractAddress,
      marketCap,
      price,
      priceChange,
      network,
    },
    { baseUrl, brandName, twitterHandle },
  );

  const metadataWithFrame = {
    ...tokenMetadata,
    title: symbol ? `${symbol} ${price ? `- ${price}` : ""} | ${brandName}` : `Token Space | ${brandName}`,
    description: symbol
      ? `${symbol} ${price ? `(${price})` : ""} token information and trading on ${brandName}, the customizable web3 social app built on Farcaster.`
      : `Token information and trading on ${brandName}, the customizable web3 social app built on Farcaster.`,
    other: {
      "fc:frame": JSON.stringify(tokenFrame),
    },
  };
  
  return metadataWithFrame;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
