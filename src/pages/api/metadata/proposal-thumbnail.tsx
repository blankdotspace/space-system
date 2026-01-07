import React from "react";
import { NextApiRequest, NextApiResponse } from "next";
import { ImageResponse } from "next/og";
import { resolveMetadataBranding } from "@/common/lib/utils/resolveMetadataBranding";

export const config = {
  runtime: "edge",
};

interface ProposalCardData {
  id: string;
  title: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  timeRemaining: string;
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
  const data: ProposalCardData = {
    id: params.get("id") || "Unknown",
    title: params.get("title") || "Unknown Proposal",
    forVotes: params.get("forVotes") || "0",
    againstVotes: params.get("againstVotes") || "0",
    abstainVotes: params.get("abstainVotes") || "0",
    quorumVotes: params.get("quorumVotes") || "100",
    timeRemaining: params.get("timeRemaining") || "",
  };

  return new ImageResponse(<ProposalCard data={data} branding={branding} />, {
    width: 1200,
    height: 630,
  });
}

const ProposalCard = ({
  data,
  branding,
}: {
  data: ProposalCardData;
  branding: Awaited<ReturnType<typeof resolveMetadataBranding>>;
}) => {
  // Simple vote formatting
  const formatVotes = (votes: string) => {
    const num = Number(votes) || 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Progress bar calculations  
  const forVotes = Number(data.forVotes) || 0;
  const againstVotes = Number(data.againstVotes) || 0;
  const totalVotes = forVotes + againstVotes;
  const forPercent = totalVotes > 0 ? Math.round((forVotes / totalVotes) * 100) : 0;
  const againstPercent = totalVotes > 0 ? Math.round((againstVotes / totalVotes) * 100) : 0;
  const forWidth = forPercent.toString() + "%";
  const againstWidth = againstPercent.toString() + "%";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        gap: "32px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "22px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} width="36" height="36" />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span>{branding.brandName}</span>
            <span style={{ fontSize: "16px", opacity: 0.8, textTransform: "none" }}>
              {branding.brandDescription}
            </span>
          </div>
        </div>
        <span>{branding.domain}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          paddingLeft: "111px",
        }}
      >
        <span style={{ fontSize: "67px", fontWeight: "900" }}>Prop {data.id}</span>
        <span style={{ fontSize: "50px", fontWeight: "900", color: "white" }}>{data.title}</span>
        <span style={{ fontSize: "34px", fontWeight: "900" }}>
          For: {formatVotes(data.forVotes)} | 
          Against: {formatVotes(data.againstVotes)} | 
          Abstain: {formatVotes(data.abstainVotes)}
        </span>
        <span style={{ fontSize: "29px", fontWeight: "900" }}>Quorum: {formatVotes(data.quorumVotes)}</span>
        {data.timeRemaining && (
          <span style={{ fontSize: "24px", fontWeight: "700", opacity: 0.9 }}>
            {data.timeRemaining}
          </span>
        )}
      </div>

      <div style={{
        width: "70%",
        height: "20px",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: "10px",
        marginTop: "20px",
        marginLeft: "111px",
        display: "flex",
      }}>
        <div style={{
          width: againstWidth,
          height: "100%",
          backgroundColor: "#ef4444",
        }} />
        <div style={{
          width: forWidth,
          height: "100%",
          backgroundColor: "#10b981",
        }} />
      </div>
    </div>
  );
};
