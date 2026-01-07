import type { SatoriOptions } from "satori";

const FONT_CACHE = new Map<string, Promise<ArrayBuffer>>();

const GOOGLE_FONTS_USER_AGENT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function fetchFontCss(family: string, weight: number): Promise<string> {
  const familyQuery = family.trim().split(/\s+/).join("+");
  const url = `https://fonts.googleapis.com/css2?family=${familyQuery}:wght@${weight}&display=swap`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": GOOGLE_FONTS_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load font CSS for ${family} (${response.status})`);
  }

  return response.text();
}

function extractFontUrl(fontCss: string): string | null {
  const matches = Array.from(fontCss.matchAll(/url\(([^)]+)\)/g));
  const urls = matches
    .map((match) => match[1]?.replace(/['"]/g, "").trim())
    .filter((url): url is string => Boolean(url));
  const woff2Url = urls.find((url) => url.includes(".woff2"));
  return woff2Url ?? urls[0] ?? null;
}

async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const cacheKey = `${family}-${weight}`;
  const cached = FONT_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const fontPromise = (async () => {
    const fontCss = await fetchFontCss(family, weight);
    const fontUrl = extractFontUrl(fontCss);
    if (!fontUrl) {
      throw new Error(`Unable to resolve font URL for ${family} (${weight})`);
    }
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Failed to load font file for ${family} (${response.status})`);
    }
    return response.arrayBuffer();
  })();

  FONT_CACHE.set(cacheKey, fontPromise);
  return fontPromise;
}

export async function getOgFonts(): Promise<NonNullable<SatoriOptions["fonts"]> | undefined> {
  try {
    const results = await Promise.allSettled([
      loadGoogleFont("Noto Sans", 400),
      loadGoogleFont("Noto Sans Symbols 2", 400),
    ]);

    const fonts: NonNullable<SatoriOptions["fonts"]> = [];

    if (results[0].status === "fulfilled") {
      fonts.push({
        name: "Noto Sans",
        data: results[0].value,
        weight: 400 as const,
        style: "normal" as const,
      });
    }

    if (results[1].status === "fulfilled") {
      fonts.push({
        name: "Noto Sans Symbols 2",
        data: results[1].value,
        weight: 400 as const,
        style: "normal" as const,
      });
    }

    return fonts.length > 0 ? fonts : undefined;
  } catch (error) {
    console.warn("OG font loading failed; falling back to defaults.", error);
    return undefined;
  }
}
