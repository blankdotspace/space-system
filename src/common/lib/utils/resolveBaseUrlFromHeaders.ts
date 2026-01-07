import { WEBSITE_URL } from "@/constants/app";
import type { SystemConfig } from "@/config";

type HeaderValue = string | string[] | undefined | null;
type HeaderInput = Headers | Record<string, HeaderValue>;

type ResolveBaseUrlFromHeadersOptions = {
  headers?: HeaderInput;
  systemConfig?: SystemConfig;
  fallbackUrl?: string;
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

function normalizeBaseUrl(rawUrl: string): string {
  const candidate =
    rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : `https://${rawUrl}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return WEBSITE_URL;
  }
}

export function resolveBaseUrlFromHeaders(
  options: ResolveBaseUrlFromHeadersOptions = {},
): string {
  const { headers, systemConfig, fallbackUrl } = options;

  const forwardedHost = getHeaderValue(headers, "x-forwarded-host");
  const host = forwardedHost || getHeaderValue(headers, "host");
  const forwardedProto = getHeaderValue(headers, "x-forwarded-proto");

  if (host) {
    const protocol = forwardedProto
      ? forwardedProto.split(",")[0].trim()
      : host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";
    return normalizeBaseUrl(`${protocol}://${host}`);
  }

  const configWebsite = systemConfig?.community?.urls?.website;
  if (configWebsite) {
    return normalizeBaseUrl(configWebsite);
  }

  if (fallbackUrl) {
    return normalizeBaseUrl(fallbackUrl);
  }

  return normalizeBaseUrl(WEBSITE_URL);
}
