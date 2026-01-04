import { NextRequest, NextResponse } from "next/server";
import { getFrame } from "frames.js";
import {
  applyBotIdHeaders,
  enforceBotIdProtection,
} from "@/common/utils/botIdProtection";

// TODO: FIX BUTTON LABELS

// Helper to normalize specification to supported values
function normalizeSpecification(spec: string | null): "farcaster" | "openframes" {
  return spec === "openframes" ? "openframes" : "farcaster";
}

// SSRF protection: Block internal IP ranges and localhost
function isInternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Block private IP ranges
    const ip = hostname.split('.');
    if (ip.length === 4 && ip.every(octet => /^\d+$/.test(octet))) {
      const [a, b, _c, _d] = ip.map(Number);

      // 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
      if (a === 10) return true;

      // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 (Link-local addresses)
      if (a === 169 && b === 254) return true;

      // 0.0.0.0/8 (Current network)
      if (a === 0) return true;
    }

    // Block other localhost variations
    if (hostname.endsWith('.localhost') || hostname.includes('local')) {
      return true;
    }

    return false;
  } catch {
    return true; // If URL parsing fails, consider it unsafe
  }
}

// --- Type Definitions ---
interface FrameData {
  image: string | null;
  title: string | null;
  buttons: { label: string; action: string }[];
  inputText: boolean;
  postUrl: string | null;
  isFrame: boolean; // Whether this URL actually contains frame metadata
}

// Removed FrameObject interface since we're using frames.js types directly

// Helper: Regex-based fallback parser for frame metadata
async function parseFrameFallback(url: string): Promise<FrameData> {

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
  });
  
  if (!response.ok) {
    // Handle common HTTP errors gracefully
    if (response.status === 403) {
      throw new Error(`Access denied by ${new URL(url).hostname}. Site may be blocking automated requests.`);
    } else if (response.status === 404) {
      throw new Error(`Page not found: ${response.statusText}`);
    } else if (response.status >= 500) {
      throw new Error(`Server error from ${new URL(url).hostname}: ${response.statusText}`);
    } else {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
  }
  const html = await response.text();

  // Check for fc:frame or fc:miniapp metadata to determine if this is actually a frame/miniapp
  const hasFrameMetadata = html.includes('fc:frame') || html.includes('fc:miniapp') || html.includes('of:frame');

  // Check for JSON-based frame format (name="fc:frame" with JSON content)
  const jsonFrameMatch = html.match(/<meta\s+name="fc:frame"\s+content='([^']+)'/i) ||
    html.match(/<meta\s+name="fc:frame"\s+content="([^"]+)"/i);

  // Check for JSON-based miniapp format (name="fc:miniapp" with JSON content)
  const jsonMiniappMatch = html.match(/<meta\s+name="fc:miniapp"\s+content='([^']+)'/i) ||
    html.match(/<meta\s+name="fc:miniapp"\s+content="([^"]+)"/i);

  let jsonFrameData: any = null;
  const jsonMatch = jsonFrameMatch || jsonMiniappMatch;
  
  if (jsonMatch) {
    // Decode HTML entities before parsing JSON
    const decodedJson = jsonMatch[1]
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    
    try {
      jsonFrameData = JSON.parse(decodedJson);
    } catch (e) {
      // JSON parsing failed, continue with traditional meta tag parsing
    }
  }

  const imageMatch =
    html.match(/<meta\s+property="fc:frame:image"\s+content="([^"]+)"/i) ||
    html.match(/<meta\s+content="([^"]+)"\s+property="fc:frame:image"/i) ||
    html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
    html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
  const titleMatch =
    html.match(/<meta\s+property="fc:frame:title"\s+content="([^"]+)"/i) ||
    html.match(/<meta\s+content="([^"]+)"\s+property="fc:frame:title"/i) ||
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
    html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i) ||
    html.match(/<title>([^<]+)<\/title>/i);
  const buttonsMatch = Array.from(
    html.matchAll(/<meta\s+property="fc:frame:button:(\d+)"\s+content="([^"]+)"/gi)
  ).concat(Array.from(
    html.matchAll(/<meta\s+content="([^"]+)"\s+property="fc:frame:button:(\d+)"/gi)
  ));
  const inputTextMatch = html.match(
    /<meta\s+property="fc:frame:input:text"\s+content="([^"]+)"/i
  ) || html.match(
    /<meta\s+content="([^"]+)"\s+property="fc:frame:input:text"/i
  );
  const postUrlMatch = html.match(
    /<meta\s+property="fc:frame:post_url"\s+content="([^"]+)"/i
  ) || html.match(
    /<meta\s+content="([^"]+)"\s+property="fc:frame:post_url"/i
  );

  // --- Removed commented-out debug logs for production ---

  let imageUrl: string | null = null;
  let title: string | null = null;
  const buttons: { index: number; label: string; action: string }[] = [];

  // First, try to extract from JSON frame/miniapp data
  if (jsonFrameData) {
    if (jsonFrameData.imageUrl) {
      imageUrl = jsonFrameData.imageUrl;
    }
    if (jsonFrameData.button) {
      buttons.push({
        index: 1,
        label: jsonFrameData.button.title || "Open",
        action: "post"
      });
    }
  }

  // If no image found in JSON, try traditional meta tags
  if (!imageUrl && imageMatch) {
    imageUrl = imageMatch[1] || null;
    if (
      imageUrl &&
      typeof imageUrl === "string" &&
      !imageUrl.startsWith("http") &&
      !imageUrl.startsWith("data:")
    ) {
      const urlObj = new URL(url);
      if (imageUrl.startsWith("/")) {
        imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
      } else {
        const path = urlObj.pathname.split("/").slice(0, -1).join("/");
        imageUrl = `${urlObj.protocol}//${urlObj.host}${path}/${imageUrl}`;
      }
    }
  }

  // Extract title (prefer traditional meta tags)
  title = titleMatch ? titleMatch[1] || null : null;

  // If no buttons found in JSON, try traditional meta tags
  if (buttons.length === 0) {
    buttonsMatch.forEach((match) => {
      if (match[2] && match[1]) {
        // Pattern: property="fc:frame:button:X" content="label"
        const index = parseInt(match[1]);
        const label = match[2] || "Button";
        buttons.push({ index, label, action: "post" });
      } else if (match[1] && match[3]) {
        // Pattern: content="label" property="fc:frame:button:X"
        const index = parseInt(match[3]);
        const label = match[1] || "Button";
        buttons.push({ index, label, action: "post" });
      }
    });

    buttons.sort((a, b) => a.index - b.index);
  }
  const postUrl: string | null = postUrlMatch ? postUrlMatch[1] || url : url;

  const result = {
    image: imageUrl,
    title,
    buttons: buttons.length > 0 ? buttons.map((b) => ({ label: b.label, action: b.action })) : [{ label: "Open", action: "post" }],
    inputText: !!inputTextMatch,
    postUrl,
    isFrame: hasFrameMetadata,
  };

  return result;
}

