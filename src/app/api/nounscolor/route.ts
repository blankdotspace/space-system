import { NextRequest, NextResponse } from "next/server";

const SOURCE_URL = "https://nounscolor.xctx.io/noun_colors_extracted.json";
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
};

type NounColors = Record<string, Record<string, number>>;

const MAX_RGB_DISTANCE = Math.sqrt(255 ** 2 * 3);

const normalizeHex = (value: string | null): string | null => {
  if (!value) return null;
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

const parseHexColor = (hex: string): [number, number, number] | null => {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;
  return [r, g, b];
};

const colorDistance = (a: [number, number, number], b: [number, number, number]) => {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "10");
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20) : 10;
  const nounLimit = Number(searchParams.get("nounLimit") ?? "6");
  const safeNounLimit = Number.isFinite(nounLimit) && nounLimit > 0 ? Math.min(nounLimit, 12) : 6;
  const matchColor = normalizeHex(searchParams.get("color"));
  const tolerance = Number(searchParams.get("tolerance") ?? "20");
  const safeTolerance = Number.isFinite(tolerance) ? Math.min(Math.max(tolerance, 0), 100) : 20;
  const targetRgb = matchColor ? parseHexColor(matchColor) : null;
  const distanceThreshold = targetRgb ? (safeTolerance / 100) * MAX_RGB_DISTANCE : null;

  try {
    const response = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "nounspace" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch Nouns color data" }, { status: response.status });
    }

    const nounData = (await response.json()) as NounColors;
    const entries = Object.entries(nounData);
    const colorCounts = new Map<string, number>();
    const nounTotals: Array<[string, number]> = [];
    const nounMatches: Array<[string, number]> = [];
    const rgbCache = new Map<string, [number, number, number]>();

    for (const [nounId, colors] of entries) {
      let nounTotal = 0;
      let matchedTotal = 0;
      for (const [hex, count] of Object.entries(colors)) {
        const normalized = hex.startsWith("#") ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
        const numericCount = Number(count);
        const safeCount = Number.isFinite(numericCount) ? numericCount : 0;
        nounTotal += safeCount;
        colorCounts.set(normalized, (colorCounts.get(normalized) ?? 0) + safeCount);
        if (targetRgb && distanceThreshold !== null && safeCount > 0) {
          let rgb = rgbCache.get(normalized);
          if (!rgb) {
            const parsed = parseHexColor(normalized);
            if (parsed) {
              rgbCache.set(normalized, parsed);
              rgb = parsed;
            }
          }
          if (rgb && colorDistance(rgb, targetRgb) <= distanceThreshold) {
            matchedTotal += safeCount;
          }
        }
      }
      nounTotals.push([nounId, nounTotal]);
      if (targetRgb && nounTotal > 0) {
        nounMatches.push([nounId, matchedTotal / nounTotal]);
      }
    }

    const totalHits = Array.from(colorCounts.values()).reduce((sum, value) => sum + value, 0);
    const sorted = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, safeLimit)
      .map(([hex, count]) => ({
        hex,
        count,
        pct: totalHits ? Math.round((count / totalHits) * 1000) / 10 : 0,
      }));

    let topNouns: string[];
    let matchPercent: number | null = null;

    if (targetRgb) {
      const sortedMatches = nounMatches
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, safeNounLimit);
      topNouns = sortedMatches.map(([id]) => id);
      matchPercent = sortedMatches[0]?.[1] ? Math.round(sortedMatches[0][1] * 1000) / 10 : 0;
    } else {
      topNouns = nounTotals
        .sort((a, b) => b[1] - a[1])
        .slice(0, safeNounLimit)
        .map(([id]) => id);
    }

    return NextResponse.json(
      {
        colors: sorted.map((entry) => entry.hex),
        topColor: sorted[0]?.hex ?? null,
        topPercent: sorted[0]?.pct ?? null,
        totalNouns: entries.length,
        nounIds: topNouns,
        matchColor,
        matchPercent,
        matchTolerance: safeTolerance,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to load Nouns color data" }, { status: 500 });
  }
}
