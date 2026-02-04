import React from "react";
import { AvatarImage, Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import { IoMdShare } from "react-icons/io";
import { formatNumber } from "@/common/lib/utils/formatNumber";
import { useToken } from "@/common/providers/TokenProvider";

const TokenDataHeader: React.FC = () => {
  const { tokenData } = useToken();
  const contractAddress = tokenData?.clankerData?.contract_address || "";
  const name =
    tokenData?.clankerData?.name || tokenData?.geckoData?.name || "Loading...";
  const symbol =
    tokenData?.clankerData?.symbol || tokenData?.geckoData?.symbol || "";
  const image =
    tokenData?.clankerData?.img_url ||
    (tokenData?.geckoData?.image_url !== "missing.png"
      ? tokenData?.geckoData?.image_url
      : null);
  const priceChange = tokenData?.geckoData?.priceChange || null;
  const tokenPrice = tokenData?.geckoData?.price_usd || null;
  const marketCap = tokenData?.geckoData?.market_cap_usd || null;

  const handleAddToMetamask = async () => {
    try {
      await (window as any).ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: contractAddress,
            symbol: symbol,
            decimals: 18,
            image: image,
          },
        },
      });
      // console.log("Token added to MetaMask", wasAdded);
    } catch (error) {
      console.error("Error adding token to MetaMask", error);
    }
  };

  const handleOpenNetscan = () => {
    window.open(
      `https://${tokenData?.network}scan.org/address/${contractAddress}`,
      "_blank",
    );
  };

  const handleCopyUrl = () => {
    const url = window.location.href;
    const tempInput = document.createElement("input");
    tempInput.value = url;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    alert("URL copied to clipboard");
  };

  return (
    <div className="flex items-center px-3 md:px-4 py-2 w-fit border-b border-b-gray-200 md:border-none space-x-2 md:space-x-4">
      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="relative">
          <Avatar className="w-10 h-10 flex items-center justify-center rounded-full overflow-hidden bg-gray-300">
            {image ? (
              <AvatarImage
                src={image}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <AvatarFallback className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-300 text-black font-bold">
                {typeof name === "string" ? name.charAt(0) : "?"}
              </AvatarFallback>
            )}
          </Avatar>
          {name === "nounspace" && (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 rounded-full">
              <img
                src="/brands/noggles.svg"
                alt="NOGGLES"
                className="w-5 h-5"
              />
            </div>
          )}
        </div>
        {/* Token Info */}
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-black">{name}</span>
            <span className="text-gray-500 text-sm">{symbol}</span>
          </div>
          <div className="text-gray-500 text-sm">
            {marketCap ? `$${formatNumber(Number(marketCap))}` : "Loading..."}
          </div>
        </div>
      </div>

      {/* Price and Icons */}
      <div className="flex items-center space-x-4">
        {/* Price Details */}
        <div className="text-right">
          <div className="text-black font-bold">
            {tokenPrice !== null ? `$${tokenPrice}` : " "}
          </div>
          <div
            className={`text-sm font-medium ${priceChange && parseFloat(priceChange) > 0
                ? "text-green-500"
                : "text-red-500"
              }`}
          >
            {priceChange ? `${parseFloat(priceChange).toFixed(2)}%` : " "}
          </div>
        </div>
        {/* Action Icons */}
        <div className="hidden md:flex items-center space-x-2">
          <img
            src="https://logosarchive.com/wp-content/uploads/2022/02/Metamask-icon.svg"
            alt="metamask"
            className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleAddToMetamask}
          />
          <img
            src="https://cdn.worldvectorlogo.com/logos/etherscan-1.svg"
            alt="basescan"
            className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleOpenNetscan}
          />
          <IoMdShare
            className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
            onClick={handleCopyUrl}
          />
        </div>
        <div className="w-0.5 h-12 bg-gray-200 mx-2.5 hidden md:block" />
      </div>
    </div>
  );
};

export default TokenDataHeader;
