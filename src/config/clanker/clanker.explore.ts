import { createExplorePageConfig } from "../createExplorePageConfig";
import { clankerCommunity } from "./clanker.community";
import clankerChannelTab from "./initialSpaces/exploreTabs/channel.json";
import clankerTokenTab from "./initialSpaces/exploreTabs/clanker.json";
import { getDirectoryDataFromTabJson } from "../utils/exploreTabDirectoryData";

const clankerTokens = [
  ...(clankerCommunity.tokens?.erc20Tokens ?? []).map(({ address, symbol, network }) => ({
    address,
    symbol,
    network,
    assetType: "token" as const,
  })),
  ...(clankerCommunity.tokens?.nftTokens ?? []).map(({ address, symbol, network }) => ({
    address,
    symbol,
    network,
    assetType: "nft" as const,
  })),
];

const clankerPreloadedDirectoryData = {
  "$CLANKER": getDirectoryDataFromTabJson(clankerTokenTab),
  clanker: getDirectoryDataFromTabJson(clankerTokenTab),
  "/clanker": getDirectoryDataFromTabJson(clankerChannelTab),
  "channel-clanker": getDirectoryDataFromTabJson(clankerChannelTab),
};

export const clankerExplorePage = createExplorePageConfig({
  tokens: clankerTokens,
  channel: clankerCommunity.social?.farcaster ?? null,
  defaultTokenNetwork: "base",
  channelNetwork: "base",
  preloadedDirectoryData: clankerPreloadedDirectoryData,
});
