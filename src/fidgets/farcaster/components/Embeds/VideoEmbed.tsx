import React, { CSSProperties, useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const ReactHlsPlayer = dynamic(() => import("@gumlet/react-hls-player"), {
  ssr: false,
});

const MAX_EMBED_HEIGHT = 500;

const VideoEmbed = ({ url }: { url: string }) => {
  const [muted, setMuted] = useState(true);
  const [didUnmute, setDidUnmute] = useState(false);
  const playerRef = React.useRef<HTMLVideoElement | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef?.current.paused) {
      playerRef?.current?.play();
    } else {
      playerRef?.current?.pause();
    }
  }, [playerRef?.current]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

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

  return (
    <div className="flex w-full justify-center" style={containerStyles}>
      <ReactHlsPlayer
        src={url}
        muted={muted}
        autoPlay={false}
        controls={true}
        width="100%"
        height="auto"
        playerRef={playerRef as React.RefObject<HTMLVideoElement>}
        onClick={onClick}
        onLoadedMetadata={onLoadedMetadata}
        playsInline
        className="h-auto w-full rounded-lg object-contain"
        style={videoStyles}
      />
    </div>
  );
};

export default VideoEmbed;
