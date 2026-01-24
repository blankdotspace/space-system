import type { SystemConfig } from "@/config";
import { getCanonicalBaseUrl } from "@/common/lib/utils/domain";

type HeaderValue = string | string[] | undefined | null;
type HeaderInput = Headers | Record<string, HeaderValue>;

type ResolveBaseUrlFromHeadersOptions = {
  headers?: HeaderInput;
  systemConfig?: SystemConfig;
  fallbackUrl?: string;
};

type ParsedHost = {
  host: string;
  protocol?: string;
};

function getHeaderValue(headers: HeaderInput | undefined, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const headerRecord = headers as Record<string, HeaderValue>;
  const value = headerRecord[name.toLowerCase()] ?? headerRecord[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
}

function parseHostCandidate(value: string): ParsedHost | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.includes("://")) {
    try {
      const parsed = new URL(trimmed);
      return { host: parsed.host, protocol: parsed.protocol.replace(":", "") };
    } catch {
      return undefined;
    }
  }

  const host = trimmed.split("/")[0]?.trim();
  return host ? { host } : undefined;
}

function isVercelDotCom(host: string): boolean {
  return (
    host === "vercel.com" ||
    host.endsWith(".vercel.com") ||
    host.endsWith(".vercel.app")
  );
}

function normalizeBaseUrl(rawUrl: string): string {
  if (!rawUrl) {
    return "";
  }
  
  const candidate =
    rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : `https://${rawUrl}`;

  try {
    return new URL(candidate).origin;
  } catch {
    // Return empty string instead of hardcoded fallback
    // Caller should handle empty string appropriately
    return "";
  }
}

export function resolveBaseUrlFromHeaders(
  options: ResolveBaseUrlFromHeadersOptions = {},
): string {
  const { headers, systemConfig, fallbackUrl } = options;

  const rawCandidates = [
    getHeaderValue(headers, "x-detected-domain"),
    getHeaderValue(headers, "x-vercel-forwarded-host"),
    getHeaderValue(headers, "x-vercel-deployment-url"),
    getHeaderValue(headers, "x-forwarded-host"),
    getHeaderValue(headers, "host"),
  ].filter((value): value is string => Boolean(value));
  const candidateHosts = rawCandidates
    .flatMap((value) => value.split(","))
    .map((value) => parseHostCandidate(value))
    .filter((value): value is ParsedHost => Boolean(value));
  const selectedHost =
    candidateHosts.find((candidate) => !isVercelDotCom(candidate.host)) ??
    candidateHosts[0];
  const forwardedProto = getHeaderValue(headers, "x-forwarded-proto");

  if (selectedHost?.host) {
    const protocol = forwardedProto
      ? forwardedProto.split(",")[0].trim()
      : selectedHost.protocol
      ? selectedHost.protocol
      : selectedHost.host.includes("localhost") || selectedHost.host.startsWith("127.0.0.1")
      ? "http"
      : "https";
    return normalizeBaseUrl(`${protocol}://${selectedHost.host}`);
  }

  // If we have systemConfig, use its canonical domain (from custom domain mapping or blank subdomain)
  // This ensures we use the correct domain for the community, not an external website URL
  if (systemConfig) {
    const canonicalBaseUrl = getCanonicalBaseUrl({
      config: systemConfig,
      host: selectedHost?.host,
      fallbackUrl,
    });
    if (canonicalBaseUrl) {
      return canonicalBaseUrl;
    }
  }

  if (fallbackUrl) {
    return normalizeBaseUrl(fallbackUrl);
  }

  // NOTE: We intentionally do NOT fall back to WEBSITE_URL env var here because:
  // 1. The app can be accessed from multiple domains (multi-tenant)
  // 2. Community config changes based on which URL is accessing it
  // 3. Using a single hardcoded WEBSITE_URL would give the wrong base URL for other domains
  // 
  // In production, headers should always be available. If they're not, return empty string
  // and let the caller handle it (they should have systemConfig available by then)
  return "";
}
