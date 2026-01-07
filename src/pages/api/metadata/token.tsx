import React from "react";
import { NextApiRequest, NextApiResponse } from "next";
import { ImageResponse } from "next/og";
import { resolveMetadataBranding } from "@/common/lib/utils/resolveMetadataBranding";
import { getOgFonts } from "@/common/lib/utils/ogFonts";

export const config = {
  runtime: "edge",
};

interface TokenCardData {
  name: string;
  symbol: string;
  imageUrl: string;
  address: string;
  marketCap: string;
  price: string;
  priceChange: string;
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
  const data: TokenCardData = {
    name: params.get("name") || "",
    symbol: params.get("symbol") || "",
    imageUrl: params.get("imageUrl") || "",
    address: params.get("address") || "",
    marketCap: params.get("marketCap") || "",
    price: params.get("price") || "",
    priceChange: params.get("priceChange") || "",
  };

  const fonts = await getOgFonts();
  const fontFamily = fonts ? "Noto Sans, Noto Sans Symbols 2" : "sans-serif";

  return new ImageResponse(<TokenCard data={data} branding={branding} fontFamily={fontFamily} />, {
    width: 1200,
    height: 630,
    ...(fonts ? { fonts } : {}),
    emoji: "twemoji",
  });
}

const TokenCard = ({
  data,
  branding,
  fontFamily,
}: {
  data: TokenCardData;
  branding: Awaited<ReturnType<typeof resolveMetadataBranding>>;
  fontFamily: string;
}) => {
  const marketCapNumber = Number(data.marketCap);
  const formattedMarketCap = Number.isFinite(marketCapNumber)
    ? `$${marketCapNumber.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : data.marketCap;

  const priceNumber = parseFloat(data.price.replace(/[$,]/g, ""));
  const formattedPrice = Number.isFinite(priceNumber)
    ? `$${priceNumber.toLocaleString(undefined, {
        minimumFractionDigits: priceNumber < 0.01 ? 4 : 2,
        maximumFractionDigits: priceNumber < 0.01 ? 6 : 2,
      })}`
    : data.price;

  const priceChangeNumber = Number(data.priceChange);
  const priceChangeColor = Number.isFinite(priceChangeNumber)
    ? priceChangeNumber >= 0
      ? "green"
      : "red"
    : "white";
  const formattedPriceChange = Number.isFinite(priceChangeNumber)
    ? priceChangeNumber.toFixed(2)
    : data.priceChange;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        background: "black",
        color: "white",
        gap: "32px",
        fontFamily,
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "24px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.75,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} width="36" height="36" />
          ) : null}
          <span>{branding.brandName}</span>
        </div>
        <span>{branding.domain}</span>
      </div>
      {branding.brandDescription ? (
        <div style={{ fontSize: "20px", opacity: 0.7, maxWidth: "800px" }}>
          {branding.brandDescription}
        </div>
      ) : null}
      {data.imageUrl && (
        <img
          src={data.imageUrl}
          width="160"
          height="160"
          style={{ borderRadius: "80px", alignSelf: "center" }}
        />
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          paddingLeft: "111px",
        }}
      >
        <span style={{ fontSize: "56px", fontWeight: "bold" }}>{data.name}</span>
        <span style={{ fontSize: "42px", color: "white" }}>{`$${data.symbol}`}</span>
        <span style={{ fontSize: "28px" }}>
          Price: {formattedPrice}{" "}
          <span style={{ color: priceChangeColor }}>
            {formattedPriceChange}%
          </span>
        </span>
        <span style={{ fontSize: "28px" }}>Address: {data.address}</span>
        <span style={{ fontSize: "28px" }}>Market Cap: {formattedMarketCap}</span>
      </div>
    </div>
  );
};
