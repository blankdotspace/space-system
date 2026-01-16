import type { SystemConfig } from "@/config";
import { resolveAssetUrl } from "@/common/lib/utils/resolveAssetUrl";

type DefaultMetadataOptions = {
  systemConfig: SystemConfig;
  baseUrl: string;
};

// Config loading is always async (from database)
// Usage: const frame = await getDefaultFrame({ systemConfig, baseUrl });
export async function getDefaultFrame(options: DefaultMetadataOptions) {
  const { systemConfig, baseUrl } = options;
  const ogImageUrl =
    resolveAssetUrl(systemConfig.assets.logos.og, baseUrl) ?? systemConfig.assets.logos.og;
  const splashImageUrl =
    resolveAssetUrl(systemConfig.assets.logos.splash, baseUrl) ??
    systemConfig.assets.logos.splash;
  return {
    version: "next",
    imageUrl: ogImageUrl,
    button: {
      title: systemConfig.brand.displayName,
      action: {
        type: "launch_frame",
        url: baseUrl,
        name: systemConfig.brand.displayName,
        splashImageUrl,
        splashBackgroundColor: "#FFFFFF",
      }
    }
  };
}

export async function getMetadata(options: DefaultMetadataOptions) {
  const { systemConfig, baseUrl } = options;
  return {
    APP_NAME: systemConfig.brand.displayName,
    APP_ICON:
      resolveAssetUrl(systemConfig.assets.logos.icon, baseUrl) ??
      systemConfig.assets.logos.icon,
    APP_SUBTITLE: systemConfig.brand.description,
    APP_BUTTON_TITLE: 'Open Space',
    APP_DESCRIPTION: systemConfig.brand.description,
    APP_TAGS: systemConfig.brand.miniAppTags,
    APP_SPLASH_IMAGE:
      resolveAssetUrl(systemConfig.assets.logos.splash, baseUrl) ??
      systemConfig.assets.logos.splash,
    SPLASH_BACKGROUND_COLOR: '#FFFFFF',
    APP_PRIMARY_CATEGORY: 'social',
    APP_HERO_IMAGE:
      resolveAssetUrl(systemConfig.assets.logos.splash, baseUrl) ??
      systemConfig.assets.logos.splash,
    APP_TAGLINE: systemConfig.brand.description,
    APP_OG_TITLE: systemConfig.brand.displayName,
    APP_OG_DESCRIPTION: systemConfig.brand.description,
    APP_OG_IMAGE:
      resolveAssetUrl(systemConfig.assets.logos.og, baseUrl) ??
      systemConfig.assets.logos.og,
  };
}
