import type {
  DirectorySortOption,
  DirectoryIncludeOption,
  DirectorySource,
  DirectoryChannelFilterOption,
  CsvTypeOption,
  CsvSortOption,
} from "./types";

export const STALE_AFTER_MS = 60 * 60 * 1000;
export const PAGE_SIZE = 100;
export const CHANNEL_FETCH_DEBOUNCE_MS = 800;

export const NETWORK_OPTIONS = [
  { name: "Base", value: "base" },
  { name: "Polygon", value: "polygon" },
  { name: "Ethereum Mainnet", value: "mainnet" },
] as const;

export const SORT_OPTIONS = [
  { name: "Token holdings", value: "tokenHoldings" },
  { name: "Followers", value: "followers" },
] as const satisfies ReadonlyArray<{
  name: string;
  value: DirectorySortOption;
}>;

export const LAYOUT_OPTIONS = [
  { name: "Cards", value: "cards" },
  { name: "List", value: "list" },
] as const;

export const ASSET_TYPE_OPTIONS = [
  { name: "Token", value: "token" },
  { name: "NFT", value: "nft" },
] as const;

export const INCLUDE_OPTIONS = [
  {
    name: "Holders with Farcaster Account",
    value: "holdersWithFarcasterAccount",
  },
  { name: "All holders", value: "allHolders" },
] as const satisfies ReadonlyArray<{
  name: string;
  value: DirectoryIncludeOption;
}>;

export const SOURCE_OPTIONS = [
  { name: "Token Holders", value: "tokenHolders" },
  { name: "Farcaster Channel", value: "farcasterChannel" },
  { name: "CSV", value: "csv" },
] as const satisfies ReadonlyArray<{
  name: string;
  value: DirectorySource;
}>;

export const CHANNEL_FILTER_OPTIONS = [
  { name: "Members", value: "members" },
  { name: "Followers", value: "followers" },
  { name: "All", value: "all" },
] as const satisfies ReadonlyArray<{
  name: string;
  value: DirectoryChannelFilterOption;
}>;

export const CSV_TYPE_OPTIONS = [
  { name: "Address", value: "address" },
  { name: "FID", value: "fid" },
  { name: "Farcaster username", value: "username" },
] as const satisfies ReadonlyArray<{
  name: string;
  value: CsvTypeOption;
}>;

export const CSV_SORT_OPTIONS = [
  { name: "Followers", value: "followers" },
  { name: "CSV order", value: "csvOrder" },
] as const satisfies ReadonlyArray<{
  name: string;
  value: CsvSortOption;
}>;

// Badge image paths
export const FARCASTER_BADGE_SRC = "/platforms/farcaster.jpeg";
export const ENS_BADGE_SRC = "/platforms/ens.svg";
export const X_BADGE_SRC = "/platforms/twitter.avif";
export const GITHUB_BADGE_SRC = "/platforms/github.svg";
export const ETHERSCAN_BADGE_SRC = "/platforms/etherscan.svg";

