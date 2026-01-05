import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import {
  applyBotIdHeaders,
  enforceBotIdProtection,
} from "@/common/utils/botIdProtection";

export async function GET(request: NextRequest) {
  const botCheck = await enforceBotIdProtection(request);
  if (botCheck instanceof NextResponse) {
    return botCheck;
  }

  const verification = botCheck;
  const respond = (body: unknown, init?: Parameters<typeof NextResponse.json>[1]) => {
    const response = NextResponse.json(body, init);
    applyBotIdHeaders(response, verification);
    return response;
  };

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return respond({ error: "URL parameter is required" }, { status: 400 });
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return respond(
      {
        title: url,
        description: null,
        image: null,
        siteName: url,
        url,
        error: "Unsupported or invalid URL scheme",
      },
      { status: 400 },
    );
  }

  if (parsedUrl.protocol !== "https:") {
    return respond(
      {
        title: parsedUrl.hostname || url,
        description: null,
        image: null,
        siteName: parsedUrl.hostname || url,
        url,
        error: `Only https URLs are allowed. Unsupported URL protocol: ${parsedUrl.protocol}`,
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Referer": "https://nounspace.com/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(`Access denied by ${parsedUrl.hostname}. Site may be blocking automated requests.`);
      } else if (response.status === 404) {
        throw new Error(`Page not found: ${response.statusText}`);
      } else if (response.status >= 500) {
        throw new Error(`Server error from ${parsedUrl.hostname}: ${response.statusText}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const getMetaContent = (property: string): string | null => {
      const element = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
      return element?.getAttribute("content") || null;
    };

    const title = getMetaContent("og:title") ||
      getMetaContent("twitter:title") ||
      document.querySelector("title")?.textContent ||
      null;

    const description = getMetaContent("og:description") ||
      getMetaContent("twitter:description") ||
      getMetaContent("description") ||
      null;

    const image = getMetaContent("og:image") ||
      getMetaContent("twitter:image") ||
      null;

    const siteName = getMetaContent("og:site_name") || new URL(url).hostname;

    const ogData = {
      title,
      description,
      image,
      siteName,
      url,
    };

    return respond(ogData);
  } catch (error) {
    console.error("OpenGraph API error:", error);
    return respond(
      {
        title: new URL(url).hostname,
        description: null,
        image: null,
        siteName: new URL(url).hostname,
        url,
      },
      { status: 500 },
    );
  }
}
