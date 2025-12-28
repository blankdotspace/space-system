import React, { useEffect, useState } from "react";

export const isHighlightUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "highlight.xyz" || parsed.hostname === "www.highlight.xyz";
  } catch {
    return false;
  }
};

type HighlightOgData = {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

const HighlightEmbed: React.FC<{ url: string }> = ({ url }) => {
  const [ogData, setOgData] = useState<HighlightOgData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadOg = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const response = await fetch(`/api/opengraph?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error("Failed to fetch OG");
        const data = (await response.json()) as HighlightOgData;
        if (!cancelled) {
          setOgData(data);
        }
      } catch (error) {
        if (!cancelled) {
          setHasError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadOg();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const title = ogData?.title || "Create and collect NFTs";
  const description = ogData?.description || "Launch collections, mint, and explore creators.";
  const image = ogData?.image;
  const siteLabel = ogData?.siteName || "Highlight";
  const domainLabel = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "highlight.xyz";
    }
  })();

  if (isLoading) {
    return (
      <div className="w-full rounded-xl border border-foreground/15 bg-background/50 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded bg-foreground/10" />
          <div className="h-24 w-full rounded-lg bg-foreground/10" />
          <div className="h-3 w-2/3 rounded bg-foreground/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl border border-foreground/15 bg-background/70 shadow-sm">
        <div className="relative w-full bg-black/90">
          {image ? (
            <img
              src={image}
              alt={title}
              className="mx-auto max-h-60 w-auto max-w-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="h-40 w-full bg-gradient-to-br from-[#0b0b0f] via-[#14161d] to-[#1f2937]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/0" />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/60 px-2 py-1 text-[11px] font-medium text-white shadow-sm transition-colors hover:border-white/60"
          >
            Open
            <span aria-hidden="true">↗</span>
          </a>
          <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/15 text-[11px]">
              H
            </span>
            {siteLabel}
          </div>
          <div className="absolute inset-x-3 bottom-3 text-white">
            <div className="text-[11px] uppercase tracking-wide text-white/80">{domainLabel}</div>
            <div className="text-base font-semibold line-clamp-2">{title}</div>
          </div>
        </div>
        <div className="px-4 py-4">
          <div className="text-sm text-foreground/70 line-clamp-3">{description}</div>
        </div>
      </div>
    </div>
  );
};

export default HighlightEmbed;
