import type {
  CommunityConfig,
  CommunityErc20Token,
  CommunityNftToken,
} from "../systemConfig";

export const nounsCommunity = {
  type: 'nouns',
  urls: {
    website: 'https://nouns.com',
    discord: 'https://discord.gg/nouns',
  },
  social: {
    farcaster: 'nouns',
  },
  governance: {},
  tokens: {
    erc20Tokens: [
      {
        address: '0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab',
        symbol: '$SPACE',
        decimals: 18,
        network: 'base',
      },
    ] satisfies CommunityErc20Token[],
    nftTokens: [
      {
        address: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
        symbol: 'Nouns',
        type: 'erc721',
        network: 'eth',
      },
    ] satisfies CommunityNftToken[],
  },
} satisfies CommunityConfig;
