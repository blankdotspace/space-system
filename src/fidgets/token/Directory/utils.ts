import { formatDistanceToNow } from "date-fns";
import { FONT_FAMILY_OPTIONS } from "@/common/lib/theme/fonts";
import { toFarcasterCdnUrl } from "@/common/lib/utils/farcasterCdn";
import type { DirectoryMemberData, DirectorySortOption } from "./types";

/**
 * Formats a token balance string with locale-aware number formatting
 */
export function formatTokenBalance(value: string | null | undefined): string {
  if (value == null || value === "") return "0";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return parsed.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Resolves font family from a font option name or CSS value
 */
export function resolveFontFamily(
  value: string | undefined,
  fallback: string
): string {
  if (!value) return fallback;
  const fontOption = FONT_FAMILY_OPTIONS.find(
    (option) =>
      option.name === value || option.config.style.fontFamily === value,
  );
  if (fontOption?.config?.style?.fontFamily) {
    return fontOption.config.style.fontFamily as string;
  }
  return value;
}

/**
 * Gets a human-readable "last activity" label from a timestamp
 */
export function getLastActivityLabel(timestamp?: string | null): string | null {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Gets the primary display label for a directory member
 */
export function getMemberPrimaryLabel(member: DirectoryMemberData): string {
  return member.displayName || member.username || member.ensName || member.address;
}

/**
 * Gets the secondary display label for a directory member
 */
export function getMemberSecondaryLabel(member: DirectoryMemberData): string | null {
  if (member.username) {
    return `@${member.username}`;
  }

  if (member.ensName) {
    return member.address;
  }

  return null;
}

/**
 * Gets the avatar image source URL for a directory member
 */
export function getMemberAvatarSrc(member: DirectoryMemberData): string | undefined {
  const proxied = member.pfpUrl ? toFarcasterCdnUrl(member.pfpUrl) : undefined;
  return proxied ?? member.ensAvatarUrl ?? undefined;
}

/**
 * Gets the fallback text for a member's avatar
 */
export function getMemberAvatarFallback(member: DirectoryMemberData): string | undefined {
  return getMemberPrimaryLabel(member)?.slice(0, 2)?.toUpperCase();
}

/**
 * Builds Farcaster profile URL from username or FID
 */
export function getFarcasterProfileUrl(
  username?: string | null,
  fid?: number | null
): string | null {
  const normalizedUsername = username?.replace(/^@/, "").trim();
  if (normalizedUsername) {
    return `https://warpcast.com/${normalizedUsername}`;
  }
  if (typeof fid === "number" && Number.isFinite(fid)) {
    return `https://warpcast.com/~/identity?fid=${fid}`;
  }
  return null;
}

/**
 * Builds ENS profile URL from ENS name
 */
export function getEnsProfileUrl(ensName?: string | null): string | null {
  return ensName ? `https://app.ens.domains/${ensName}` : null;
}

/**
 * Sanitizes a sort option value to ensure it's valid
 */
export function sanitizeSortOption(value: unknown): DirectorySortOption {
  return value === "followers" ? "followers" : "tokenHoldings";
}

/**
 * Sorts directory members by the specified sort option
 */
export function sortMembers(
  members: DirectoryMemberData[],
  sortBy: DirectorySortOption,
): DirectoryMemberData[] {
  const entries = [...members];

  if (sortBy === "followers") {
    entries.sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1));
    return entries;
  }

  entries.sort((a, b) => {
    try {
      const aValue = BigInt(a.balanceRaw ?? "0");
      const bValue = BigInt(b.balanceRaw ?? "0");
      if (bValue > aValue) return 1;
      if (bValue < aValue) return -1;
      return 0;
    } catch (error) {
      return 0;
    }
  });

  return entries;
}

// Re-export utilities from sub-modules
export { parseCsv, chunkArray } from "./utils/csv";
export {
  getNestedUser,
  mapNeynarUserToMember,
  createDefaultMemberForCsv,
  extractViewerContext,
  type NeynarUser,
} from "./utils/memberData";

