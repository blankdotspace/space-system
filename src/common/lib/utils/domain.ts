import type { SystemConfig } from "@/config/systemConfig";

const BLANK_SPACE_SUFFIX = ".blank.space";

export function normalizeDomain(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const candidate =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    const host = trimmed.split("/")[0]?.split(":")[0] ?? "";
    if (!host) return null;
    return host.startsWith("www.") ? host.slice(4) : host;
  }
}

function toOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function isBlankSpaceSubdomain(host?: string | null): boolean {
  const normalized = normalizeDomain(host);
  if (!normalized) return false;
  return normalized.endsWith(BLANK_SPACE_SUFFIX) && normalized !== BLANK_SPACE_SUFFIX.slice(1);
}

export function getCanonicalDomain(options: {
  config?: SystemConfig | null;
  host?: string | null;
}): string | null {
  const { config, host } = options;

  if (config?.canonicalDomain) {
    return config.canonicalDomain;
  }

  if (config?.domains?.customDomain) {
    return config.domains.customDomain;
  }

  if (config?.domains?.blankSubdomain) {
    return config.domains.blankSubdomain;
  }

  const normalizedHost = normalizeDomain(host);
  if (normalizedHost) {
    return normalizedHost;
  }

  if (config?.communityId) {
    const normalizedCommunityId = normalizeDomain(config.communityId);
    if (normalizedCommunityId && normalizedCommunityId.includes(".")) {
      return normalizedCommunityId;
    }
  }

  return null;
}

export function getCanonicalBaseUrl(options: {
  config?: SystemConfig | null;
  host?: string | null;
  fallbackUrl?: string;
}): string {
  const { config, host, fallbackUrl } = options;
  const canonicalDomain = getCanonicalDomain({ config, host });
  const canonicalOrigin = canonicalDomain ? toOrigin(canonicalDomain) : null;

  if (canonicalOrigin) {
    return canonicalOrigin;
  }

  if (fallbackUrl) {
    return toOrigin(fallbackUrl) ?? fallbackUrl.replace(/\/$/, "");
  }

  return "";
}
