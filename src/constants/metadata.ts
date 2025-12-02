import { WEBSITE_URL } from "@/constants/app";
import { loadSystemConfig } from "@/config";

// Lazy-load config for module-level constants
// These are used in contexts where async isn't possible, so we cache after first load
let cachedConfig: Awaited<ReturnType<typeof loadSystemConfig>> | null = null;

async function getConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }
  cachedConfig = await loadSystemConfig();
  return cachedConfig;
}

// Config loading is always async (from database)
// Usage: const frame = await getDefaultFrame();
export async function getDefaultFrame() {
  const config = await getConfig();
  return {
    version: "next",
    imageUrl: `${WEBSITE_URL}${config.assets.logos.og}`,
    button: {
      title: config.brand.name,
      action: {
        type: "launch_frame",
        url: WEBSITE_URL,
        name: config.brand.displayName,
        splashImageUrl: `${WEBSITE_URL}${config.assets.logos.splash}`,
        splashBackgroundColor: "#FFFFFF",
      }
    }
  };
}

export async function getMetadata() {
  const config = await getConfig();
  return {
    APP_NAME: config.brand.name,
    APP_ICON: `${WEBSITE_URL}${config.assets.logos.icon}`,
    APP_SUBTITLE: config.brand.tagline,
    APP_BUTTON_TITLE: 'Open Space',
    APP_DESCRIPTION: config.brand.description,
    APP_TAGS: config.brand.miniAppTags,
    APP_SPLASH_IMAGE: `${WEBSITE_URL}${config.assets.logos.splash}`,
    SPLASH_BACKGROUND_COLOR: '#FFFFFF',
    APP_PRIMARY_CATEGORY: 'social',
    APP_HERO_IMAGE: `${WEBSITE_URL}${config.assets.logos.splash}`,
    APP_TAGLINE: config.brand.tagline,
    APP_OG_TITLE: config.brand.displayName,
    APP_OG_DESCRIPTION: config.brand.description,
    APP_OG_IMAGE: `${WEBSITE_URL}${config.assets.logos.og}`,
  };
}

// Legacy exports for backward compatibility (will be async)
// These should be migrated to use getDefaultFrame() and getMetadata() instead
export const defaultFrame = getDefaultFrame();
export const metadata = getMetadata();