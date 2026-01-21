import type { MetadataRoute } from "next";
import { loadSystemConfig } from "@/config";
import { resolveBaseUrl } from "@/common/lib/utils/resolveBaseUrl";
import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";

export const dynamic = "force-dynamic";

type TabOrderFile = {
  tabOrder?: string[];
};

const resolveTabOrder = async (spaceId: string): Promise<string[]> => {
  try {
    const { data, error } = await createSupabaseServerClient()
      .storage
      .from("spaces")
      .download(`${spaceId}/tabOrder`);

    if (error || !data) {
      return [];
    }

    const text = await data.text();
    const parsed = JSON.parse(text) as TabOrderFile;
    const tabs = parsed.tabOrder ?? [];
    return Array.isArray(tabs) ? tabs.filter((tab) => typeof tab === "string" && tab.length > 0) : [];
  } catch (error) {
    console.warn(`Failed to load tabOrder for space ${spaceId}:`, error);
    return [];
  }
};

const buildNavUrls = async (
  baseUrl: string,
  navSlug: "home" | "explore",
  spaceId?: string,
): Promise<string[]> => {
  const urls = [`${baseUrl}/${navSlug}`];
  if (!spaceId) {
    return urls;
  }
  const tabs = await resolveTabOrder(spaceId);
  for (const tab of tabs) {
    urls.push(`${baseUrl}/${navSlug}/${encodeURIComponent(tab)}`);
  }
  return urls;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const systemConfig = await loadSystemConfig();
  const baseUrl = await resolveBaseUrl({ systemConfig });
  const navItems = systemConfig.navigation?.items ?? [];

  const homeItem = navItems.find((item) => item.href === "/home" || item.id === "home");
  const exploreItem = navItems.find((item) => item.href === "/explore" || item.id === "explore");

  const [homeUrls, exploreUrls] = await Promise.all([
    buildNavUrls(baseUrl, "home", homeItem?.spaceId),
    buildNavUrls(baseUrl, "explore", exploreItem?.spaceId),
  ]);

  const lastModified = new Date();
  return [...homeUrls, ...exploreUrls].map((url) => ({
    url,
    lastModified,
  }));
}
