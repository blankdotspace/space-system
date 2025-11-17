import { createExplorePageConfig } from "../createExplorePageConfig";
import { nounsCommunity } from "./nouns.community";

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

export const nounsExplorePage = createExplorePageConfig({
  tokens: nounsTokens,
  channel: nounsCommunity.social?.farcaster ?? null,
  defaultTokenNetwork: "mainnet",
});
