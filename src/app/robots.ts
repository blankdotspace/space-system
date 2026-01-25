import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { loadSystemConfig } from "@/config";
import { WEBSITE_URL } from "@/constants/app";
import { getCanonicalBaseUrl, isBlankSpaceSubdomain } from "@/common/lib/utils/domain";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const systemConfig = await loadSystemConfig();
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");

  if (isBlankSpaceSubdomain(host) && systemConfig.domains?.customDomain) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  const baseUrl = getCanonicalBaseUrl({
    config: systemConfig,
    host,
    fallbackUrl: WEBSITE_URL,
  });

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/notifications",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
