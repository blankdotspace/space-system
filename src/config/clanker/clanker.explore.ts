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

export const clankerExplorePage = createExplorePageConfig({
  tokens: clankerTokens,
  channel: clankerCommunity.social?.farcaster ?? null,
  defaultTokenNetwork: "base",
  channelNetwork: "base",
});
