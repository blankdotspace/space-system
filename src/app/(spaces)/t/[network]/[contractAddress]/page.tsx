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
  const tokenSpacePageData = await loadTokenSpacePageData(
    resolvedParams.contractAddress, 
    resolvedParams.network, 
    decodedTabNameParam
  );

  // Guard against null/undefined tokenSpaceData
  if (!tokenSpacePageData) {
    return (
      <SpaceNotFound />
    );
  }
  
  if (!decodedTabNameParam && !tokenSpacePageData.spaceId) {
    redirect(`/t/${resolvedParams.network}/${resolvedParams.contractAddress}/Token`);
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
