import type { SystemConfig } from "@/config";
import { loadSystemConfigById } from "@/config/loaders";
import { resolveAssetUrl } from "@/common/lib/utils/resolveAssetUrl";
import { resolveBaseUrlFromHeaders } from "@/common/lib/utils/resolveBaseUrlFromHeaders";
import { normalizeDomain } from "@/common/lib/utils/domain";
import { DEFAULT_COMMUNITY_ID } from "@/config/loaders";

type HeaderInput = Headers | Record<string, string | string[] | undefined | null>;

function getHeaderValue(headers: HeaderInput | undefined, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const headerRecord = headers as Record<string, string | string[] | undefined | null>;
  const value = headerRecord[name.toLowerCase()] ?? headerRecord[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
}

export type MetadataBranding = {
  baseUrl: string;
  domain: string;
  brandName: string;
  brandDescription: string;
  logoUrl?: string;
  ogImageUrl?: string;
  splashImageUrl?: string;
  systemConfig: SystemConfig;
};

export async function resolveMetadataBranding(headers?: HeaderInput): Promise<MetadataBranding> {
  // Extract domain directly from headers (Edge Runtime compatible)
  // This avoids loadingSystemConfig trying to use next/headers API
  const host = getHeaderValue(headers, "x-detected-domain") ||
               getHeaderValue(headers, "x-vercel-forwarded-host") ||
               getHeaderValue(headers, "x-forwarded-host") ||
               getHeaderValue(headers, "host");
  
  const normalizedDomain = host ? normalizeDomain(host) : null;
  
  const baseUrl = resolveBaseUrlFromHeaders({ headers });
  const domain = normalizedDomain || (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return baseUrl.replace(/^https?:\/\//, "");
    }
  })();
  const isLocalhost = domain === "localhost" || domain === "127.0.0.1";
  const shouldUseDomain = !isLocalhost || !process.env.NEXT_PUBLIC_TEST_COMMUNITY;

  // Use loadSystemConfigById directly to avoid importing loadSystemConfig
  // which would import next/headers (not available in Edge Runtime)
  // For Edge Runtime compatibility, use domain as community ID (legacy fallback)
  // or default community ID if domain is not available
  const communityId = shouldUseDomain && normalizedDomain 
    ? normalizedDomain  // Use domain as community ID (legacy fallback)
    : DEFAULT_COMMUNITY_ID;
  
  const systemConfig = await loadSystemConfigById(communityId);

  return {
    baseUrl,
    domain,
    brandName: systemConfig.brand.displayName,
    brandDescription: systemConfig.brand.description,
    logoUrl:
      resolveAssetUrl(systemConfig.assets.logos.icon, baseUrl) ??
      systemConfig.assets.logos.icon,
    ogImageUrl:
      resolveAssetUrl(systemConfig.assets.logos.og, baseUrl) ??
      systemConfig.assets.logos.og,
    splashImageUrl:
      resolveAssetUrl(systemConfig.assets.logos.splash, baseUrl) ??
      systemConfig.assets.logos.splash,
    systemConfig,
  };
}
