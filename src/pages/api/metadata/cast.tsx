import React from "react";
import { NextApiRequest, NextApiResponse } from "next";
import { ImageResponse } from "next/og";
import { toFarcasterCdnUrl } from "@/common/lib/utils/farcasterCdn";
import { resolveMetadataBranding } from "@/common/lib/utils/resolveMetadataBranding";

export const config = {
  runtime: "edge",
};

interface CastCardData {
  username: string;
  displayName: string;
  pfpUrl: string;
  text: string;
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
  const data: CastCardData = {
    username: params.get("username") || "",
    displayName: params.get("displayName") || "",
    pfpUrl: params.get("pfpUrl") || "",
    text: params.get("text") || "",
  };

  return new ImageResponse(<CastCard data={data} branding={branding} />, {
    width: 1200,
    height: 630,
  });
}

const CastCard = ({
  data,
  branding,
}: {
  data: CastCardData;
  branding: Awaited<ReturnType<typeof resolveMetadataBranding>>;
}) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      padding: "40px",
      display: "flex",
      flexDirection: "column",
      background: "white",
      fontFamily: "Arial, sans-serif",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
      {data.pfpUrl && (
        <img
          src={toFarcasterCdnUrl(data.pfpUrl || "")}
          width="120"
          height="120"
          style={{ borderRadius: "60px" }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: "48px", fontWeight: "bold" }}>{data.displayName}</span>
        <span style={{ fontSize: "36px", color: "#555" }}>@{data.username}</span>
      </div>
    </div>
    <p
      style={{
        fontSize: "40px",
        marginTop: "40px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {data.text}
    </p>
    <div
      style={{
        marginTop: "auto",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "20px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        opacity: 0.7,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {branding.logoUrl ? <img src={branding.logoUrl} width="30" height="30" /> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span>{branding.brandName}</span>
          <span style={{ fontSize: "16px", opacity: 0.7, textTransform: "none" }}>
            {branding.brandDescription}
          </span>
        </div>
      </div>
      <span>{branding.domain}</span>
    </div>
  </div>
);
