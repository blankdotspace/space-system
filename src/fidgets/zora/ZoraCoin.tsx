import React, { useEffect, useState, useCallback } from "react";
import TextInput from "@/common/components/molecules/TextInput";
import SwitchButton from "@/common/components/molecules/SwitchButton";
import {
  FidgetArgs,
  FidgetModule,
  FidgetProperties,
  FidgetSettingsStyle,
} from "@/common/fidgets";
import { defaultStyleFields, WithMargin, ErrorWrapper } from "@/fidgets/helpers";
import { getCoin, setApiKey } from "@zoralabs/coins-sdk";
import { ZORA_API_KEY } from "@/constants/app";
import { BsCoin } from "react-icons/bs";
import { isAddress } from "viem";

// Types from Zora SDK
type MediaContent = {
  url: string;
  mimeType: string;
};

type ZoraCoinData = {
  address: string;
  name: string;
  symbol: string;
  marketCap?: string;
  totalSupply?: string;
  tokenPrice?: {
    usdcPrice: string;
  };
  mediaContent?: MediaContent;
  creatorProfile?: {
    displayName?: string;
    handle?: string;
    avatarUrl?: string;
  };
  platformBlocked?: boolean;
};

export type ZoraCoinFidgetSettings = {
  coinAddress: string;
  chainId: number;
  showTradeButton: boolean;
  autoplay: boolean;
} & FidgetSettingsStyle;

const zoraCoinProperties: FidgetProperties = {
  fidgetName: "Zora Coin",
  icon: 0x1f4b0, // 💰
  fields: [
    {
      fieldName: "coinAddress",
      displayName: "Coin Contract Address",
      displayNameHint: "Enter the contract address of the Zora coin you want to display",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      validator: (value) => {
        if (!value) return false;
        return isAddress(value);
      },
      errorMessage: "Please enter a valid Ethereum address",
      group: "settings",
    },
    {
      fieldName: "chainId",
      displayName: "Chain ID",
      displayNameHint: "Chain ID where the coin is deployed (default: 8453 for Base)",
      default: 8453,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} type="number" />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "showTradeButton",
      displayName: "Show Trade Button",
      displayNameHint: "Toggle whether to show the trade button",
      default: true,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "autoplay",
      displayName: "Autoplay Video",
      displayNameHint: "Automatically play video content if available",
      default: true,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    ...defaultStyleFields,
  ],
  size: {
    minHeight: 2,
    maxHeight: 36,
    minWidth: 2,
    maxWidth: 12,
  },
};

const ZoraCoin: React.FC<FidgetArgs<ZoraCoinFidgetSettings>> = ({
  settings,
  data,
  saveData,
}) => {
  const { coinAddress, chainId, showTradeButton, autoplay, background } = settings;
  const [coinData, setCoinData] = useState<ZoraCoinData | null>(data?.coinData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Initialize API key
  useEffect(() => {
    if (ZORA_API_KEY) {
      setApiKey(ZORA_API_KEY);
    }
  }, []);

  // Fetch coin data
  const fetchCoinData = useCallback(async () => {
    if (!coinAddress || !isAddress(coinAddress)) {
      setError("Invalid coin address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getCoin({
        address: coinAddress,
        chain: chainId || 8453,
      });

      if (response.data?.zora20Token) {
        const token = response.data.zora20Token;
        
        // Check if blocked
        if (token.platformBlocked) {
          setError("This coin is blocked on the platform");
          setLoading(false);
          return;
        }

        const newCoinData: ZoraCoinData = {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          marketCap: token.marketCap,
          totalSupply: token.totalSupply,
          tokenPrice: token.tokenPrice,
          mediaContent: token.mediaContent,
          creatorProfile: token.creatorProfile,
          platformBlocked: token.platformBlocked,
        };

        setCoinData(newCoinData);
        await saveData({ coinData: newCoinData });
      } else {
        setError("Coin not found");
      }
    } catch (err) {
      console.error("Error fetching coin data:", err);
      setError("Failed to load coin data");
    } finally {
      setLoading(false);
    }
  }, [coinAddress, chainId, saveData]);

  // Fetch coin data when address or chain changes
  useEffect(() => {
    if (coinAddress && isAddress(coinAddress)) {
      fetchCoinData();
    }
  }, [coinAddress, chainId, fetchCoinData]);

  // Mock trade function (to be implemented with real modal later)
  const handleTrade = () => {
    alert(`Trade functionality coming soon!\n\nCoin: ${coinData?.name} (${coinData?.symbol})\nPrice: $${coinData?.tokenPrice?.usdcPrice || "N/A"}`);
  };

  // Determine if media is video
  const isVideo = coinData?.mediaContent?.mimeType?.startsWith("video/");
  const mediaUrl = coinData?.mediaContent?.url;

  // Render loading state
  if (loading) {
    return (
      <div
        style={{ background }}
        className="w-full h-full flex items-center justify-center"
      >
        <div className="animate-spin">
          <BsCoin size={48} className="text-gray-400" />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return <ErrorWrapper icon="⚠️" message={error} />;
  }

  // Render empty state
  if (!coinData) {
    return <ErrorWrapper icon="💰" message="Enter a coin address to get started" />;
  }

  return (
    <div
      style={{ background }}
      className="w-full h-full flex flex-col overflow-hidden rounded-lg"
    >
      {/* Media Section */}
      {mediaUrl && (
        <div className="flex-1 relative overflow-hidden bg-black">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay={autoplay}
              loop
              muted={autoplay}
              className="w-full h-full object-contain"
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />
          ) : (
            <img
              src={mediaUrl}
              alt={coinData.name}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        {/* Creator Info */}
        {coinData.creatorProfile && (
          <div className="flex items-center gap-2 mb-3">
            {coinData.creatorProfile.avatarUrl && (
              <img
                src={coinData.creatorProfile.avatarUrl}
                alt={coinData.creatorProfile.displayName}
                className="w-8 h-8 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {coinData.creatorProfile.displayName || coinData.creatorProfile.handle}
              </p>
              {coinData.creatorProfile.handle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{coinData.creatorProfile.handle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Coin Info */}
        <div className="space-y-2 mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {coinData.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ${coinData.symbol}
            </p>
          </div>

          {/* Price */}
          {coinData.tokenPrice?.usdcPrice && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${parseFloat(coinData.tokenPrice.usdcPrice).toFixed(6)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">USDC</span>
            </div>
          )}

          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {coinData.marketCap && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Market Cap: </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  ${parseFloat(coinData.marketCap).toLocaleString()}
                </span>
              </div>
            )}
            {coinData.totalSupply && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Supply: </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {parseFloat(coinData.totalSupply).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Trade Button */}
        {showTradeButton && (
          <button
            onClick={handleTrade}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Trade
          </button>
        )}
      </div>
    </div>
  );
};

export default {
  fidget: ZoraCoin,
  properties: zoraCoinProperties,
} as FidgetModule<FidgetArgs<ZoraCoinFidgetSettings>>;
