import { loadTokenSpacePageData} from "./utils";
import React from "react";
import { TokenProvider } from "@/common/providers/TokenProvider";
import TokenSpace from "./TokenSpace";
import SpaceNotFound from "@/app/(spaces)/SpaceNotFound";
import { Address } from "viem";
import { EtherScanChainName } from "@/constants/etherscanChainIds";
import { redirect } from "next/navigation";

export default async function TokenSpacePage({ 
  params 
}: {
  params: Promise<{ network: string; contractAddress: string; tabName?: string }>
}) {
  const { network: networkParam, contractAddress: contractAddressParam, tabName: tabNameParam } = await params;
  const resolvedParams = { network: networkParam, contractAddress: contractAddressParam };
  
  // Handle tabName parameter (decode if needed)
  let decodedTabNameParam = tabNameParam;
  if (tabNameParam) {
    decodedTabNameParam = decodeURIComponent(tabNameParam);
  }

  // Load token space data
  let tokenSpacePageData;
  try {
    tokenSpacePageData = await loadTokenSpacePageData(
      resolvedParams.contractAddress, 
      resolvedParams.network, 
      decodedTabNameParam
    );
  } catch (error) {
    console.error("Error loading token space data:", error);
    return <SpaceNotFound />;
  }

  // Guard against null/undefined tokenSpaceData
  if (!tokenSpacePageData) {
    return (
      <SpaceNotFound />
    );
  }
  
  // Handle redirect outside of try/catch to avoid catching redirect errors
  // This will throw NEXT_REDIRECT error which Next.js handles
  if (!decodedTabNameParam) {
    redirect(
      `/t/${resolvedParams.network}/${resolvedParams.contractAddress}/${encodeURIComponent(tokenSpacePageData.defaultTab)}`
    );
  }

  return (
    <TokenProvider
      contractAddress={tokenSpacePageData.contractAddress as Address}
      network={tokenSpacePageData.network as EtherScanChainName}
      defaultTokenData={tokenSpacePageData.tokenData}
    >
      <TokenSpace
        spacePageData={tokenSpacePageData}
        tabName={decodedTabNameParam || tokenSpacePageData.defaultTab}
      />
    </TokenProvider>
  );
}
