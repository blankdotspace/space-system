'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { nounsPublicClient, NOUNS_IMAGE_SOURCE, NOUNS_TOKEN_ADDRESS } from "./config";
import { NounsTokenAbi } from "./abis";

type Props = {
  nounId: bigint | number;
  className?: string;
  priority?: boolean;
};

const resolveTokenUriImage = async (nounId: bigint) => {
  try {
    const tokenUri = await nounsPublicClient.readContract({
      address: NOUNS_TOKEN_ADDRESS,
      abi: NounsTokenAbi,
      functionName: "tokenURI",
      args: [nounId],
    });

    if (typeof tokenUri !== "string") return null;

    if (tokenUri.startsWith("data:application/json;base64,")) {
      const [, base64] = tokenUri.split(",");
      const json = JSON.parse(atob(base64));
      if (typeof json.image === "string") {
        return json.image as string;
      }
    }

    if (tokenUri.startsWith("data:application/json;utf8,")) {
      const json = JSON.parse(tokenUri.split(",")[1] ?? "{}");
      if (typeof json.image === "string") {
        return json.image as string;
      }
    }

    return tokenUri;
  } catch (error) {
    console.warn("Failed to load Noun tokenURI, falling back to noun.pics", error);
    // Fallback to a fast CDN image if on-chain data-uri fails
    return nounPicsUrl(nounId);
  }
};

// Use SVG from noun.pics for crisp pixel art at any size.
const nounPicsUrl = (nounId: bigint) => `https://noun.pics/${nounId.toString()}.svg`;

const cloudNounsUrl = (nounId: bigint) =>
  `https://api.cloudnouns.com/v1/pfp?seed=${nounId.toString()}&background=0`;

const NounImage: React.FC<Props> = ({ nounId, className, priority }) => {
  const nounIdBigInt = BigInt(nounId);

  const { data: tokenImage, isLoading } = useQuery({
    queryKey: ["noun-image", nounIdBigInt.toString(), NOUNS_IMAGE_SOURCE],
    queryFn: async () => {
      switch (NOUNS_IMAGE_SOURCE) {
        case "noun.pics":
          return nounPicsUrl(nounIdBigInt);
        case "cloudnouns":
          return cloudNounsUrl(nounIdBigInt);
        case "tokenURI":
        default:
          return resolveTokenUriImage(nounIdBigInt);
      }
    },
    staleTime: 1000 * 60 * 60,
  });

  const alt = `Noun ${nounIdBigInt.toString()}`;

  if (isLoading || !tokenImage) {
    return (
      <img
        src="/media/noun-loading-skull.gif"
        alt="Loading Noun artwork"
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  const isDataUri = tokenImage.startsWith("data:");

  return (
    <img
      src={tokenImage}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      aria-hidden={false}
      style={{ imageRendering: isDataUri ? "pixelated" : "auto" }}
    />
  );
};

export default NounImage;
