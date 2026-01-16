import type {
  CommunityConfig,
  CommunityErc20Token,
  CommunityNftToken,
} from "../systemConfig";

export const exampleCommunity = {
  type: 'example',
  urls: {
    website: 'https://example.com',
    discord: 'https://discord.gg/example',
  },
  social: {
    farcaster: 'example',
  },
  governance: {},
  tokens: {
    erc20Tokens: [
      {
        address: '0x1234567890123456789012345678901234567890',
        symbol: '$EXAMPLE',
        decimals: 18,
        network: 'mainnet',
      },
    ] satisfies CommunityErc20Token[],
    nftTokens: [
      {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'Example NFT',
        type: 'erc721',
        network: 'eth',
      },
    ] satisfies CommunityNftToken[],
  },
} satisfies CommunityConfig;
