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
  const match = fontCss.match(/src: url\(([^)]+)\) format\('woff2'\)/);
  return match?.[1] ?? null;
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

export async function getOgFonts(): Promise<NonNullable<SatoriOptions["fonts"]>> {
  const [notoSans, notoSymbols] = await Promise.all([
    loadGoogleFont("Noto Sans", 400),
    loadGoogleFont("Noto Sans Symbols 2", 400),
  ]);

  return [
    {
      name: "Noto Sans",
      data: notoSans,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Noto Sans Symbols 2",
      data: notoSymbols,
      weight: 400 as const,
      style: "normal" as const,
    },
  ];
}
