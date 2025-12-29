import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getYouTubeId, isYouTubeUrl } from "@/common/lib/utils/youtubeUtils";
import {
  type EmbedUrlMetadata,
  type OgObject,
} from "@neynar/nodejs-sdk/build/api/models";

interface OpenGraphEmbedProps {
  url: string;
  metadata?: EmbedUrlMetadata;
}

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url?: string;
}

const pickOgImage = (ogImage?: OgObject["ogImage"]) => {
  if (!ogImage) return undefined;
  if (typeof ogImage === "string") return ogImage;
  if (!Array.isArray(ogImage)) return undefined;
  const withUrl = ogImage.find((image) => Boolean(image?.url));
  return withUrl?.url;
};

const buildOgDataFromMetadata = (
  url: string,
  metadata?: EmbedUrlMetadata
): OpenGraphData | null => {
  const html = metadata?.html;
  if (!html) return null;

  const image = pickOgImage(html.ogImage);

  return {
    title: html.ogTitle || html.ogSiteName || html.title,
    description: html.ogDescription || html.description,
    image,
    siteName: html.ogSiteName,
    url: html.ogUrl || url,
  };
};

const OpenGraphEmbed: React.FC<OpenGraphEmbedProps> = ({ url, metadata }) => {
  const [ogData, setOgData] = useState<OpenGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isYouTubeUrl(url)) {
      setIsLoading(false);
      return;
    }

    const fromMetadata = buildOgDataFromMetadata(url, metadata);
    if (fromMetadata) {
      setOgData(fromMetadata);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const fetchOGData = async () => {
      try {
        setIsLoading(true);
        setOgData(null);
        setError(null);

        const response = await fetch(
          `/api/opengraph?url=${encodeURIComponent(url)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();

        if (!isMounted) return;

        setOgData(data);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOGData();

    return () => {
      isMounted = false;
    };
  }, [metadata, url]);

  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return (
      <div className="w-full max-w-full aspect-video rounded-xl overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube video player"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  const domain = useMemo(() => {
    try {
      return new URL(ogData?.url || url).hostname.replace(/^www\./, "");
    } catch (err) {
      console.debug("Failed to parse domain for OpenGraph embed", err);
      return "";
    }
  }, [ogData?.url, url]);

  const title = ogData?.title || ogData?.siteName || domain;

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-foreground/10 animate-pulse" />
        <div className="mt-2 h-4 w-28 rounded-full bg-foreground/10 animate-pulse" />
      </div>
    );
  }

  if (error || !ogData?.image || !title) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-2xl"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-foreground/10">
        <Image
          src={ogData.image}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
        />

        <div className="absolute bottom-3 left-3 right-3 flex">
          <div className="inline-flex max-w-full items-center rounded-lg bg-black/65 px-3 py-2 backdrop-blur-sm">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
              {title}
            </p>
          </div>
        </div>
      </div>

      {domain ? (
        <div className="mt-2 text-sm text-foreground/60">{domain}</div>
      ) : null}
    </a>
  );
};

export default OpenGraphEmbed;
