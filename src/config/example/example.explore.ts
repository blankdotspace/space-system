import { createExplorePageConfig } from "../createExplorePageConfig";
import { exampleCommunity } from "./example.community";

const erc20Tokens = Array.isArray(exampleCommunity.tokens?.erc20Tokens)
  ? exampleCommunity.tokens.erc20Tokens
  : [];
const nftTokens = Array.isArray(exampleCommunity.tokens?.nftTokens)
  ? exampleCommunity.tokens.nftTokens
  : [];

const exampleTokens = [
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

export const exampleExplorePage = createExplorePageConfig({
  tokens: exampleTokens,
  channel: exampleCommunity.social?.farcaster ?? null,
  defaultTokenNetwork: "mainnet",
});
