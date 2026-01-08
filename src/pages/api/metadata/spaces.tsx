import React from "react";

import { NextApiRequest, NextApiResponse } from "next";
import { ImageResponse } from "next/og";
import { toFarcasterCdnUrl } from "@/common/lib/utils/farcasterCdn";
import { getOgFonts } from "@/common/lib/utils/ogFonts";

export const config = {
  runtime: "edge",
};

interface UserMetadata {
  username: string;
  displayName: string;
  pfpUrl: string;
  bio: string;
}

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<ImageResponse | string>,
) {
  if (!req.url) {
    return res.status(404).send("Url not found");
  }

  const params = new URLSearchParams(req.url.split("?")[1]);
  const userMetadata: UserMetadata = {
    username: params.get("username") || "",
    displayName: params.get("displayName") || "",
    pfpUrl: params.get("pfpUrl") || "",
    bio: params.get("bio") || "",
  };

  const fonts = await getOgFonts();
  const fontFamily = fonts ? "Noto Sans, Noto Sans Symbols 2" : "sans-serif";

  return new ImageResponse(
    <ProfileCard userMetadata={userMetadata} fontFamily={fontFamily} />,
    {
      width: 1200,
      height: 630,
      ...(fonts ? { fonts } : {}),
      emoji: "twemoji",
    },
  );
}

const resolveOgAvatarUrl = (url: string): string => {
  if (!url) return url;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.endsWith("imagedelivery.net")) {
      return url;
    }
  } catch {
    return url;
  }
  return toFarcasterCdnUrl(url, "anim=false,fit=contain,f=png,w=576");
};

const ProfileCard = ({
  userMetadata,
  fontFamily,
}: {
  userMetadata: UserMetadata;
  fontFamily: string;
}) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        background: "white",
        gap: "24px",
        fontFamily,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <img
          src={resolveOgAvatarUrl(userMetadata.pfpUrl || "")}
          width={"180px"}
          height={"180px"}
          style={{ borderRadius: "300px" }}
        />
        <p
          style={{
            fontSize: "64px",
            fontWeight: "bold",
          }}
        >
          @{userMetadata.username}
        </p>
        <div
          style={{
            fontSize: "22px",
            display: "flex",
            textAlign: "center",
            maxWidth: "600px",
          }}
        >
          {userMetadata.bio}
        </div>
      </div>
    </div>
  );
};
