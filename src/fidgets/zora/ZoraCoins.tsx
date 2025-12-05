"use client";

import React, { useEffect, useState } from "react";
import TextInput from "@/common/components/molecules/TextInput";
import SwitchButton from "@/common/components/molecules/SwitchButton";
import {
  FidgetArgs,
  FidgetModule,
  FidgetProperties,
  FidgetSettingsStyle,
} from "@/common/fidgets";
import { defaultStyleFields, WithMargin, ErrorWrapper } from "@/fidgets/helpers";
import { BsCoin } from "react-icons/bs";

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
              Single Coin
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
    minHeight: 2,
    maxHeight: 12,
    minWidth: 3,
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
  };
  creatorProfile?: {
    handle?: string;
    avatar?: {
      previewImage: {
        medium: string;
      };
    };
  };
}

const ZoraCoins: React.FC<FidgetArgs<ZoraCoinsFidgetSettings>> = ({
  settings,
}) => {
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

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

      try {
        if (settings.displayMode === "single" && settings.coinContract) {
          console.log("Fetching coin data for:", settings.coinContract);
          
          // Use our API route instead of SDK directly
          const response = await fetch("/api/zora", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              address: settings.coinContract,
              chain: 8453, // Base mainnet
            }),
          });

          console.log("Response status:", response.status, response.statusText);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("API error response:", errorText);
            throw new Error(`API error: ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          console.log("Coin API response:", data);
          const token = data?.data?.zora20Token;

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
                    mimeType: token.mediaContent.mimeType || "image/jpeg",
                  }
                : undefined,
              creatorProfile: token.creatorProfile
                ? {
                    handle: token.creatorProfile.handle || undefined,
                    avatar: token.creatorProfile.avatar || undefined,
                  }
                : undefined,
            });
          } else {
            setError("Coin not found");
          }
        } else if (settings.displayMode === "creator") {
          // TODO: Implement creator coins fetching via SDK
          setError("Creator mode coming soon");
        }
      } catch (err) {
        console.error("Error fetching coin data:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Error message:", errorMessage);
        console.error("Coin contract:", settings.coinContract);
        setError(`Failed to fetch coin data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCoinData();
  }, [settings.coinContract, settings.creatorContract, settings.displayMode]);

  const handleTrade = () => {
    // Mock trade button - will implement real modal later
    alert("Trade modal coming soon!");
  };

  const isVideo = coinData?.mediaContent?.mimeType?.startsWith("video/");

  if (loading) {
    return (
      <div
        style={{
          background: settings.background,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="animate-pulse">Loading coin data...</div>
      </div>
    );
  }

  if (error) {
    return <ErrorWrapper icon="🪙" message={error} />;
  }

  if (!coinData) {
    return (
      <ErrorWrapper
        icon="🪙"
        message="Enter a coin contract address to display coin information"
      />
    );
  }

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
          isVideo ? (
            <div className="relative w-full h-full">
              <video
                src={coinData.mediaContent.originalUri}
                className="w-full h-full object-cover"
                controls={isVideoPlaying}
                loop
                playsInline
                onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
              />
              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                  <button
                    className="w-16 h-16 flex items-center justify-center bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                    onClick={() => {
                      const video = document.querySelector("video");
                      if (video) {
                        video.play();
                        setIsVideoPlaying(true);
                      }
                    }}
                  >
                    <svg
                      className="w-8 h-8 ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <img
              src={coinData.mediaContent.originalUri}
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
            <p className="text-sm text-gray-600">
              by @{coinData.creatorProfile.handle}
            </p>
          )}
        </div>

        {/* Market Data */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-600">Price</p>
            <p className="font-semibold">
              ${parseFloat(coinData.tokenPrice.priceInUsdc).toFixed(6)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Market Cap</p>
            <p className="font-semibold">
              ${parseFloat(coinData.marketCap).toLocaleString()}
            </p>
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
    </div>
  );
};

export default {
  fidget: ZoraCoins,
  properties: zoraCoinsProperties,
} as FidgetModule<FidgetArgs<ZoraCoinsFidgetSettings>>;
