import type { FidgetData, FidgetSettings, FidgetSettingsStyle } from "@/common/fidgets";

export type DirectoryNetwork = "base" | "polygon" | "mainnet";
export type DirectoryAssetType = "token" | "nft";
export type DirectorySortOption = "tokenHoldings" | "followers";
export type DirectoryLayoutStyle = "cards" | "list";
export type DirectoryIncludeOption =
  | "holdersWithFarcasterAccount"
  | "allHolders";

export type DirectorySource = "tokenHolders" | "farcasterChannel" | "csv";
export type DirectoryChannelFilterOption = "members" | "followers" | "all";
export type CsvTypeOption = "address" | "fid" | "username";
export type CsvSortOption = "followers" | "csvOrder";

export type DirectoryMemberViewerContext = {
  following?: boolean | null;
};

export interface DirectoryMemberData {
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
  viewerContext?: DirectoryMemberViewerContext | null;
}

export interface DirectoryFidgetData extends FidgetData {
  members: DirectoryMemberData[];
  lastUpdatedTimestamp?: string | null;
  tokenSymbol?: string | null;
  tokenDecimals?: number | null;
  lastFetchSettings?: Partial<DirectoryFidgetSettings>; // Snapshot of settings used for last fetch
}

export type DirectoryFidgetSettings = FidgetSettings &
  FidgetSettingsStyle & {
    source: DirectorySource;
    network: DirectoryNetwork;
    contractAddress: string;
    assetType: DirectoryAssetType;
    sortBy: DirectorySortOption;
    layoutStyle: DirectoryLayoutStyle;
    include: DirectoryIncludeOption;
    channelName?: string;
    channelFilter?: DirectoryChannelFilterOption;
    csvType?: CsvTypeOption;
    csvSortBy?: CsvSortOption;
    csvContent?: string; // raw csv text
    csvUploadedAt?: string; // iso timestamp (legacy)
    csvUpload?: string; // iso timestamp to trigger refresh
    csvFilename?: string; // last uploaded filename
    refreshToken?: string;
    subheader?: string;
    primaryFontFamily?: string;
    primaryFontColor?: string;
    secondaryFontFamily?: string;
    secondaryFontColor?: string;
  };

