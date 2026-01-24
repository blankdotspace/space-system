import { createExplorePageConfig } from "../createExplorePageConfig";
import type { CommunityErc20Token, CommunityNftToken } from "../systemConfig";
import { clankerCommunity } from "./clanker.community";

const erc20Tokens = Array.isArray(clankerCommunity.tokens?.erc20Tokens)
  ? (clankerCommunity.tokens.erc20Tokens as CommunityErc20Token[])
  : [];
const nftTokens = Array.isArray(clankerCommunity.tokens?.nftTokens)
  ? (clankerCommunity.tokens.nftTokens as CommunityNftToken[])
  : [];

const clankerTokens = [
  ...erc20Tokens.map((token) => ({
    address: token.address,
    symbol: token.symbol,
    network: token.network,
    assetType: "token" as const,
  })),
  ...nftTokens.map((token) => ({
    address: token.address,
    symbol: token.symbol,
    network: token.network,
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
