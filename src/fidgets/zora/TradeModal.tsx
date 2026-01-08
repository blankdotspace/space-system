"use client";

import React, { useState } from "react";
import { BsCoin } from "react-icons/bs";
import { parseEther, formatEther } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";

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

  if (!isOpen) return null;

  const coinImage = coinData.mediaContent?.previewImage?.medium || 
                    coinData.mediaContent?.previewImage?.small;

  // Calculate conversions
  const ETH_PRICE_USD = 3000; // TODO: Fetch real-time ETH price from oracle
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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "450px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>Trade {coinData.symbol}</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Coin Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          {coinImage ? (
            <img
              src={coinImage}
              alt={coinData.name}
              style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <BsCoin size={48} />
          )}
          <div>
            <div style={{ fontWeight: "600", fontSize: "18px" }}>{coinData.name}</div>
            <div style={{ color: "#666", fontSize: "14px" }}>${parseFloat(coinData.tokenPrice.priceInUsdc).toFixed(6)}</div>
          </div>
        </div>

        {/* Buy/Sell Toggle */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <button
            onClick={() => setIsBuying(true)}
            style={{
              flex: 1,
              padding: "12px",
              border: isBuying ? "2px solid black" : "2px solid #e0e0e0",
              backgroundColor: isBuying ? "#f0f0f0" : "white",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: isBuying ? "600" : "normal",
            }}
          >
            Buy
          </button>
          <button
            onClick={() => setIsBuying(false)}
            style={{
              flex: 1,
              padding: "12px",
              border: !isBuying ? "2px solid black" : "2px solid #e0e0e0",
              backgroundColor: !isBuying ? "#f0f0f0" : "white",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: !isBuying ? "600" : "normal",
            }}
          >
            Sell
          </button>
        </div>

        {/* Amount Input */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            {isBuying ? "Amount (ETH)" : `Amount (${coinData.symbol})`}
          </label>
          <input
            type="number"
            value={displayAmount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step={isBuying ? "0.001" : "1"}
            style={{
              width: "100%",
              padding: "12px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "16px",
              boxSizing: "border-box",
            }}
          />
          {amount && (
            <div style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
              {displayConversion}
            </div>
          )}
        </div>

        {/* Trade Stats */}
        <div style={{ backgroundColor: "#f9f9f9", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#666" }}>Market Cap</span>
            <span style={{ fontWeight: "500" }}>${parseFloat(coinData.marketCap).toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#666" }}>Price per coin</span>
            <span style={{ fontWeight: "500" }}>${parseFloat(coinData.tokenPrice.priceInUsdc).toFixed(6)}</span>
          </div>
        </div>

        {/* Trade Button */}
        <button
          onClick={handleTrade}
          disabled={!amount || parseFloat(amount) <= 0 || isLoading || !address}
          style={{
            width: "100%",
            padding: "16px",
            backgroundColor: (!amount || parseFloat(amount) <= 0 || isLoading || !address) ? "#ccc" : "black",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: (!amount || parseFloat(amount) <= 0 || isLoading || !address) ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Processing..." : !address ? "Connect Wallet" : `${isBuying ? "Buy" : "Sell"} ${coinData.symbol}`}
        </button>
      </div>
    </div>
  );
};
