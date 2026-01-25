import { openWindow } from "@/common/lib/utils/navigation";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import React, { useEffect, useState, useCallback, useMemo, CSSProperties } from "react";
import dynamic from "next/dynamic";

const ReactHlsPlayer = dynamic(() => import("@gumlet/react-hls-player"), {
  ssr: false,
});

interface BaseAppEmbedProps {
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

const BaseAppEmbed: React.FC<BaseAppEmbedProps> = ({ url }) => {
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
        const response = await fetch(
          `/api/opengraph?url=${encodeURIComponent(url)}`
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
  }, [url]);

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
    <div className="block border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors w-full max-w-2xl">
      {/* Video Section - Priority over image */}
      {ogData?.video ? (
        <div className="flex w-full justify-center bg-black" style={containerStyles}>
          <ReactHlsPlayer
            src={ogData.video}
            muted={muted}
            autoPlay={false}
            controls={true}
            width="100%"
            height="auto"
            playerRef={playerRef as React.RefObject<HTMLVideoElement>}
            onClick={onVideoClick}
            onLoadedMetadata={onLoadedMetadata}
            playsInline
            className="h-auto w-full rounded-t-lg object-contain"
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
                alt={ogData.title || "Base App Preview"}
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

      {/* Content Section with padding */}
      <div className="p-4">
        {ogData?.title && (
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
            {ogData.title}
          </h3>
        )}
        {ogData?.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-3">
            {ogData.description}
          </p>
        )}
        <div className="flex items-center text-gray-500 text-xs mb-3">
          <span className="truncate">
            {ogData?.siteName || "base.app"}
          </span>
        </div>

        {/* Button with proper padding - no container, just padding on button */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openWindow(url);
          }}
          className="inline-flex items-center rounded-sm bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 transition-colors"
        >
          {ogData?.title ? `View ${ogData.title.length > 25 ? ogData.title.substring(0, 22) + '...' : ogData.title}` : "Open in Base"}
          <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-2" />
        </a>
      </div>
    </div>
  );
};

export default BaseAppEmbed;
