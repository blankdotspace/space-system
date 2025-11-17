import { Address } from "viem";
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
    twitter: 'https://twitter.com/nounsdao',
    github: 'https://github.com/nounsDAO',
    forum: 'https://discourse.nouns.wtf',
  },
  social: {
    farcaster: 'nouns',
    discord: 'nouns',
    twitter: 'nounsdao',
  },
  governance: {
    proposals: 'https://nouns.wtf/vote',
    delegates: 'https://nouns.wtf/delegates',
    treasury: 'https://nouns.wtf/treasury',
  },
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
  contracts: {
    nouns: '0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03' as Address,
    auctionHouse: '0x830bd73e4184cef73443c15111a1df14e495c706' as Address,
    space: '0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab' as Address,
    nogs: '0xD094D5D45c06c1581f5f429462eE7cCe72215616' as Address,
  },
} satisfies CommunityConfig;
