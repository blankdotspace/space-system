import type { DirectoryFidgetData } from "@/fidgets/token/Directory/types";

type RawTabData = {
  fidgetInstanceDatums?: Record<
    string,
    {
      fidgetType?: string;
      config?: {
        data?: unknown;
      };
    }
  >;
} | null;

type DirectoryPayloadLike = DirectoryFidgetData & { lastFetchSettings?: unknown };

const isDirectoryData = (value: unknown): value is DirectoryPayloadLike =>
  !!value && typeof value === "object" && Array.isArray((value as DirectoryPayloadLike).members);

const sanitizeLastFetchSettings = (
  lastFetchSettings: DirectoryPayloadLike["lastFetchSettings"],
): DirectoryFidgetData["lastFetchSettings"] => {
  if (!lastFetchSettings) {
    return undefined;
  }

  const source = (lastFetchSettings as { source?: unknown }).source;
  const normalizedSource =
    source === "tokenHolders" || source === "farcasterChannel" || source === "csv"
      ? source
      : undefined;

  return {
    ...(lastFetchSettings as Record<string, unknown>),
    ...(normalizedSource ? { source: normalizedSource } : { source: undefined }),
  };
};

const sanitizeDirectoryData = (data: DirectoryPayloadLike): DirectoryFidgetData => ({
  members: Array.isArray(data.members) ? data.members : [],
  lastUpdatedTimestamp: data.lastUpdatedTimestamp ?? null,
  tokenSymbol: data.tokenSymbol ?? null,
  tokenDecimals: data.tokenDecimals ?? null,
  lastFetchSettings: sanitizeLastFetchSettings(data.lastFetchSettings),
});

/**
 * Extract the persisted Directory fidget data from a serialized Tab JSON object.
 * We support both the legacy saved-tab shape (with fidgetInstanceDatums) and the
 * simplified shape that stores DirectoryFidgetData at the root.
 */
export const getDirectoryDataFromTabJson = (
  raw: unknown,
): DirectoryFidgetData | undefined => {
  if (isDirectoryData(raw)) {
    return sanitizeDirectoryData(raw);
  }

  const tabData = raw as RawTabData;
  if (!tabData?.fidgetInstanceDatums) {
    return undefined;
  }

  const directoryEntry = Object.values(tabData.fidgetInstanceDatums).find(
    (value) => value?.fidgetType === "Directory" && value.config?.data,
  );

  const data = directoryEntry?.config?.data;
  return isDirectoryData(data) ? sanitizeDirectoryData(data) : undefined;
};
