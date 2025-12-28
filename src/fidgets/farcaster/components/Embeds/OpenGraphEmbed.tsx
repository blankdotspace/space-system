import React, { useEffect, useState } from "react";
import Image from "next/image";
import { getYouTubeId, isYouTubeUrl } from "@/common/lib/utils/youtubeUtils";

interface OpenGraphEmbedProps {
  url: string;
}

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url?: string;
}

const OpenGraphEmbed: React.FC<OpenGraphEmbedProps> = ({ url }) => {
  const [ogData, setOgData] = useState<OpenGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string>(url);

  useEffect(() => {
    if (isYouTubeUrl(url)) {
      setIsLoading(false);
      return;
    }
    const fetchOGData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setOgData(null);
        setResolvedUrl(url);
        const response = await fetch(
          `/api/opengraph?url=${encodeURIComponent(url)}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const data = await response.json();
        setOgData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOGData();
  }, [url]);

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

  if (error || !ogData || !ogData.image) {
    return null;
  }

  const siteLabel = ogData.siteName || (() => {
    try {
      return new URL(resolvedUrl).hostname;
    } catch {
      return resolvedUrl;
    }
  })();

  return (
    <div className="w-full">
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-xl border border-foreground/10">
        <Image
          src={ogData.image}
          alt={ogData.title || "Link preview"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 50vw"
        />
        <a
          href={resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/60 px-2 py-1 text-[11px] font-medium text-white shadow-sm transition-colors hover:border-white/60"
        >
          Open
          <span aria-hidden="true">↗</span>
        </a>
        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2">
          <div className="text-xs uppercase tracking-wide text-white/80 truncate">
            {siteLabel}
          </div>
          {ogData.title && (
            <div className="text-sm font-semibold text-white line-clamp-2">
              {ogData.title}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpenGraphEmbed;
