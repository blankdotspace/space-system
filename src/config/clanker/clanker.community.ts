import { Address } from "viem";
import type {
  CommunityConfig,
  CommunityErc20Token,
  CommunityNftToken,
} from "../systemConfig";

export const clankerCommunity = {
  type: "token_platform",
  urls: {
    website: "https://clanker.world",
    discord: "https://discord.gg/clanker", // Placeholder - would need actual Discord
    twitter: "https://twitter.com/clankerworld", // Placeholder - would need actual Twitter
    github: "https://github.com/clanker", // Placeholder - would need actual GitHub
    forum: "https://forum.clanker.world" // Placeholder - would need actual forum
  },
  social: {
    farcaster: "clanker",
    discord: "clanker", // Placeholder - would need actual Discord
    twitter: "clankerworld" // Placeholder - would need actual Twitter handle
  },
  governance: {
    proposals: "https://proposals.clanker.world", // Placeholder
    delegates: "https://delegates.clanker.world", // Placeholder
    treasury: "https://treasury.clanker.world" // Placeholder
  },
  tokens: {
    erc20Tokens: [
      {
        address: "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb",
        symbol: "$CLANKER",
        decimals: 18,
        network: "base",
      },
    ] satisfies CommunityErc20Token[],
    nftTokens: [] satisfies CommunityNftToken[],
  },
  contracts: {
    clanker: "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb" as Address, // Placeholder - would need actual contract
    tokenFactory: "0x0000000000000000000000000000000000000000" as Address, // Placeholder - would need actual contract
    space: "0x0000000000000000000000000000000000000000" as Address, // Placeholder - would need actual contract
    trading: "0x0000000000000000000000000000000000000000" as Address, // Placeholder - would need actual contract
    // For compatibility with CommunityConfig interface
    nouns: "0x0000000000000000000000000000000000000000" as Address,
    auctionHouse: "0x0000000000000000000000000000000000000000" as Address,
    nogs: "0x0000000000000000000000000000000000000000" as Address,
  }
} satisfies CommunityConfig;
