import React from "react";
import { NextApiRequest, NextApiResponse } from "next";
import { ImageResponse } from "next/og";
import { toFarcasterCdnUrl } from "@/common/lib/utils/farcasterCdn";
import { getOgFonts } from "@/common/lib/utils/ogFonts";

export const config = {
  runtime: "edge",
};

interface CastCardData {
  username: string;
  displayName: string;
  pfpUrl: string;
  text: string;
  imageUrl?: string;
}

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<ImageResponse | string>,
) {
  if (!req.url) {
    return res.status(404).send("Url not found");
  }

  const params = new URLSearchParams(req.url.split("?")[1]);
  const data: CastCardData = {
    username: params.get("username") || "",
    displayName: params.get("displayName") || "",
    pfpUrl: params.get("pfpUrl") || "",
    text: params.get("text") || "",
    imageUrl: params.get("imageUrl") || "",
  };

  const fonts = await getOgFonts();
  const fontFamily = fonts ? "Noto Sans, Noto Sans Symbols 2" : "sans-serif";

  return new ImageResponse(<CastCard data={data} fontFamily={fontFamily} />, {
    width: 1200,
    height: 630,
    ...(fonts ? { fonts } : {}),
    emoji: "twemoji",
  });
}

const MAX_TEXT_WITH_IMAGE = 200;
const MAX_TEXT_NO_IMAGE = 320;
const TOP_TEXT_LIMIT = 120;
const MIN_TOP_TEXT = 60;

const truncateCastText = (text: string, hasImage: boolean) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  const limit = hasImage ? MAX_TEXT_WITH_IMAGE : MAX_TEXT_NO_IMAGE;
  if (trimmed.length <= limit) {
    return trimmed;
  }
  const ellipsis = "...";
  const sliceLimit = Math.max(0, limit - ellipsis.length);
  return `${trimmed.slice(0, sliceLimit)}${ellipsis}`;
};

const splitCastText = (text: string) => {
  if (!text) {
    return { topText: "", sideText: "" };
  }
  if (text.length <= TOP_TEXT_LIMIT) {
    return { topText: text, sideText: "" };
  }
  const breakIndex = text.lastIndexOf(" ", TOP_TEXT_LIMIT);
  const splitIndex = breakIndex >= MIN_TOP_TEXT ? breakIndex : TOP_TEXT_LIMIT;
  return {
    topText: text.slice(0, splitIndex).trim(),
    sideText: text.slice(splitIndex).trim(),
  };
};

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

const CastCard = ({
  data,
  fontFamily,
}: {
  data: CastCardData;
  fontFamily: string;
}) => {
  const hasImage = Boolean(data.imageUrl);
  const displayText = truncateCastText(data.text, hasImage);
  const { topText, sideText } = hasImage ? splitCastText(displayText) : { topText: displayText, sideText: "" };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        background: "white",
        fontFamily,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {data.pfpUrl && (
          <img
            src={resolveOgAvatarUrl(data.pfpUrl || "")}
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

      {hasImage ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "32px",
            flex: 1,
          }}
        >
          {topText ? (
            <div
              style={{
                fontSize: "40px",
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {topText}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "24px",
              marginTop: topText ? "16px" : "0px",
              flex: 1,
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                flex: 1,
                maxWidth: "520px",
                fontSize: "40px",
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {sideText}
            </div>
            <img
              src={data.imageUrl}
              width="576"
              height="288"
              style={{
                marginLeft: "auto",
                borderRadius: "24px",
                objectFit: "cover",
              }}
            />
          </div>
        </div>
      ) : (
        <p
          style={{
            fontSize: "40px",
            marginTop: "40px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {displayText}
        </p>
      )}
    </div>
  );
};
