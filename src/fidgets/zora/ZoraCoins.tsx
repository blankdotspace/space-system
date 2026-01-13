"use client";

import React, { useEffect, useState, useRef } from "react";
import TextInput from "@/common/components/molecules/TextInput";
import { FidgetArgs, FidgetModule, FidgetProperties, FidgetSettingsStyle } from "@/common/fidgets";
import { defaultStyleFields, WithMargin, ErrorWrapper } from "@/fidgets/helpers";
import { BsCoin } from "react-icons/bs";
import { TradeModal } from "./TradeModal";

export type ZoraCoinsFidgetSettings = {
  coinContract?: string;
  creatorContract?: string;
  displayMode: "single" | "creator";
} & FidgetSettingsStyle;

const zoraCoinsProperties: FidgetProperties = {
  fidgetName: "Zora Coins",
  icon: 0x1fa99, // 🪙
  fields: [
    {
      fieldName: "displayMode",
      displayName: "Display Mode",
      displayNameHint: "Choose whether to display a single coin or all coins from a creator",
      default: "single",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="single"
                checked={props.value === "single"}
                onChange={(e) => props.onChange(e.target.value)}
              />
              Content Coin
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="creator"
                checked={props.value === "creator"}
                onChange={(e) => props.onChange(e.target.value)}
              />
              Creator&apos;s Coins
            </label>
          </div>
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "coinContract",
      displayName: "Coin Contract Address",
      displayNameHint: "Enter the contract address of the Zora coin you want to display",
      default: "0xb560c74b8c9ddffcdf171f7a45c6632b8093fe1b",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} placeholder="0x..." />
        </WithMargin>
      ),
      group: "settings",
      disabledIf: (settings) => settings.displayMode === "creator",
    },
    {
      fieldName: "creatorContract",
      displayName: "Creator Contract Address",
      displayNameHint: "Enter the creator's contract address to display all their coins",
      default: "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} placeholder="0x..." />
        </WithMargin>
      ),
      group: "settings",
      disabledIf: (settings) => settings.displayMode === "single",
    },
    ...defaultStyleFields,
  ],
  size: {
    minHeight: 1,
    maxHeight: 12,
    minWidth: 1,
    maxWidth: 12,
  },
};

interface CoinData {
  address: string;
  name: string;
  symbol: string;
  marketCap: string;
  tokenPrice: {
    priceInUsdc: string;
  };
  mediaContent?: {
    originalUri: string;
    mimeType: string;
    videoPreviewUrl?: string;
    videoHlsUrl?: string;
    previewImage?: {
      small?: string;
      medium?: string;
    };
  };
  creatorProfile?: {
    handle?: string;
    avatarUrl?: string;
  };
}

const detectMimeType = (uri: string, providedMimeType?: string): string => {
  if (providedMimeType && providedMimeType !== "application/octet-stream" && !providedMimeType.includes("image")) {
    return providedMimeType;
  }

  const url = uri.toLowerCase();

  if (
    url.includes(".mp4") ||
    url.includes(".webm") ||
    url.includes(".mov") ||
    url.includes(".avi") ||
    url.includes(".m4v")
  ) {
    return "video/mp4";
  }

  if (
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".png") ||
    url.includes(".gif") ||
    url.includes(".webp")
  ) {
    return "image/jpeg";
  }

  if (uri.startsWith("ipfs://") || uri.startsWith("ipfs:/")) {
    return "video/mp4";
  }

  return providedMimeType || "image/jpeg";
};

const getBestVideoUrl = (mediaContent: any): { url: string; type: "cloudflare" | "hls" | "ipfs" } => {
  if (mediaContent.videoPreviewUrl?.includes("cloudflarestream.com")) {
    const videoId = mediaContent.videoPreviewUrl.split("/").slice(-2, -1)[0];
    const baseUrl = mediaContent.videoPreviewUrl.split("/").slice(0, 3).join("/");
    return { url: `${baseUrl}/${videoId}/iframe`, type: "cloudflare" };
  }

  if (mediaContent.videoHlsUrl) {
    return { url: mediaContent.videoHlsUrl, type: "hls" };
  }

  return { url: formatIpfsUri(mediaContent.originalUri), type: "ipfs" };
};

const formatIpfsUri = (uri: string): string => {
  if (!uri) return uri;

  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs://", "");
    return `https://ipfs.io/ipfs/${cid}`;
  }

  if (uri.startsWith("ipfs:/") && !uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs:/", "");
    return `https://ipfs.io/ipfs/${cid}`;
  }

  return uri;
};

