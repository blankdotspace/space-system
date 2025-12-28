import React, { useCallback, useEffect, useMemo, useState } from "react";

const NOUNS_BG_SWATCHES = ["#d5d7e1", "#e1d7d5"] as const;
const DEFAULT_NOUN_LIMIT = 6;
const DEFAULT_TOLERANCE = 20;

type NounsColorResponse = {
  colors?: string[];
  topColor?: string | null;
  topPercent?: number | null;
  totalNouns?: number;
  nounIds?: string[];
  matchColor?: string | null;
  matchPercent?: number | null;
  matchTolerance?: number;
};

const normalizeHex = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (raw.length === 3 && /^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split("").map((ch) => ch + ch).join("").toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  return null;
};

export const isNounsColorUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "nounscolor.xctx.io";
  } catch {
    return false;
  }
};

const NounsColorEmbed: React.FC<{ url: string }> = ({ url }) => {
  const [colors, setColors] = useState<string[]>([]);
  const [topColor, setTopColor] = useState<string | null>(null);
  const [topPercent, setTopPercent] = useState<number | null>(null);
  const [matchPercent, setMatchPercent] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#d5d7e1");
  const [colorInput, setColorInput] = useState<string>("#D5D7E1");
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);
  const [hasCustomColor, setHasCustomColor] = useState(false);
  const [nounIds, setNounIds] = useState<string[]>([]);
  const [totalNouns, setTotalNouns] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const placeholderSwatches = useMemo(() => Array.from({ length: 10 }, (_, idx) => idx), []);
  const placeholderNouns = useMemo(
    () => Array.from({ length: DEFAULT_NOUN_LIMIT }, (_, idx) => idx),
    []
  );

  const handleRefresh = useCallback(() => {
    setRefreshToken(Date.now());
  }, []);

  const handleCopyColor = useCallback(async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopiedColor(color);
    } catch (error) {
      setCopiedColor(null);
    }
  }, []);

  const handleColorInputChange = useCallback((value: string) => {
    setColorInput(value);
    const normalized = normalizeHex(value);
    if (normalized) {
      setSelectedColor(normalized);
      setColorInput(normalized.toUpperCase());
      setHasCustomColor(true);
    }
  }, []);

  const handleColorPickerChange = useCallback((value: string) => {
    const normalized = normalizeHex(value);
    if (!normalized) return;
    setSelectedColor(normalized);
    setColorInput(normalized.toUpperCase());
    setHasCustomColor(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPalette = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const params = new URLSearchParams({
          limit: "10",
          nounLimit: String(DEFAULT_NOUN_LIMIT),
          ts: String(refreshToken),
          tolerance: String(tolerance),
        });
        if (selectedColor) {
          params.set("color", selectedColor);
        }
        const response = await fetch(`/api/nounscolor?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch palette");
        const data = (await response.json()) as NounsColorResponse;
        if (cancelled) return;
        if (Array.isArray(data.colors) && data.colors.length > 0) {
          setColors(data.colors);
        }
        if (data.topColor) {
          setTopColor(data.topColor);
          if (!hasCustomColor && normalizeHex(data.topColor)) {
            const normalized = normalizeHex(data.topColor)!;
            setSelectedColor(normalized);
            setColorInput(normalized.toUpperCase());
          }
        }
        if (typeof data.topPercent === "number") {
          setTopPercent(data.topPercent);
        }
        if (typeof data.matchPercent === "number") {
          setMatchPercent(data.matchPercent);
        } else {
          setMatchPercent(null);
        }
        if (Array.isArray(data.nounIds) && data.nounIds.length > 0) {
          setNounIds(data.nounIds);
        }
        if (typeof data.totalNouns === "number") {
          setTotalNouns(data.totalNouns);
        }
      } catch (error) {
        setHasError(true);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPalette();
    return () => {
      cancelled = true;
    };
  }, [refreshToken, selectedColor, tolerance, hasCustomColor]);

  useEffect(() => {
    if (!copiedColor) return;
    const timeout = window.setTimeout(() => {
      setCopiedColor(null);
    }, 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedColor]);

  return (
    <div className="w-full">
      <div className="w-full overflow-hidden rounded-xl border border-foreground/15 bg-background/70 shadow-sm">
        <div className="relative bg-gradient-to-r from-[#e1d7d5]/70 via-[#d5d7e1]/60 to-[#f1f5f9] px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/60">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-foreground/10 text-foreground/70 font-semibold">
              N
            </span>
            <span>Nouns Color Explorer</span>
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center rounded-full border border-foreground/15 bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground/70 shadow-sm transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              Refresh
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-foreground/15 bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground/70 shadow-sm transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              Open site
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="mt-1 text-base font-semibold text-foreground">
            Discover Nouns by palette
          </div>
          <div className="text-sm text-foreground/70">
            Match hex colors to Noun traits.
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative inline-flex h-8 w-8 rounded-lg border border-foreground/10">
              <span
                className="h-full w-full rounded-lg"
                style={{ backgroundColor: selectedColor || "rgba(15, 23, 42, 0.1)" }}
              />
              <input
                type="color"
                aria-label="Pick color"
                value={selectedColor}
                onChange={(event) => handleColorPickerChange(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
            <input
              type="text"
              value={colorInput}
              onChange={(event) => handleColorInputChange(event.target.value)}
              onBlur={() => setColorInput(selectedColor.toUpperCase())}
              className="w-24 rounded-lg border border-foreground/10 bg-background px-2 py-1 text-xs font-semibold uppercase text-foreground"
              aria-label="Hex color"
            />
            <div className="ml-auto rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium text-foreground/70">
              {matchPercent !== null
                ? `Match ${matchPercent}%`
                : topPercent !== null
                  ? `Top color ${topPercent}%`
                  : "Top color"}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-foreground/60">
            <span className="font-medium">Tolerance</span>
            <input
              type="range"
              min={0}
              max={100}
              value={tolerance}
              onChange={(event) => setTolerance(Number(event.target.value))}
              className="h-1 flex-1 cursor-pointer"
            />
            <span className="min-w-[36px] text-right">{tolerance}</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-fuchsia-500 transition-[width] duration-500"
              style={{
                width:
                  matchPercent !== null
                    ? `${Math.min(matchPercent, 100)}%`
                    : topPercent
                      ? `${Math.min(topPercent, 100)}%`
                      : "60%",
              }}
            />
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {colors.length
              ? colors.map((color) => (
                  <button
                    type="button"
                    key={color}
                    className="h-5 w-5 rounded-full border border-foreground/10"
                    style={{ backgroundColor: color }}
                    aria-label={`Copy ${color}`}
                    onClick={() => handleCopyColor(color)}
                  />
                ))
              : placeholderSwatches.map((idx) => (
                  <span
                    key={idx}
                    className="h-5 w-5 rounded-full border border-foreground/10 bg-foreground/10"
                    aria-hidden="true"
                  />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-foreground/60">
            <span className="font-medium">Backgrounds</span>
            {NOUNS_BG_SWATCHES.map((color) => (
              <span
                key={color}
                className="h-4 w-4 rounded-full border border-foreground/10"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
            ))}
            {copiedColor && (
              <span className="ml-auto rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] text-foreground/70">
                Copied {copiedColor.toUpperCase()}
              </span>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span className="font-medium">Top Nouns</span>
              {totalNouns ? <span>{totalNouns} total</span> : null}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {nounIds.length
                ? nounIds.map((nounId) => (
                    <a
                      key={nounId}
                      href={`https://nouns.wtf/noun/${nounId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square overflow-hidden rounded-lg border border-foreground/10 bg-white/80 transition-transform hover:-translate-y-0.5"
                    >
                      <img
                        src={`https://noun.pics/${nounId}.svg`}
                        alt={`Noun ${nounId}`}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        decoding="async"
                        style={{ imageRendering: "pixelated" }}
                      />
                      <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                        #{nounId}
                      </div>
                    </a>
                  ))
                : placeholderNouns.map((idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-lg border border-foreground/10 bg-foreground/10"
                      aria-hidden="true"
                    />
                  ))}
            </div>
          </div>

          <div className="mt-3 text-xs text-foreground/50">
            {isLoading ? "Loading live palette..." : hasError ? "Palette unavailable" : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NounsColorEmbed;
