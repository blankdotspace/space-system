import { NextRequest, NextResponse } from "next/server";
import RSSParser from "rss-parser";
import { isIP } from "node:net";
import {
  applyBotIdHeaders,
  enforceBotIdProtection,
} from "@/common/utils/botIdProtection";

// Instantiate RSSParser once with a timeout
const parser: RSSParser = (globalThis as any).__rssParser ??
  new RSSParser({ requestOptions: { timeout: 8000 } });
(globalThis as any).__rssParser = parser;

// SSRF protection: Block internal IP ranges and localhost
function ipToLong(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

const IPV4_RANGES: Array<[number, number]> = [
  ["0.0.0.0", "0.255.255.255"],
  ["10.0.0.0", "10.255.255.255"],
  ["100.64.0.0", "100.127.255.255"],
  ["127.0.0.0", "127.255.255.255"],
  ["169.254.0.0", "169.254.255.255"],
  ["172.16.0.0", "172.31.255.255"],
  ["192.168.0.0", "192.168.255.255"],
  ["224.0.0.0", "255.255.255.255"],
].map(([start, end]) => [ipToLong(start), ipToLong(end)]);

function inIpv4Ranges(ip: string): boolean {
  const num = ipToLong(ip);
  return IPV4_RANGES.some(([s, e]) => num >= s && num <= e);
}

function isReservedIpv6(addr: string): boolean {
  const lower = addr.toLowerCase();
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    /^fe[89ab]/.test(lower) ||
    lower.startsWith("ff")
  );
}

function isInternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Block localhost variations
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return true;
    }

    const ipType = isIP(hostname);
    if (ipType === 4 && inIpv4Ranges(hostname)) {
      return true;
    }
    if (ipType === 6 && isReservedIpv6(hostname)) {
      return true;
    }

    // Block other localhost variations
    if (hostname.endsWith(".localhost") || hostname.includes("local")) {
      return true;
    }

    return false;
  } catch {
    return true; // If URL parsing fails, consider it unsafe
  }
}

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

  if (!url) {
    return respond({ message: "Missing URL parameter" }, { status: 400 });
  }
  if (typeof url !== "string" || !url.startsWith("http")) {
    return respond(
      { message: "Invalid URL. Must start with http(s)://" },
      { status: 400 },
    );
  }
  if (isInternalUrl(url)) {
    return respond(
      { message: "Invalid URL. Internal URLs are not allowed." },
      { status: 400 },
    );
  }

  try {
    const feed = await parser.parseURL(url);

    return respond({
      title: feed.title || null,
      description: feed.description || null,
      link: feed.link || null,
      image: feed.image || null,
      items: feed.items || [],
    });
  } catch (err) {
    console.error("Error fetching RSS feed:", err);
    return respond(
      { message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
