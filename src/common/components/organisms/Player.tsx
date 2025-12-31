import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactElement,
} from "react";
import { YouTubeConfig } from "react-player/youtube";
import ReactPlayer from "react-player";
import Image from "next/image";
import useHasWindow from "@/common/lib/hooks/useHasWindow";
import { IconType } from "react-icons";
import {
  LiaVolumeUpSolid,
  LiaVolumeMuteSolid,
  LiaCircleNotchSolid,
} from "react-icons/lia";
import { Button } from "@/common/components/atoms/button";
import { trackAnalyticsEvent } from "@/common/lib/utils/analyticsUtils";
import { Address } from "viem";
import ScanAddress from "../molecules/ScanAddress";
import { AlchemyNetwork } from "@/fidgets/ui/gallery";
import {
  NOUNISH_LOWFI_META,
  NOUNISH_LOWFI_URL,
} from "@/constants/nounishLowfi";
import { FaPause, FaPlay } from "react-icons/fa";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";

type ContentMetadata = {
  title?: string | null;
  channel?: string | null | ReactElement;
  thumbnail?: string | null;
};
export type PlayerProps = {
  url: string | string[];
  shrunk?: boolean;
  fontColor?: string;
  fontFamily?: string;
  borderColor?: string;
};

const DEFAULT_UI_FONT_COLOR = "var(--ns-nav-font-color, #0f172a)";
const DEFAULT_UI_FONT_FAMILY =
  "var(--ns-nav-font, var(--font-sans, Inter, system-ui, -apple-system, sans-serif))";
const DEFAULT_BORDER_COLOR = "rgba(128, 128, 128, 0.5)";

const getToggleIcon = ({ playing, started, ready }): [IconType, string] => {
  if ((playing && !started) || !ready) {
    return [LiaCircleNotchSolid, "animate-spin"];
  } else if (playing) {
    return [LiaVolumeUpSolid, ""];
  } else {
    return [LiaVolumeMuteSolid, ""];
  }
};

