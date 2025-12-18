import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/common/components/atoms/tooltip";
import { openWindow } from "@/common/lib/utils/navigation";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import Image from "next/image";
import React, { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { parseZoraUrl } from "./zoraUtils";

const ReactHlsPlayer = dynamic(() => import("@gumlet/react-hls-player"), {
  ssr: false,
});

interface ZoraEmbedProps {
  url: string;
}

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  video?: string;
  siteName?: string;
  url?: string;
}

const MAX_EMBED_HEIGHT = 500;

const ZoraEmbed: React.FC<ZoraEmbedProps> = ({ url }) => {
  const parsed = parseZoraUrl(url);
  const tradeUrl = parsed?.pageUrl ?? url;
  const [ogData, setOgData] = useState<OpenGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [didUnmute, setDidUnmute] = useState(false);
  const playerRef = React.useRef<HTMLVideoElement | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const fetchOGData = async () => {
      try {
        setIsLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        try {
          const response = await fetch(
            `/api/opengraph?url=${encodeURIComponent(tradeUrl)}`,
            {
              signal: controller.signal,
            }
          );
          if (response.ok) {
            const data = await response.json();
            // Only set data if we got meaningful content
            if (data.title || data.image || data.video || data.description) {
              setOgData(data);
            }
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        // Silently fail - we'll show fallback UI
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn("OpenGraph fetch failed:", err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchOGData();
  }, [tradeUrl]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef?.current.paused) {
      playerRef?.current?.play();
    } else {
      playerRef?.current?.pause();
    }
  }, []);

  const onVideoClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (didUnmute) {
        togglePlay();
      } else {
        setMuted(false);
        setDidUnmute(true);
      }
    },
    [didUnmute, togglePlay],
  );

  const onLoadedMetadata = useCallback(() => {
    if (!playerRef.current) return;

    const { videoWidth, videoHeight } = playerRef.current;
    if (!videoWidth || !videoHeight) return;

    setVideoDimensions((prev) => {
      if (prev?.width === videoWidth && prev?.height === videoHeight) {
        return prev;
      }

      return { width: videoWidth, height: videoHeight };
    });
  }, []);

  const aspectRatio = useMemo(() => {
    if (!videoDimensions?.width || !videoDimensions.height) {
      return null;
    }

    return videoDimensions.width / videoDimensions.height;
  }, [videoDimensions]);

  const containerStyles = useMemo(() => {
    const styles: CSSProperties = {
      width: "100%",
    };

    if (aspectRatio && aspectRatio < 1) {
      styles.maxWidth = `${MAX_EMBED_HEIGHT * aspectRatio}px`;
    }

    return styles;
  }, [aspectRatio]);

  const videoStyles = useMemo<CSSProperties>(() => ({
    width: "100%",
    height: "auto",
    maxHeight: MAX_EMBED_HEIGHT,
  }), []);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't navigate if clicking on video controls
    if ((e.target as HTMLElement).closest('video, .react-player')) {
      return;
    }
    e.preventDefault();
    openWindow(tradeUrl);
  }, [tradeUrl]);

  const tooltipText = useMemo(() => {
    if (ogData?.title) {
      return `View "${ogData.title}" on Zora`;
    }
    if (parsed?.tokenId) {
      return `View Token #${parsed.tokenId} on Zora`;
    }
    return "View on Zora";
  }, [ogData?.title, parsed]);

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

  // If we have no OG data, show a clickable card with preview
  if (!ogData || (!ogData.title && !ogData.image && !ogData.video)) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="block border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-lg cursor-pointer transition-all duration-200 w-full max-w-2xl bg-white relative group"
              onClick={handleCardClick}
            >
              {/* Zora Badge - Top Right - Always visible */}
              <div className="absolute top-3 right-3 z-10 bg-black/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg transition-all duration-200 group-hover:bg-black group-hover:scale-105">
                <span>Zora</span>
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </div>
              
              {/* Preview area with gradient background */}
              <div className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100" style={{ aspectRatio: '16/9', minHeight: '300px' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-3">
                      <ArrowTopRightOnSquareIcon className="w-12 h-12 text-gray-400 mx-auto" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Click to view on Zora</p>
                    {parsed?.tokenId && (
                      <p className="text-xs text-gray-500 mt-1">Token #{parsed.tokenId}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="block border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-lg cursor-pointer transition-all duration-200 w-full max-w-2xl bg-white relative group"
            onClick={handleCardClick}
          >
            {/* Zora Badge - Top Right Corner - Always visible */}
            <div className="absolute top-3 right-3 z-10 bg-black/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg transition-all duration-200 group-hover:bg-black group-hover:scale-105">
              <span>Zora</span>
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </div>

            {/* Video Section - Priority over image */}
            {ogData?.video ? (
              <div className="flex w-full justify-center bg-black relative" style={containerStyles}>
                <ReactHlsPlayer
                  src={ogData.video}
                  muted={muted}
                  autoPlay={false}
                  controls={true}
                  width="100%"
                  height="auto"
                  playerRef={playerRef}
                  onClick={onVideoClick}
                  onLoadedMetadata={onLoadedMetadata}
                  playsInline
                  className="h-auto w-full rounded-t-xl object-contain"
                  style={videoStyles}
                />
              </div>
            ) : ogData?.image ? (
              /* Preview Image Section - Only show if it's actually an image */
              (() => {
                const imageUrl = ogData.image.toLowerCase();
                const videoExtensions = ['.m3u8', '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv'];
                const isVideoUrl = videoExtensions.some(ext => imageUrl.includes(ext)) || 
                                   imageUrl.includes('/video/') ||
                                   imageUrl.includes('video/upload');
                
                // Don't render Image component for video URLs
                if (isVideoUrl) {
                  return null;
                }
                
                return (
                  <div className="relative w-full h-48">
                    <Image
                      src={ogData.image}
                      alt={ogData.title || "Zora Preview"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      onError={(e) => {
                        // Hide image on error
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                );
              })()
            ) : null}

            {/* Content Section */}
            <div className="p-5 bg-white">
              {ogData?.title && (
                <h3 className="font-semibold text-gray-900 mb-2 text-base leading-tight line-clamp-2">
                  {ogData.title}
                </h3>
              )}
              {ogData?.description && (
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                  {ogData.description}
                </p>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ZoraEmbed;
