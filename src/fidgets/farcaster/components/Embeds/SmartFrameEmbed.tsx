import React, { useState, useEffect } from "react";
import FrameV2Embed from "./FrameV2Embed";
import FrameEmbed from "./FrameEmbed";
import OpenGraphEmbed from "./OpenGraphEmbed";
import {
  isFrameV2Url,
  isLikelyFrameUrl,
} from "@/common/lib/utils/frameDetection";
import Loading from "@/common/components/molecules/Loading";

interface SmartFrameEmbedProps {
  url: string;
  allowOpenGraph?: boolean;
}

const SmartFrameEmbed: React.FC<SmartFrameEmbedProps> = ({ url, allowOpenGraph = true }) => {
  const [isFrameV2, setIsFrameV2] = useState<boolean | null>(null);
  const [isFrameV1, setIsFrameV1] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    let isCancelled = false;

    const checkFrameType = async () => {
      // Only set loading if not already cancelled
      if (!isCancelled) {
        setIsLoading(true);
      }

      try {
        // Check for obvious non-frame URLs first to avoid unnecessary async calls
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i;
        const mediaExtensions = /\.(mp4|mp3|avi|mov|wmv|wav|ogg)$/i;
        const docExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i;
        const codeExtensions = /\.(css|js|json|xml|txt)$/i;

        const isObviousNonFrame =
          imageExtensions.test(url) ||
          mediaExtensions.test(url) ||
          docExtensions.test(url) ||
          codeExtensions.test(url) ||
          /\/(assets|static|public|images|videos|downloads)\//.test(url) ||
          /github\.com.*\.(md|txt|json|ya?ml)$/.test(url) ||
          /twitter\.com\/i\/web\/status/.test(url) ||
          /x\.com\/i\/web\/status/.test(url);

        if (isObviousNonFrame) {
          if (!isCancelled) {
            setIsFrameV2(false);
            setIsFrameV1(false);
            setIsLoading(false);
          }
          return;
        }

        // Quick check for likely frame URLs
        const quickCheck = isLikelyFrameUrl(url);

        // For everything else, do the proper async frame detection
        const isV2 = await isFrameV2Url(url);

        // Check for Frame V1 using the existing heuristic (only if not V2)
        const isV1 = !isV2 && quickCheck;

        // Only update state if this effect hasn't been cancelled
        if (!isCancelled) {
          setIsFrameV2(isV2);
          setIsFrameV1(isV1);
          setIsLoading(false);
        }
      } catch (error) {
        // On error, default to false for both frame types
        if (!isCancelled) {
          setIsFrameV2(false);
          setIsFrameV1(false);
          setIsLoading(false);
        }
      }
    };

    checkFrameType();

    // Cleanup function to prevent race conditions
    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [url]);

  // Show loading state with a more neutral placeholder
  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden w-full max-w-2xl">
        <div className="animate-pulse">
          <Loading />
        </div>
      </div>
    );
  }

  // If it's a Frame V2, render with FrameV2Embed
  if (isFrameV2) {
    return <FrameV2Embed url={url} />;
  }

  // If it's a Frame V1, render with legacy FrameEmbed
  if (isFrameV1) {
    return <FrameEmbed url={url} showError={false} />;
  }

  // If it's neither Frame V1 nor V2, render as OpenGraph metadata card
  if (!allowOpenGraph) {
    return null;
  }

  return <OpenGraphEmbed url={url} />;
};

export default SmartFrameEmbed;
