import { createExplorePageConfig } from "../createExplorePageConfig";
import { clankerCommunity } from "./clanker.community";

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

// Note: Preloaded directory data JSON files were removed as explore pages are now stored as Spaces
// The explore page will use default/empty preloaded data
const clankerPreloadedDirectoryData = {};

export const clankerExplorePage = createExplorePageConfig({
  tokens: clankerTokens,
  channel: clankerCommunity.social?.farcaster ?? null,
  defaultTokenNetwork: "base",
  channelNetwork: "base",
  preloadedDirectoryData: clankerPreloadedDirectoryData,
});
