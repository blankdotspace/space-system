import "server-only";
import { headers } from "next/headers";
import type { SystemConfig } from "@/config";
import { resolveBaseUrlFromHeaders } from "@/common/lib/utils/resolveBaseUrlFromHeaders";

type ResolveBaseUrlOptions = {
  systemConfig?: SystemConfig;
  fallbackUrl?: string;
};

export function resolveBaseUrl(options: ResolveBaseUrlOptions = {}): string {
  const headerStore = headers();
  return resolveBaseUrlFromHeaders({
    headers: headerStore,
    systemConfig: options.systemConfig,
    fallbackUrl: options.fallbackUrl,
  });
}
