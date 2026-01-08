import { getDefaultFrame } from "@/constants/metadata";
import type { Metadata } from "next/types";
import { getChannelMetadata } from "./utils";
import { loadSystemConfig, type SystemConfig } from "@/config";
import { resolveBaseUrl } from "@/common/lib/utils/resolveBaseUrl";
import { resolveAssetUrl } from "@/common/lib/utils/resolveAssetUrl";
import { buildMiniAppEmbed, truncateMiniAppButtonTitle } from "@/common/lib/utils/miniAppEmbed";
import { resolveMiniAppDomain } from "@/common/lib/utils/miniAppDomain";

async function buildDefaultMetadata(
  systemConfig: SystemConfig,
  baseUrl: string,
  brandName: string,
  miniAppDomain: string,
  defaultImage: string,
  defaultSplashImage: string,
): Promise<Metadata> {
  const defaultFrame = await getDefaultFrame({ systemConfig, baseUrl });
  const defaultDescription = `Explore Farcaster channel spaces on ${brandName}.`;
  const defaultMiniAppMetadata = buildMiniAppEmbed({
    imageUrl: defaultImage,
    buttonTitle: "Open Channel Space",
    actionUrl: baseUrl,
    actionName: brandName,
    splashImageUrl: defaultSplashImage,
  });

  return {
    title: `Channel | ${brandName}`,
    description: defaultDescription,
    openGraph: {
      title: `Channel | ${brandName}`,
      description: defaultDescription,
      url: baseUrl,
      images: [
        {
          url: defaultImage,
          width: 1200,
          height: 630,
          alt: `${brandName} channel preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Channel | ${brandName}`,
      description: defaultDescription,
      images: [defaultImage],
    },
    other: {
      "fc:frame": JSON.stringify(defaultFrame),
      "fc:miniapp": JSON.stringify(defaultMiniAppMetadata),
      "fc:miniapp:domain": miniAppDomain,
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channelId: string; tabName?: string }>;
}): Promise<Metadata> {
  const systemConfig = await loadSystemConfig();
  const baseUrl = await resolveBaseUrl({ systemConfig });
  const brandName = systemConfig.brand.displayName;
  const miniAppDomain = resolveMiniAppDomain(baseUrl);
  const defaultImage =
    resolveAssetUrl(systemConfig.assets.logos.og, baseUrl) ?? systemConfig.assets.logos.og;
  const defaultSplashImage =
    resolveAssetUrl(systemConfig.assets.logos.splash, baseUrl) ??
    systemConfig.assets.logos.splash;
  const { channelId, tabName } = await params;
  const defaultMetadata = await buildDefaultMetadata(
    systemConfig,
    baseUrl,
    brandName,
    miniAppDomain,
    defaultImage,
    defaultSplashImage,
  );

  if (!channelId) {
    return defaultMetadata;
  }

  const channel = await getChannelMetadata(channelId);

  if (!channel) {
    return {
      ...defaultMetadata,
      title: `${channelId} | ${brandName}`,
      openGraph: {
        ...defaultMetadata.openGraph,
        title: `${channelId} | ${brandName}`,
        url: `${baseUrl}/c/${channelId}`,
      },
      twitter: {
        ...defaultMetadata.twitter,
        title: `${channelId} | ${brandName}`,
      },
    };
  }

  const name = channel.name || channel.id;
  const description =
    channel.description?.trim() || `Farcaster channel /${channel.id} on ${brandName}.`;
  const decodedTabName = tabName ? decodeURIComponent(tabName) : undefined;
  const pageUrl = decodedTabName
    ? `${baseUrl}/c/${channel.id}/${encodeURIComponent(decodedTabName)}`
    : `${baseUrl}/c/${channel.id}`;

  const buttonTitle = truncateMiniAppButtonTitle(`Visit ${name}`);
  const frameName = `${name} on ${brandName}`;
  const splashImageUrl = defaultSplashImage;

  const metadataParams = new URLSearchParams({
    channelId: channel.id,
    channelName: name,
  });

  if (description) {
    metadataParams.set("description", description);
  }

  if (channel.image_url) {
    metadataParams.set("imageUrl", channel.image_url);
  }

  if (typeof channel.follower_count === "number") {
    metadataParams.set("followerCount", channel.follower_count.toString());
  }

  const ogImageUrl = `${baseUrl}/api/metadata/channel?${metadataParams.toString()}`;

  const channelFrame = {
    version: "next" as const,
    imageUrl: ogImageUrl,
    button: {
      title: buttonTitle,
      action: {
        type: "launch_frame" as const,
        url: pageUrl,
        name: frameName,
        splashImageUrl,
        splashBackgroundColor: "#FFFFFF",
      },
    },
  };

  const miniAppMetadata = buildMiniAppEmbed({
    imageUrl: ogImageUrl,
    buttonTitle,
    actionUrl: pageUrl,
    actionName: frameName,
    splashImageUrl,
  });

  return {
    title: `${name} | ${brandName}`,
    description,
    openGraph: {
      title: `${name} | ${brandName}`,
      description,
      url: pageUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${name} channel on ${brandName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | ${brandName}`,
      description,
      images: [ogImageUrl],
    },
    other: {
      "fc:frame": JSON.stringify(channelFrame),
      "fc:miniapp": JSON.stringify(miniAppMetadata),
      "fc:miniapp:domain": miniAppDomain,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
