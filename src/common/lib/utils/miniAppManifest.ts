import type { SystemConfig, MiniAppManifestOverrides } from "@/config";
import { resolveAssetUrl } from "@/common/lib/utils/resolveAssetUrl";

export type MiniAppManifest = {
  version: "1";
  name: string;
  homeUrl: string;
  iconUrl: string;
  imageUrl?: string;
  buttonTitle?: string;
  splashImageUrl?: string;
  splashBackgroundColor?: string;
  subtitle?: string;
  description?: string;
  screenshotUrls?: string[];
  primaryCategory?: string;
  tags?: string[];
  heroImageUrl?: string;
  tagline?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  noindex?: boolean;
  requiredChains?: string[];
  requiredCapabilities?: string[];
  canonicalDomain?: string;
};

const MINIAPP_PRIMARY_CATEGORIES = new Set([
  "games",
  "social",
  "finance",
  "utility",
  "productivity",
  "health-fitness",
  "news-media",
  "music",
  "shopping",
  "education",
  "developer-tools",
  "entertainment",
  "art-creativity",
]);

const MAX_NAME_LENGTH = 32;
const MAX_SUBTITLE_LENGTH = 30;
const MAX_DESCRIPTION_LENGTH = 170;
const MAX_TAGLINE_LENGTH = 30;
const MAX_OG_TITLE_LENGTH = 30;
const MAX_OG_DESCRIPTION_LENGTH = 100;
const MAX_BUTTON_TITLE_LENGTH = 32;
const MAX_URL_LENGTH = 1024;
const MAX_TAG_LENGTH = 20;
const MAX_TAGS = 5;
const MAX_SCREENSHOTS = 3;

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? value.slice(0, maxLength) : value;

const sanitizeManifestText = (value?: string, maxLength?: number) => {
  if (!value) return undefined;
  const ascii = value.replace(/[^\x20-\x7E]/g, "");
  const normalized = ascii.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return maxLength ? truncate(normalized, maxLength) : normalized;
};

const normalizeUrl = (value?: string) => {
  if (!value) return undefined;
  return truncate(value.trim(), MAX_URL_LENGTH);
};

const normalizeButtonTitle = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return truncate(trimmed, MAX_BUTTON_TITLE_LENGTH);
};

const normalizePrimaryCategory = (value?: string) => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return MINIAPP_PRIMARY_CATEGORIES.has(normalized) ? normalized : undefined;
};

const normalizeTags = (tags?: string[]) => {
  if (!tags || tags.length === 0) return undefined;
  const normalized = tags
    .map((tag) => tag.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter((tag) => tag.length > 0)
    .map((tag) => truncate(tag, MAX_TAG_LENGTH))
    .slice(0, MAX_TAGS);
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeScreenshots = (urls?: string[]) => {
  if (!urls || urls.length === 0) return undefined;
  const normalized = urls
    .map((url) => url?.trim())
    .filter((url): url is string => !!url)
    .slice(0, MAX_SCREENSHOTS);
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeCanonicalDomain = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const withoutScheme = trimmed.replace(/^https?:\/\//i, "");
  return withoutScheme.split("/")[0]?.split(":")[0] ?? undefined;
};

type BuildMiniAppManifestOptions = {
  systemConfig: SystemConfig;
  baseUrl: string;
  overrides?: MiniAppManifestOverrides;
};

export const buildMiniAppManifest = ({
  systemConfig,
  baseUrl,
  overrides,
}: BuildMiniAppManifestOptions): MiniAppManifest => {
  const resolvedIconUrl =
    resolveAssetUrl(systemConfig.assets.logos.icon, baseUrl) ?? systemConfig.assets.logos.icon;
  const resolvedSplashUrl =
    resolveAssetUrl(systemConfig.assets.logos.splash, baseUrl) ?? systemConfig.assets.logos.splash;
  const resolvedOgUrl =
    resolveAssetUrl(systemConfig.assets.logos.og, baseUrl) ?? systemConfig.assets.logos.og;

  const name = truncate(overrides?.name ?? systemConfig.brand.displayName, MAX_NAME_LENGTH);
  const homeUrl = normalizeUrl(overrides?.homeUrl ?? baseUrl) ?? baseUrl;
  const iconUrl = normalizeUrl(overrides?.iconUrl ?? resolvedIconUrl) ?? resolvedIconUrl;

  const subtitle = sanitizeManifestText(
    overrides?.subtitle ?? systemConfig.brand.description,
    MAX_SUBTITLE_LENGTH,
  );
  const description = sanitizeManifestText(
    overrides?.description ?? systemConfig.brand.description,
    MAX_DESCRIPTION_LENGTH,
  );
  const screenshotUrls = normalizeScreenshots(overrides?.screenshotUrls);
  const primaryCategory = normalizePrimaryCategory(overrides?.primaryCategory);
  const tags = normalizeTags(overrides?.tags ?? systemConfig.brand.miniAppTags);
  const heroImageUrl = normalizeUrl(overrides?.heroImageUrl ?? resolvedOgUrl);
  const tagline = sanitizeManifestText(
    overrides?.tagline ?? systemConfig.brand.description,
    MAX_TAGLINE_LENGTH,
  );
  const ogTitle = sanitizeManifestText(
    overrides?.ogTitle ?? systemConfig.brand.displayName,
    MAX_OG_TITLE_LENGTH,
  );
  const ogDescription = sanitizeManifestText(
    overrides?.ogDescription ?? systemConfig.brand.description,
    MAX_OG_DESCRIPTION_LENGTH,
  );
  const ogImageUrl = normalizeUrl(overrides?.ogImageUrl ?? resolvedOgUrl);
  const imageUrl = normalizeUrl(overrides?.imageUrl);
  const buttonTitle = normalizeButtonTitle(overrides?.buttonTitle);
  const canonicalDomain = normalizeCanonicalDomain(overrides?.canonicalDomain);

  const manifest: MiniAppManifest = {
    version: "1",
    name,
    homeUrl,
    iconUrl,
    ...(overrides?.splashImageUrl || resolvedSplashUrl
      ? { splashImageUrl: normalizeUrl(overrides?.splashImageUrl ?? resolvedSplashUrl) }
      : {}),
    ...(overrides?.splashBackgroundColor
      ? { splashBackgroundColor: overrides.splashBackgroundColor }
      : { splashBackgroundColor: "#FFFFFF" }),
    ...(subtitle ? { subtitle } : {}),
    ...(description ? { description } : {}),
    ...(screenshotUrls ? { screenshotUrls } : {}),
    ...(primaryCategory ? { primaryCategory } : {}),
    ...(tags ? { tags } : {}),
    ...(heroImageUrl ? { heroImageUrl } : {}),
    ...(tagline ? { tagline } : {}),
    ...(ogTitle ? { ogTitle } : {}),
    ...(ogDescription ? { ogDescription } : {}),
    ...(ogImageUrl ? { ogImageUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(buttonTitle ? { buttonTitle } : {}),
    ...(typeof overrides?.noindex === "boolean" ? { noindex: overrides.noindex } : {}),
    ...(overrides?.requiredChains && overrides.requiredChains.length > 0
      ? { requiredChains: overrides.requiredChains }
      : {}),
    ...(overrides?.requiredCapabilities && overrides.requiredCapabilities.length > 0
      ? { requiredCapabilities: overrides.requiredCapabilities }
      : {}),
    ...(canonicalDomain ? { canonicalDomain } : {}),
  };

  return manifest;
};
