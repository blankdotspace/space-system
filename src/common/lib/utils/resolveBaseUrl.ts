import "server-only";
import { headers } from "next/headers";
import type { SystemConfig } from "@/config";
import { resolveBaseUrlFromHeaders } from "@/common/lib/utils/resolveBaseUrlFromHeaders";

type ResolveBaseUrlOptions = {
  systemConfig?: SystemConfig;
  fallbackUrl?: string;
};

export async function resolveBaseUrl(options: ResolveBaseUrlOptions = {}): Promise<string> {
  const headerStore = await headers();
  return resolveBaseUrlFromHeaders({
    headers: headerStore,
    systemConfig: options.systemConfig,
    fallbackUrl: options.fallbackUrl,
  });
}
