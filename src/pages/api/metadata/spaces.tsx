import React from "react";

import { NextApiRequest, NextApiResponse } from "next";
import { ImageResponse } from "next/og";
import { toFarcasterCdnUrl } from "@/common/lib/utils/farcasterCdn";
import { resolveMetadataBranding } from "@/common/lib/utils/resolveMetadataBranding";
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

  const branding = await resolveMetadataBranding(req.headers);
  const params = new URLSearchParams(req.url.split("?")[1]);
  const userMetadata: UserMetadata = {
    username: params.get("username") || "",
    displayName: params.get("displayName") || "",
    pfpUrl: params.get("pfpUrl") || "",
    bio: params.get("bio") || "",
  };

  const fonts = await getOgFonts();

  return new ImageResponse(
    <ProfileCard userMetadata={userMetadata} branding={branding} />,
    {
      width: 1200,
      height: 630,
      fonts,
      emoji: "twemoji",
    },
  );
}

const ProfileCard = ({
  userMetadata,
  branding,
}: {
  userMetadata: UserMetadata;
  branding: Awaited<ReturnType<typeof resolveMetadataBranding>>;
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
        fontFamily: "Noto Sans, Noto Sans Symbols 2",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <img
          src={toFarcasterCdnUrl(userMetadata.pfpUrl || "", "anim=false,fit=contain,f=png,w=576")}
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

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 24px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} width="48" height="48" />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "26px", fontWeight: 600 }}>{branding.brandName}</div>
            <div style={{ fontSize: "18px", opacity: 0.6, maxWidth: "360px" }}>
              {branding.brandDescription}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: "20px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.6,
          }}
        >
          {branding.domain}
        </div>
      </div>
    </div>
  );
};
