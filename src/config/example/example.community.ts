import { Address } from "viem";
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
    twitter: 'https://twitter.com/example',
    github: 'https://github.com/example',
    forum: 'https://forum.example.com',
  },
  social: {
    farcaster: 'example',
    discord: 'example',
    twitter: 'example',
  },
  governance: {
    proposals: 'https://governance.example.com/proposals',
    delegates: 'https://governance.example.com/delegates',
    treasury: 'https://governance.example.com/treasury',
  },
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
  contracts: {
    nouns: '0x1234567890123456789012345678901234567890' as Address,
    auctionHouse: '0x1234567890123456789012345678901234567890' as Address,
    space: '0x1234567890123456789012345678901234567890' as Address,
    nogs: '0x1234567890123456789012345678901234567890' as Address,
  },
} satisfies CommunityConfig;
