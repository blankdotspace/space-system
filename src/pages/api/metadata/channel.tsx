import React from "react";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { resolveMetadataBranding } from "@/common/lib/utils/resolveMetadataBranding";
import { getOgFonts } from "@/common/lib/utils/ogFonts";

export const config = {
  runtime: "edge",
};

interface ChannelMetadata {
  channelId: string;
  channelName: string;
  description: string;
  imageUrl: string;
  followerCount?: number;
}

const formatFollowerCount = (count?: number) => {
  if (typeof count !== "number" || Number.isNaN(count) || count <= 0) {
    return undefined;
  }

  if (count < 1000) {
    return `${count.toLocaleString()} followers`;
  }

  const units = ["K", "M", "B"] as const;
  let unitIndex = -1;
  let normalized = count;

  while (normalized >= 1000 && unitIndex < units.length - 1) {
    normalized /= 1000;
    unitIndex += 1;
  }

  const rounded = normalized % 1 === 0 ? normalized : normalized.toFixed(1);
  return `${rounded}${units[unitIndex]} followers`;
};

export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branding = await resolveMetadataBranding(req.headers);

  const channelId = searchParams.get("channelId");
  const channelName = searchParams.get("channelName");

  if (!channelId) {
    return new Response("Missing required parameter: channelId", { status: 400 });
  }

  const followerCountParam = searchParams.get("followerCount");
  const followerCount = followerCountParam ? Number(followerCountParam) : undefined;

  const channelMetadata: ChannelMetadata = {
    channelId,
    channelName: channelName || channelId,
    description: searchParams.get("description") || "",
    imageUrl: searchParams.get("imageUrl") || "",
    followerCount: Number.isNaN(followerCount) ? undefined : followerCount,
  };

  const fonts = await getOgFonts();
  const fontFamily = fonts ? "Noto Sans, Noto Sans Symbols 2" : "sans-serif";

  return new ImageResponse(<ChannelCard metadata={channelMetadata} branding={branding} fontFamily={fontFamily} />, {
    width: 1200,
    height: 630,
    ...(fonts ? { fonts } : {}),
    emoji: "twemoji",
  });
}

const ChannelCard = ({
  metadata,
  branding,
  fontFamily,
}: {
  metadata: ChannelMetadata;
  branding: Awaited<ReturnType<typeof resolveMetadataBranding>>;
  fontFamily: string;
}) => {
  const { channelId, channelName, description, imageUrl, followerCount } = metadata;

  const displayName = channelName || channelId || "Channel";
  const formattedFollowers = formatFollowerCount(followerCount);
  const fallbackInitial = displayName.charAt(0).toUpperCase() || "#";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "64px",
        background: "linear-gradient(135deg, #111827, #1f2937)",
        color: "#FFFFFF",
        gap: "40px",
        fontFamily,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", gap: "36px", alignItems: "center" }}>
        <div
          style={{
            width: "180px",
            height: "180px",
            borderRadius: "40px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            fontSize: "88px",
            fontWeight: 700,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              width="180"
              height="180"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ display: "flex" }}>{fallbackInitial}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", fontSize: "32px", opacity: 0.7 }}>Farcaster Channel</div>
          <div style={{ display: "flex", fontSize: "72px", fontWeight: 700 }}>{displayName}</div>
          <div style={{ display: "flex", fontSize: "30px", opacity: 0.8 }}>/{channelId}</div>
          {formattedFollowers ? (
            <div style={{ display: "flex", fontSize: "28px", opacity: 0.75 }}>{formattedFollowers}</div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: "30px",
          lineHeight: 1.4,
          maxWidth: "880px",
          opacity: 0.9,
        }}
      >
        {description || `Join /${channelId} on ${branding.brandName}.`}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginTop: "auto",
          fontSize: "28px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} width="40" height="40" />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span>{branding.brandName}</span>
            <span style={{ fontSize: "18px", opacity: 0.7, textTransform: "none" }}>
              {branding.brandDescription}
            </span>
          </div>
        </div>
        <span>{branding.domain}</span>
      </div>
    </div>
  );
};
