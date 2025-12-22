import { WEBSITE_URL } from "@/constants/app";
import { getDefaultFrame } from "@/constants/metadata";
import type { Metadata } from "next/types";
import { getChannelMetadata } from "./utils";

const resolveDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return url.replace(/^https?:\/\//, "");
  }
};

const MINI_APP_DOMAIN = resolveDomain(WEBSITE_URL);

const DEFAULT_DESCRIPTION = "Explore Farcaster channel spaces on Nounspace.";
const DEFAULT_IMAGE = `${WEBSITE_URL}/images/nounspace_og_low.png`;
const DEFAULT_SPLASH_IMAGE = `${WEBSITE_URL}/images/nounspace_logo.png`;

const DEFAULT_MINI_APP_METADATA = {
  version: "1" as const,
  imageUrl: DEFAULT_IMAGE,
  button: {
    title: "Open Channel Space",
    action: {
      type: "launch_miniapp" as const,
      name: "Nounspace",
      url: WEBSITE_URL,
      splashImageUrl: DEFAULT_SPLASH_IMAGE,
      splashBackgroundColor: "#FFFFFF",
    },
  },
};

async function buildDefaultMetadata(): Promise<Metadata> {
  const defaultFrame = await getDefaultFrame();
  return {
    title: "Channel | Nounspace",
    description: DEFAULT_DESCRIPTION,
    openGraph: {
      title: "Channel | Nounspace",
      description: DEFAULT_DESCRIPTION,
      url: WEBSITE_URL,
      images: [
        {
          url: DEFAULT_IMAGE,
          width: 1200,
          height: 630,
          alt: "Nounspace channel preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Channel | Nounspace",
      description: DEFAULT_DESCRIPTION,
      images: [DEFAULT_IMAGE],
    },
    other: {
      "fc:frame": JSON.stringify(defaultFrame),
      "fc:miniapp": JSON.stringify(DEFAULT_MINI_APP_METADATA),
      "fc:miniapp:domain": MINI_APP_DOMAIN,
    },
  };
}

const MAX_BUTTON_TITLE_LENGTH = 32;

const truncateButtonTitle = (title: string) =>
  title.length > MAX_BUTTON_TITLE_LENGTH ? `${title.slice(0, MAX_BUTTON_TITLE_LENGTH - 1)}…` : title;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channelId: string; tabName?: string }>;
}): Promise<Metadata> {
  const { channelId, tabName } = await params;
  const defaultMetadata = await buildDefaultMetadata();

  if (!channelId) {
    return defaultMetadata;
  }

  const channel = await getChannelMetadata(channelId);

  if (!channel) {
    return {
      ...defaultMetadata,
      title: `${channelId} | Nounspace`,
      openGraph: {
        ...defaultMetadata.openGraph,
        title: `${channelId} | Nounspace`,
        url: `${WEBSITE_URL}/c/${channelId}`,
      },
      twitter: {
        ...defaultMetadata.twitter,
        title: `${channelId} | Nounspace`,
      },
    };
  }

  const name = channel.name || channel.id;
  const description = channel.description?.trim() || `Farcaster channel /${channel.id} on Nounspace.`;
  const decodedTabName = tabName ? decodeURIComponent(tabName) : undefined;
  const pageUrl = decodedTabName
    ? `${WEBSITE_URL}/c/${channel.id}/${encodeURIComponent(decodedTabName)}`
    : `${WEBSITE_URL}/c/${channel.id}`;

  const buttonTitle = truncateButtonTitle(`Visit ${name}`);
  const frameName = `${name} on Nounspace`;
  const splashImageUrl = DEFAULT_SPLASH_IMAGE;

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

  const ogImageUrl = `${WEBSITE_URL}/api/metadata/channel?${metadataParams.toString()}`;

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

  const miniAppMetadata = {
    version: "1" as const,
    imageUrl: ogImageUrl,
    button: {
      title: buttonTitle,
      action: {
        type: "launch_miniapp" as const,
        name: frameName,
        url: pageUrl,
        splashImageUrl,
        splashBackgroundColor: "#FFFFFF",
      },
    },
  };

  return {
    title: `${name} | Nounspace`,
    description,
    openGraph: {
      title: `${name} | Nounspace`,
      description,
      url: pageUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${name} channel on Nounspace`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | Nounspace`,
      description,
      images: [ogImageUrl],
    },
    other: {
      "fc:frame": JSON.stringify(channelFrame),
      "fc:miniapp": JSON.stringify(miniAppMetadata),
      "fc:miniapp:domain": MINI_APP_DOMAIN,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
