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
  },
  social: {
    farcaster: "clanker",
  },
  governance: {},
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
  }
} satisfies CommunityConfig;