const ZoraCoins: React.FC<FidgetArgs<ZoraCoinsFidgetSettings>> = ({ settings }) => {
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const fetchCoinData = async () => {
      if (settings.displayMode === "single" && !settings.coinContract) {
        setError("Please enter a coin contract address");
        return;
      }

      if (settings.displayMode === "creator" && !settings.creatorContract) {
        setError("Please enter a creator contract address");
        return;
      }

      setLoading(true);
      setError(null);
      setVideoError(false);
      setIsVideoPlaying(false);

      try {
        if (settings.displayMode === "single" && settings.coinContract) {
          // Use server-side API route to keep API key secure
          const response = await fetch(`/api/zora/coin?address=${settings.coinContract}&chain=8453`);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          const token = data?.zora20Token;

          if (token) {
            setCoinData({
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              marketCap: token.marketCap || "0",
              tokenPrice: {
                priceInUsdc: token.tokenPrice?.priceInUsdc || "0",
              },
              mediaContent: token.mediaContent
                ? {
                    originalUri: token.mediaContent.originalUri,
                    mimeType: detectMimeType(token.mediaContent.originalUri, token.mediaContent.mimeType),
                    videoPreviewUrl: token.mediaContent.videoPreviewUrl,
                    videoHlsUrl: token.mediaContent.videoHlsUrl,
                    previewImage: token.mediaContent.previewImage,
                  }
                : undefined,
              creatorProfile: token.creatorProfile
                ? {
                    handle: token.creatorProfile.handle || undefined,
                    avatarUrl: token.creatorProfile.avatar?.previewImage?.medium || undefined,
                  }
                : undefined,
            });
          } else {
            setError("Coin not found");
          }
        } else if (settings.displayMode === "creator" && settings.creatorContract) {
          const response = await fetch(`/api/zora/coin?address=${settings.creatorContract}&chain=8453`);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          const token = data?.zora20Token;

          if (token) {
            setCoinData({
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              marketCap: token.marketCap || "0",
              tokenPrice: {
                priceInUsdc: token.tokenPrice?.priceInUsdc || "0",
              },
              mediaContent: token.mediaContent
                ? {
                    originalUri: token.mediaContent.originalUri,
                    mimeType: detectMimeType(token.mediaContent.originalUri, token.mediaContent.mimeType),
                    videoPreviewUrl: token.mediaContent.videoPreviewUrl,
                    videoHlsUrl: token.mediaContent.videoHlsUrl,
                    previewImage: token.mediaContent.previewImage,
                  }
                : undefined,
              creatorProfile: token.creatorProfile
                ? {
                    handle: token.creatorProfile.handle || undefined,
                    avatarUrl: token.creatorProfile.avatar?.previewImage?.medium || undefined,
                  }
                : undefined,
            });
          } else {
            setError("Creator coin not found");
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to fetch coin data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCoinData();
  }, [settings.coinContract, settings.creatorContract, settings.displayMode]);

  const handleTrade = () => {
    setIsTradeModalOpen(true);
  };

  const videoData = coinData?.mediaContent ? getBestVideoUrl(coinData.mediaContent) : null;
  const isVideo = coinData?.mediaContent?.mimeType?.startsWith("video/") && videoData?.url;

  if (loading) {
    return (
      <div
        style={{
          background: settings.background,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Media Skeleton */}
        <div className="relative flex-1 min-h-0 bg-gray-200 animate-pulse" />

        {/* Info Section Skeleton */}
        <div className="p-4 space-y-3 bg-white border-t">
          {/* Name & Symbol Skeleton */}
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
            </div>
          </div>

          {/* Market Data Skeleton */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
            </div>
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-24" />
            </div>
          </div>

          {/* Button Skeleton */}
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorWrapper icon="🪙" message={error} />;
  }

  if (!coinData) {
    return <ErrorWrapper icon="🪙" message="Enter a coin contract address to display coin information" />;
  }

  // Creator mode: Show 3D spinning coin
  if (settings.displayMode === "creator") {
    const coinImage =
      coinData.mediaContent?.previewImage?.medium ||
      coinData.mediaContent?.previewImage?.small ||
      formatIpfsUri(coinData.mediaContent?.originalUri || "");

    return (
      <>
        <div
          style={{
            background: settings.background,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            perspective: "1000px",
            cursor: "pointer",
            position: "relative",
          }}
          onClick={handleTrade}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            style={{
              position: "relative",
              width: "min(80%, 80vh)",
              height: "min(80%, 80vh)",
              aspectRatio: "1",
              maxWidth: "350px",
              maxHeight: "350px",
              transformStyle: "preserve-3d",
              animation: "spin 8s linear infinite",
              transform: isHovered ? "scale(1.15)" : "scale(1)",
              transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              filter: isHovered
                ? "drop-shadow(0 15px 40px rgba(0, 0, 0, 0.5))"
                : "drop-shadow(0 10px 25px rgba(0, 0, 0, 0.3))",
            }}
          >
            {/* Front side */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backfaceVisibility: "hidden",
                borderRadius: "50%",
                overflow: "hidden",
              }}
            >
              <img
                src={coinImage}
                alt={coinData.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            {/* Back side */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                borderRadius: "50%",
                overflow: "hidden",
              }}
            >
              <img
                src={coinImage}
                alt={coinData.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          </div>

          <style
            dangerouslySetInnerHTML={{
              __html: `
            @keyframes spin {
              from {
                transform: rotateY(0deg);
              }
              to {
                transform: rotateY(360deg);
              }
            }
          `,
            }}
          />
        </div>

        {/* Trade Modal */}
        {coinData && (
          <TradeModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} coinData={coinData} />
        )}
      </>
    );
  }

  // Single coin mode: Show full coin details
  return (
    <div
      style={{
        background: settings.background,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Media Section */}
      <div className="relative flex-1 min-h-0">
        {coinData.mediaContent ? (
          isVideo && !videoError && videoData ? (
            videoData.type === "cloudflare" ? (
              <iframe
                key={videoData.url}
                src={videoData.url}
                className="w-full h-full"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                style={{ border: "none" }}
              />
            ) : (
              <div className="relative w-full h-full">
                <video
                  key={videoData.url}
                  ref={videoRef}
                  src={videoData.url}
                  className="w-full h-full object-cover"
                  controls={isVideoPlaying}
                  loop
                  playsInline
                  preload="metadata"
                  autoPlay
                  muted
                  poster={coinData.mediaContent.previewImage?.medium || coinData.mediaContent.previewImage?.small}
                  onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onError={() => setVideoError(true)}
                />
                {!isVideoPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <button
                      className="w-16 h-16 flex items-center justify-center bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                      onClick={() => {
                        videoRef.current?.play();
                        setIsVideoPlaying(true);
                      }}
                    >
                      <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            <img
              src={
                coinData.mediaContent.previewImage?.medium ||
                coinData.mediaContent.previewImage?.small ||
                formatIpfsUri(coinData.mediaContent.originalUri)
              }
              alt={coinData.name}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <BsCoin size={64} className="text-gray-400" />
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4 space-y-3 bg-white border-t">
        {/* Coin Name & Symbol */}
        <div>
          <h3 className="text-lg font-bold">
            {coinData.name} ({coinData.symbol})
          </h3>
          {coinData.creatorProfile?.handle && (
            <div className="flex items-center gap-2 mt-1">
              {coinData.creatorProfile.avatarUrl && (
                <img
                  src={coinData.creatorProfile.avatarUrl}
                  alt={coinData.creatorProfile.handle}
                  className="w-5 h-5 rounded-full object-cover"
                />
              )}
              <p className="text-sm text-gray-600">by @{coinData.creatorProfile.handle}</p>
            </div>
          )}
        </div>

        {/* Market Data */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-600">Price</p>
            <p className="font-semibold">${parseFloat(coinData.tokenPrice.priceInUsdc).toFixed(6)}</p>
          </div>
          <div>
            <p className="text-gray-600">Market Cap</p>
            <p className="font-semibold">${parseFloat(coinData.marketCap).toLocaleString()}</p>
          </div>
        </div>

        {/* Trade Button */}
        <button
          onClick={handleTrade}
          className="w-full py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
        >
          Trade
        </button>
      </div>

      {/* Trade Modal */}
      {coinData && (
        <TradeModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} coinData={coinData} />
      )}
    </div>
  );
};

export default {
  fidget: ZoraCoins,
  properties: zoraCoinsProperties,
} as FidgetModule<FidgetArgs<ZoraCoinsFidgetSettings>>;