export const Player: React.FC<PlayerProps> = ({
  url,
  shrunk = false,
  fontColor = DEFAULT_UI_FONT_COLOR,
  fontFamily = DEFAULT_UI_FONT_FAMILY,
  borderColor = DEFAULT_BORDER_COLOR,
}) => {
  const hasWindow = useHasWindow();
  const playerRef = useRef<ReactPlayer | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [metadata, setMetadata] = useState<ContentMetadata | null>(null);
  const [ToggleIcon, iconClassNames] = getToggleIcon({
    playing,
    started,
    ready,
  });
  const [isHovering, setIsHovering] = useState(false);

  const getMetadata = async (_url: string | string[]) => {
    // Handle array of URLs by taking the first one
    const videoUrl = Array.isArray(_url) ? _url[0] : _url;

    // Use default value to avoid request the same data every time
    if (videoUrl == NOUNISH_LOWFI_URL) {
      setMetadata(NOUNISH_LOWFI_META);
      return;
    }

    if (videoUrl.includes("ipfs") || videoUrl.includes("arweave")) {
      // Parse URL parameters for IPFS content
      const url = new URL(videoUrl);
      const contractName = url.searchParams.get("contractName");
      const contractAddress = url.searchParams.get(
        "contractAddress"
      ) as Address;
      const thumbnailUrl = url.searchParams.get("thumbnailUrl");
      const chain = url.searchParams.get("chain") as AlchemyNetwork;

      setMetadata({
        title: contractName || "NFT",
        channel: <ScanAddress address={contractAddress} chain={chain} />,
        thumbnail: thumbnailUrl || null,
      });
      return;
    }

    // Default to YouTube metadata
    const response = await fetch(`/api/metadata/youtube?url=${videoUrl}`);
    const data = await response.json();
    // console.log("youtube", data);
    const snippet = data?.value?.snippet;

    if (!snippet) return;

    setMetadata({
      title: snippet.title,
      channel: snippet.channelTitle,
      thumbnail: snippet.thumbnails?.medium?.url,
    });
  };

  useEffect(() => {
    getMetadata(url);
  }, [url]);

  useEffect(() => {
    if (playing && started) {
      setMuted(false);
    }
  }, [playing, started]);
  const normalizedUrl = Array.isArray(url) ? url[0] : url;

  const onPlay = useCallback(() => {
    trackAnalyticsEvent(AnalyticsEvent.PLAY, { url: normalizedUrl });
    setPlaying(true);
  }, [normalizedUrl]);

  const onPause = useCallback(() => {
    trackAnalyticsEvent(AnalyticsEvent.PAUSE, { url: normalizedUrl });
    setPlaying(false);
  }, [normalizedUrl]);

  const onReady = useCallback((player) => {
    setReady(true);
  }, []);

  const onStart = useCallback(() => {
    setStarted(true);
  }, []);

  const onUnstarted = useCallback(() => {
    setStarted(false);
  }, []);

  const youtubeConfig: YouTubeConfig = {
    playerVars: {
      showinfo: 0,
      autoplay: 0,
    },
    embedOptions: {},
    onUnstarted: onUnstarted,
  };

  const baseTextStyles: React.CSSProperties = {
    color: fontColor,
    fontFamily,
  };

  if (shrunk) {
    return (
      <>
        <div
          className="relative w-16 h-16 mx-auto overflow-hidden rounded-lg cursor-pointer"
          onClick={playing ? onPause : onPlay}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {metadata?.thumbnail ? (
            <Image
              src={metadata.thumbnail}
              alt="Music thumbnail"
              fill
              sizes="64px"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gray-300"></div>
          )}

          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            {!ready ? (
              <LiaCircleNotchSolid
                className="text-white animate-spin drop-shadow-md"
                size={24}
              />
            ) : (
              <div
                className={mergeClasses(
                  "transition-transform duration-200",
                  isHovering ? "scale-110" : "scale-100"
                )}
              >
                {playing ? (
                  <FaPause
                    className="drop-shadow-md"
                    size={24}
                    style={{ color: "rgba(128, 128, 128, 0.8)" }}
                  />
                ) : (
                  <FaPlay
                    className="drop-shadow-md"
                    size={24}
                    style={{ color: "rgba(255, 255, 255, 0.5)" }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
        {hasWindow && (
          <ReactPlayer
            className="hidden"
            url={url}
            ref={playerRef}
            playing={playing}
            loop={true}
            light={false}
            controls={false}
            muted={muted}
            config={{
              youtube: youtubeConfig,
            }}
            onReady={onReady}
            onStart={onStart}
            onPause={onPause}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className="flex items-center border rounded-full md:rounded-lg overflow-hidden"
        style={{ fontFamily, borderColor }}
      >
        <div className="overflow-hidden relative w-8 h-8 md:w-16 md:h-auto ml-2 md:ml-auto flex-shrink-0 self-center md:self-stretch rounded-lg md:rounded-none">
          {metadata?.thumbnail && (
            <Image src={metadata?.thumbnail} alt="poster" fill sizes="64px" />
          )}
        </div>
        <div className="flex items-center pl-2 p-1 md:p-2 gap-2 flex-auto overflow-hidden">
          <div className="flex-auto">
            <p
              className="text-[12px]/[1.4] font-bold line-clamp-1 md:line-clamp-2"
              style={baseTextStyles}
            >
              {metadata?.title || ""}
            </p>
            <p
              className="text-[10px]/[1.5] font-semibold line-clamp-1 md:mt-1"
              style={{ ...baseTextStyles, opacity: 0.7 }}
            >
              {metadata?.channel || ""}
            </p>
          </div>
          <Button
            onClick={playing ? onPause : onPlay}
            aria-label="Play/Pause"
            className="flex items-center justify-center flex-none rounded-full h-9 w-9 md:h-7 md:w-7 p-0"
            disabled={!ready}
            variant="secondary"
            style={{
              ...baseTextStyles,
              backgroundColor: "rgba(128, 128, 128, 0.5)",
              color: "rgba(128, 128, 128, 0.5)",
            }}
          >
            <ToggleIcon className={iconClassNames} size={20} />
          </Button>
        </div>
      </div>
      {hasWindow && (
        <ReactPlayer
          className="hidden"
          url={url}
          ref={playerRef}
          playing={playing}
          loop={true}
          light={false}
          controls={false}
          muted={muted}
          config={{
            youtube: youtubeConfig,
          }}
          onReady={onReady}
          onStart={onStart}
          onPause={onPause}
        />
      )}
    </>
  );
};

export default Player;