// Removed extractFrameData function since we're using parseFrameFallback directly

// GET handler
export async function GET(request: NextRequest): Promise<Response> {
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

  const url = request.nextUrl.searchParams.get("url");
  const specification = normalizeSpecification(request.nextUrl.searchParams.get("specification"));
  const fid = request.nextUrl.searchParams.get("fid");

  if (!url) {
    return respond({ message: "Missing URL parameter" }, { status: 400 });
  }
  if (typeof url !== "string" || !url.startsWith("http")) {
    return respond({ message: "Invalid URL. Must start with http(s)://" }, { status: 400 });
  }
  if (isInternalUrl(url)) {
    return respond({ message: "Invalid URL. Internal URLs are not allowed." }, { status: 400 });
  }

  try {
    let html: string;
    {
      const urlRes = await fetch(url, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
      });
      html = await urlRes.text();
    }
    // Use the new getFrame function from frames.js
    const frameResult = await getFrame({
      htmlString: html,
      url: url,
      specification: specification,
    });

    let frameData: FrameData;
    if (frameResult.status === "success" && frameResult.frame) {
      const frame = frameResult.frame;
      frameData = {
        image: frame.image || null,
        title: null,
        buttons: frame.buttons ? frame.buttons.map(btn => ({
          label: btn.label || "Open",
          action: btn.action || "post"
        })) : [],
        inputText: !!frame.inputText,
        postUrl: frame.postUrl || url,
        isFrame: true, // frames.js successfully parsed frame metadata
      };
    } else {
      // Fall back to manual parsing if getFrame fails
      frameData = await parseFrameFallback(url);
    }

    if (!frameData.buttons || frameData.buttons.length === 0) {
      frameData.buttons = [{ label: "Open", action: "post" }];
    }

    if (fid) {
      const fidNumber = parseInt(fid as string);
      if (!isNaN(fidNumber)) {
        // FID provided for frame authentication
      }
    }

    return respond(frameData);
  } catch (err) {
    console.error("Frames API - Error fetching frame:", {
      url,
      error: err,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
    });
    return respond(
      { message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// POST handler
export async function POST(request: NextRequest): Promise<Response> {
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

  try {
    const body = await request.json();
    const { frameUrl } = body;
    const specification = normalizeSpecification(request.nextUrl.searchParams.get("specification"));

    if (!frameUrl) {
      return respond({ message: "Missing frameUrl in request body" }, { status: 400 });
    }
    if (typeof frameUrl !== "string" || !frameUrl.startsWith("http")) {
      return respond({ message: "Invalid URL. Must start with http(s)://" }, { status: 400 });
    }
    if (isInternalUrl(frameUrl)) {
      return respond({ message: "Invalid URL. Internal URLs are not allowed." }, { status: 400 });
    }

    let html: string;
    {
      const urlRes = await fetch(frameUrl, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
      });
      html = await urlRes.text();
    }
    // Use the new getFrame function from frames.js
    const frameResult = await getFrame({
      htmlString: html,
      url: frameUrl,
      specification: specification,
    });

    let frameData: FrameData;
    if (frameResult.status === "success" && frameResult.frame) {
      const frame = frameResult.frame;
      frameData = {
        image: frame.image || null,
        title: null,
        buttons: frame.buttons ? frame.buttons.map(btn => ({
          label: btn.label || "Open",
          action: btn.action || "post"
        })) : [],
        inputText: !!frame.inputText,
        postUrl: frame.postUrl || frameUrl,
        isFrame: true, // frames.js successfully parsed frame metadata
      };
    } else {
      // Fall back to manual parsing if getFrame fails
      frameData = await parseFrameFallback(frameUrl);
    }

    if (!frameData.buttons || frameData.buttons.length === 0) {
      frameData.buttons = [{ label: "Open", action: "post" }];
    }

    return respond(frameData);
  } catch (error) {
    console.error("Error processing frame action:", error);
    return respond(
      {
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}