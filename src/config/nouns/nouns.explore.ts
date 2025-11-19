import { createExplorePageConfig } from "../createExplorePageConfig";
import { nounsCommunity } from "./nouns.community";
import nounsChannelTab from "./initialSpaces/exploreTabs/channel.json";
import spaceHoldersTab from "./initialSpaces/exploreTabs/spaceHolders.json";
import nounsNftHoldersTab from "./initialSpaces/exploreTabs/nounsNFTholders.json";
import { getDirectoryDataFromTabJson } from "../utils/exploreTabDirectoryData";

const nounsTokens = [
  ...(nounsCommunity.tokens?.erc20Tokens ?? []).map(({ address, symbol, network }) => ({
    address,
    symbol,
    network,
    assetType: "token" as const,
  })),
  ...(nounsCommunity.tokens?.nftTokens ?? []).map(({ address, symbol, network }) => ({
    address,
    symbol,
    network,
    assetType: "nft" as const,
  })),
];

const nounsPreloadedDirectoryData = {
  "$SPACE": getDirectoryDataFromTabJson(spaceHoldersTab),
  space: getDirectoryDataFromTabJson(spaceHoldersTab),
  Nouns: getDirectoryDataFromTabJson(nounsNftHoldersTab),
  nouns: getDirectoryDataFromTabJson(nounsNftHoldersTab),
  "/nouns": getDirectoryDataFromTabJson(nounsChannelTab),
  "channel-nouns": getDirectoryDataFromTabJson(nounsChannelTab),
};

export const nounsExplorePage = createExplorePageConfig({
  tokens: nounsTokens,
  channel: nounsCommunity.social?.farcaster ?? null,
  defaultTokenNetwork: "mainnet",
  preloadedDirectoryData: nounsPreloadedDirectoryData,
});
