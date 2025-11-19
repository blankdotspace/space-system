import { WEBSITE_URL } from "@/constants/app";
import { merge } from "lodash";
import { Metadata } from "next";

export type UserMetadata = {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  walletAddress?: string;
};

export const getUserMetadataStructure = (
  userMetadata: UserMetadata,
): Metadata => {
  if (!userMetadata) {
    return {};
  }

  const { username, displayName, pfpUrl, bio } = userMetadata;

  const title = `${displayName} (@${username}) on Nounspace`;
  const spaceUrl = `https://nounspace.com/s/${username}`;

  const encodedDisplayName = encodeURIComponent(displayName || "");
  const encodedPfpUrl = encodeURIComponent(pfpUrl || "");
  const encodedBio = encodeURIComponent(bio || "");

  const ogImageUrl = `${WEBSITE_URL}/api/metadata/spaces?username=${username}&displayName=${encodedDisplayName}&pfpUrl=${encodedPfpUrl}&bio=${encodedBio}`;
  const ogImage = {
    url: ogImageUrl,
    width: 1200,
    height: 630,
  };

  const metadata: Metadata = {
    title,
    openGraph: {
      title,
      url: spaceUrl,
      images: [ogImage],
    },
    twitter: {
      title,
      site: "https://nounspace.com/",
      images: [ogImage],
      card: "summary_large_image",
    },
  };

  if (bio) {
    merge(metadata, {
      description: bio,
      openGraph: {
        description: bio,
      },
      twitter: {
        description: bio,
      },
    });
  }



  return metadata;
};
