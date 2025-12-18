import { openWindow } from "@/common/lib/utils/navigation";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { parseZoraUrl } from "./zoraUtils";

interface ZoraEmbedProps {
  url: string;
}

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url?: string;
}

const ZoraEmbed: React.FC<ZoraEmbedProps> = ({ url }) => {
  const parsed = parseZoraUrl(url);
  const tradeUrl = parsed?.pageUrl ?? url;
  const [ogData, setOgData] = useState<OpenGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOGData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/opengraph?url=${encodeURIComponent(tradeUrl)}`
        );
        if (response.ok) {
          const data = await response.json();
          setOgData(data);
        }
      } catch (err) {
        console.error("Error fetching OpenGraph data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOGData();
  }, [tradeUrl]);

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 w-full max-w-2xl">
        <div className="animate-pulse">
          <div className="bg-gray-300 h-4 rounded w-3/4 mb-2"></div>
          <div className="bg-gray-300 h-3 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={tradeUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        openWindow(tradeUrl);
      }}
      className="block border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors w-full max-w-2xl"
    >
      {/* Preview Image Section */}
      {ogData?.image && (
        <div className="relative w-full h-48">
          <Image
            src={ogData.image}
            alt={ogData.title || "Zora Preview"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      {/* Content Section with padding */}
      <div className="p-4">
        {ogData?.title && (
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
            {ogData.title}
          </h3>
        )}
        {ogData?.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {ogData.description}
          </p>
        )}
        <div className="flex items-center text-gray-500 text-xs mb-3">
          <span className="truncate">
            {ogData?.siteName || "zora.co"}
          </span>
        </div>

        {/* Button with proper padding - no container, just padding on button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openWindow(tradeUrl);
          }}
          className="inline-flex items-center rounded-sm bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 transition-colors"
        >
          View on Zora
          <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-2" />
        </button>
      </div>
    </a>
  );
};

export default ZoraEmbed;
