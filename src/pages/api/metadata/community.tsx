import React from "react";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { resolveMetadataBranding } from "@/common/lib/utils/resolveMetadataBranding";
import { getOgFonts } from "@/common/lib/utils/ogFonts";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  const branding = await resolveMetadataBranding(req.headers);
  const fonts = await getOgFonts();

  return new ImageResponse(<CommunityCard branding={branding} />, {
    width: 1200,
    height: 630,
    fonts,
    emoji: "twemoji",
  });
}

const CommunityCard = ({
  branding,
}: {
  branding: Awaited<ReturnType<typeof resolveMetadataBranding>>;
}) => {
  const fallbackInitial = branding.brandName?.charAt(0).toUpperCase() || "C";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "64px",
        background: "linear-gradient(135deg, #0f172a, #1f2937)",
        color: "#FFFFFF",
        gap: "36px",
        fontFamily: "Noto Sans, Noto Sans Symbols 2",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        {branding.logoUrl ? (
          <img src={branding.logoUrl} width="140" height="140" />
        ) : (
          <div
            style={{
              width: "140px",
              height: "140px",
              borderRadius: "32px",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "72px",
              fontWeight: 700,
            }}
          >
            {fallbackInitial}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "72px", fontWeight: 700 }}>{branding.brandName}</div>
          <div style={{ fontSize: "30px", opacity: 0.9, maxWidth: "840px" }}>
            {branding.brandDescription}
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: "auto",
          fontSize: "26px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        {branding.domain}
      </div>
    </div>
  );
};
