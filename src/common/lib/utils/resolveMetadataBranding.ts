import type { SystemConfig } from "@/config";
import { loadSystemConfig } from "@/config";
import { resolveAssetUrl } from "@/common/lib/utils/resolveAssetUrl";
import { resolveBaseUrlFromHeaders } from "@/common/lib/utils/resolveBaseUrlFromHeaders";

type HeaderInput = Headers | Record<string, string | string[] | undefined | null>;

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
  const baseUrl = resolveBaseUrlFromHeaders({ headers });
  const domain = (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return baseUrl.replace(/^https?:\/\//, "");
    }
  })();
  const isLocalhost = domain === "localhost" || domain === "127.0.0.1";
  const shouldUseDomain = !isLocalhost || !process.env.NEXT_PUBLIC_TEST_COMMUNITY;

  const systemConfig = await loadSystemConfig(
    shouldUseDomain && domain ? { domain } : undefined,
  );

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
