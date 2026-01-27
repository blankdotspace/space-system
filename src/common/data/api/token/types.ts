import { z } from "zod";
import neynar from "@/common/data/api/neynar";

// Query validation schema
export const DIRECTORY_QUERY_SCHEMA = z.object({
  network: z.enum(["base", "polygon", "mainnet"]),
  contractAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid contract address format"),
  pageSize: z.coerce.number().int().positive().max(1000).default(1000),
  assetType: z.enum(["token", "nft"]).default("token"),
});

export type DirectoryQuery = z.infer<typeof DIRECTORY_QUERY_SCHEMA>;
export type DirectoryNetwork = DirectoryQuery["network"];

// Internal holder record (normalized format)
export type TokenHolder = {
  ownerAddress?: string | null;
  tokenBalances?: Array<{ balance?: string | null }> | null;
};

// Moralis API types
export type MoralisErc20Holder = {
  address?: string | null;
  wallet_address?: string | null;
  owner_address?: string | null;
  balance?: string | number | null;
  total?: string | number | null;
  value?: string | number | null;
  decimals?: number | string | null;
  symbol?: string | null;
};

export type MoralisErc20HoldersResponse = {
  result?: MoralisErc20Holder[] | null;
  cursor?: string | null;
  next?: string | null;
  page_size?: number | null;
  total?: number | null;
  decimals?: number | string | null;
  token_decimals?: number | string | null;
  symbol?: string | null;
  token_symbol?: string | null;
};

// Neynar types
export type NeynarBulkUsersResponse = Awaited<
  ReturnType<typeof neynar.fetchBulkUsersByEthOrSolAddress>
>;

export type NeynarUser = NeynarBulkUsersResponse extends Record<string, infer V>
  ? V extends Array<infer U>
    ? U
    : never
  : never;

// ENS metadata types
export type EnsMetadata = {
  ensName: string | null;
  ensAvatarUrl: string | null;
  twitterHandle: string | null;
  twitterUrl: string | null;
  githubHandle: string | null;
  githubUrl: string | null;
  primaryAddress: string | null;
};

// Directory member (final output format)
export type DirectoryMember = {
  address: string;
  balanceRaw: string;
  balanceFormatted: string;
  username?: string | null;
  displayName?: string | null;
  fid?: number | null;
  pfpUrl?: string | null;
  followers?: number | null;
  lastTransferAt?: string | null;
  ensName?: string | null;
  ensAvatarUrl?: string | null;
  primaryAddress?: string | null;
  etherscanUrl?: string | null;
  xHandle?: string | null;
  xUrl?: string | null;
  githubHandle?: string | null;
  githubUrl?: string | null;
};

// API response type
export type DirectoryApiResponse = {
  fetchedAt: string;
  members: DirectoryMember[];
  tokenSymbol: string | null;
  tokenDecimals: number | null;
};

// Dependencies (for dependency injection/testing)
export type DirectoryDependencies = {
  fetchFn: typeof fetch;
  neynarClient: typeof neynar;
};

// Fetch result types
export type FetchHoldersResult = {
  holders: TokenHolder[];
  tokenDecimals: number | null;
  tokenSymbol: string | null;
  updatedAt: string;
};
