"use client";

import React, { useState } from "react";
import { BsCoin } from "react-icons/bs";
import { parseEther } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import Modal from "@/common/components/molecules/Modal";
import { useEthUsdPrice } from "@/fidgets/nouns-home/price";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  coinData: {
    address: string;
    name: string;
    symbol: string;
    marketCap: string;
    tokenPrice: {
      priceInUsdc: string;
    };
    mediaContent?: {
      previewImage?: {
        small?: string;
        medium?: string;
      };
    };
  };
}

export const TradeModal: React.FC<TradeModalProps> = ({ isOpen, onClose, coinData }) => {
  const [amount, setAmount] = useState("");
  const [isBuying, setIsBuying] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Fetch real-time ETH price from Coingecko with fallback
  const liveEthPrice = useEthUsdPrice();
  const ETH_PRICE_USD = liveEthPrice ?? 3000; // Fallback to $3000 if fetch fails
  const isUsingFallbackPrice = liveEthPrice === null;

  const coinImage = coinData.mediaContent?.previewImage?.medium || 
                    coinData.mediaContent?.previewImage?.small;

  // Calculate conversions using real-time ETH price
  const coinPriceInEth = parseFloat(coinData.tokenPrice.priceInUsdc) / ETH_PRICE_USD;
  
  let displayAmount = "";
  let displayConversion = "";
  
  if (isBuying) {
    // Buying: input ETH, get coins
    const ethAmount = parseFloat(amount) || 0;
    const coinsToReceive = ethAmount / coinPriceInEth;
    displayAmount = amount;
    displayConversion = `≈ ${coinsToReceive.toFixed(2)} ${coinData.symbol} ($${(ethAmount * ETH_PRICE_USD).toFixed(2)} USD)`;
  } else {
    // Selling: input coins, get ETH
    const coinAmount = parseFloat(amount) || 0;
    const ethToReceive = coinAmount * coinPriceInEth;
    displayAmount = amount;
    displayConversion = `≈ ${ethToReceive.toFixed(6)} ETH ($${(ethToReceive * ETH_PRICE_USD).toFixed(2)} USD)`;
  }

  const handleTrade = async () => {
    if (!address || !walletClient || !publicClient) {
      alert("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🎯 Starting trade execution - Zora SDK will manage all balance validations');
      
      // Dynamic import to avoid build issues
      const { tradeCoin } = await import("@zoralabs/coins-sdk");
      
      let tradeParameters;
      
      if (isBuying) {
        // Buy coins with ETH
        console.log('💰 Buy trade: ETH → Coins');
        tradeParameters = {
          sell: { type: "eth" as const },
          buy: { 
            type: "erc20" as const, 
            address: coinData.address as `0x${string}`
          },
          amountIn: parseEther(amount),
          slippage: 0.05, // 5% slippage tolerance
          sender: address as `0x${string}`,
        };
      } else {
        // Sell coins for ETH
        console.log('💸 Sell trade: Coins → ETH');
        const coinAmount = parseFloat(amount);
        tradeParameters = {
          sell: { 
            type: "erc20" as const, 
            address: coinData.address as `0x${string}`
          },
          buy: { type: "eth" as const },
          amountIn: parseEther(coinAmount.toString()), // Adjust for actual token decimals
          slippage: 0.15, // 15% slippage tolerance for selling
          sender: address as `0x${string}`,
        };
      }

      console.log('📤 Executing tradeCoin with parameters:', tradeParameters);

      // Create account object properly for viem
      const account = walletClient.account;
      if (!account) {
        throw new Error('No account found in wallet client');
      }

      const receipt = await tradeCoin({
        tradeParameters,
        walletClient,
        account,
        publicClient: publicClient as any,
        validateTransaction: true,
      });

      console.log("✅ Trade successful:", receipt);
      alert(`Trade successful! Transaction: ${receipt.transactionHash}`);
      onClose();
      
    } catch (err: any) {
      console.error("❌ Trade error:", err);
      
      // Handle specific error types
      let userMessage = 'An error occurred during the trade';
      
      if (err?.message) {
        const errorMessage = err.message.toLowerCase();
        
        if (errorMessage.includes('user denied') || errorMessage.includes('user rejected')) {
          userMessage = 'You cancelled the transaction in your wallet';
          // Don't show alert for user cancellations
          setIsLoading(false);
          return;
        } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
          userMessage = `Insufficient ${isBuying ? 'ETH' : coinData.symbol} balance. The SDK will estimate gas automatically.`;
        } else if (errorMessage.includes('permit') || errorMessage.includes('approval') || errorMessage.includes('allowance')) {
          userMessage = 'Please sign the permit message in your wallet to authorize this trade.';
        } else if (errorMessage.includes('transfer_from_failed') || errorMessage.includes('transferfrom')) {
          userMessage = 'Token transfer failed. This usually means insufficient balance or the permit signature was not accepted.';
        } else if (errorMessage.includes('network') || errorMessage.includes('chain')) {
          userMessage = 'Network error. Please check your connection and try again.';
        } else if (errorMessage.includes('slippage')) {
          userMessage = 'Price moved too much. Try increasing slippage tolerance.';
        } else if (errorMessage.includes('gas')) {
          userMessage = 'Gas estimation failed. The transaction might fail.';
        } else if (err.message.length < 200) {
          // Show short error messages directly
          userMessage = err.message;
        }
      }
      
      alert(`Trade failed: ${userMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      setOpen={(open) => !open && onClose()}
      showClose={true}
    >
      <div className="space-y-6">
        {/* Title */}
        <h2 className="text-2xl font-bold text-center">Trade {coinData.symbol}</h2>
        
        {/* Coin Info */}
        <div className="flex items-center gap-3">
          {coinImage ? (
            <img
              src={coinImage}
              alt={coinData.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <BsCoin size={48} />
          )}
          <div>
            <div className="font-semibold text-lg">{coinData.name}</div>
            <div className="text-sm text-gray-400">${parseFloat(coinData.tokenPrice.priceInUsdc).toFixed(6)}</div>
          </div>
        </div>

        {/* ETH Price Indicator */}
        {isUsingFallbackPrice && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-xs text-yellow-800">
              ⚠️ Using estimated ETH price at ${ETH_PRICE_USD.toLocaleString()}/ETH (live price unavailable)
            </div>
          </div>
        )}

        {/* Buy/Sell Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsBuying(true)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              isBuying 
                ? "bg-gray-100 border-2 border-black text-black" 
                : "bg-transparent border-2 border-gray-300 text-gray-600"
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setIsBuying(false)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              !isBuying 
                ? "bg-gray-100 border-2 border-black text-black" 
                : "bg-transparent border-2 border-gray-300 text-gray-600"
            }`}
          >
            Sell
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block mb-2 font-medium">
            {isBuying ? "Amount (ETH)" : `Amount (${coinData.symbol})`}
          </label>
          <input
            type="number"
            value={displayAmount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step={isBuying ? "0.001" : "1"}
            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-gray-400"
          />
          {amount && (
            <div className="mt-2 text-sm text-gray-400">
              {displayConversion}
            </div>
          )}
        </div>

        {/* Trade Stats */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Market Cap</span>
            <span className="font-medium">${parseFloat(coinData.marketCap).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Price per coin</span>
            <span className="font-medium">${parseFloat(coinData.tokenPrice.priceInUsdc).toFixed(6)}</span>
          </div>
        </div>

        {/* Trade Button */}
        <button
          onClick={handleTrade}
          disabled={!amount || parseFloat(amount) <= 0 || isLoading || !address}
          className={`w-full py-4 rounded-lg text-base font-semibold text-white transition-colors ${
            (!amount || parseFloat(amount) <= 0 || isLoading || !address)
              ? "bg-gray-300 cursor-not-allowed" 
              : "bg-black hover:bg-gray-800"
          }`}
        >
          {isLoading ? "Processing..." : !address ? "Connect Wallet" : `${isBuying ? "Buy" : "Sell"} ${coinData.symbol}`}
        </button>
      </div>
    </Modal>
  );
};
