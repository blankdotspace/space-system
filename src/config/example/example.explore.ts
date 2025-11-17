import { createExplorePageConfig } from "../createExplorePageConfig";
import { exampleCommunity } from "./example.community";

const exampleTokens = [
  ...(exampleCommunity.tokens?.erc20Tokens ?? []).map(({ address, symbol, network }) => ({
    address,
    symbol,
    network,
    assetType: "token" as const,
  })),
  ...(exampleCommunity.tokens?.nftTokens ?? []).map(({ address, symbol, network }) => ({
    address,
    symbol,
    network,
    assetType: "nft" as const,
  })),
];

export const exampleExplorePage = createExplorePageConfig({
  tokens: exampleTokens,
  channel: exampleCommunity.social?.farcaster ?? null,
  defaultTokenNetwork: "mainnet",
});
