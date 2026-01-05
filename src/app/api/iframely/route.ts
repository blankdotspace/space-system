import { NextRequest, NextResponse } from "next/server";
import {
  applyBotIdHeaders,
  enforceBotIdProtection,
} from "@/common/utils/botIdProtection";

export const revalidate = 3600; // Cache responses for 1 hour

export async function GET(req: NextRequest) {
  const botCheck = await enforceBotIdProtection(req);
  if (botCheck instanceof NextResponse) {
    return botCheck;
  }

  const verification = botCheck;
  const respond = (body: unknown, init?: Parameters<typeof NextResponse.json>[1]) => {
    const response = NextResponse.json(body, init);
    applyBotIdHeaders(response, verification);
    return response;
  };

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return respond({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    // First check if the URL can be embedded directly
    const canBeEmbedded = await checkEmbeddability(url);

    if (canBeEmbedded) {
      // URL can be embedded directly
      return respond({
        directEmbed: true,
        url: url,
      });
    } else {
      // URL cannot be embedded directly, try Iframely
      const iframelyHtml = await getIframelyEmbed(url);
      return respond({
        directEmbed: false,
        iframelyHtml: iframelyHtml,
      });
    }
  } catch (error) {
    console.error("Error processing embed request:", error);
    return respond(
      {
        error: "Error processing embed request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function checkEmbeddability(url: string): Promise<boolean> {
  try {
    // Make a HEAD request to check headers and cache the result
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        // Some servers require a user-agent
        "User-Agent": "Mozilla/5.0 NounspaceBot/1.0",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return false;
    }

    // Check X-Frame-Options header
    const xFrameOptions = response.headers.get("X-Frame-Options");
    if (xFrameOptions) {
      const normalized = xFrameOptions.toUpperCase();
      if (normalized === "DENY") {
        return false;
      }
      if (normalized === "SAMEORIGIN") {
        return false;
      }
      if (normalized.startsWith("ALLOW-FROM")) {
        const allowedOrigin = xFrameOptions.substring(11).trim();
        // Check if nounspace.com is allowed
        return allowedOrigin.includes("nounspace.com");
      }
    }

    // Check Content-Security-Policy header for frame-ancestors directive
    const csp = response.headers.get("Content-Security-Policy");
    if (csp) {
      const frameAncestorsMatch = csp.match(/frame-ancestors\s+([^;]*)/i);
      if (frameAncestorsMatch) {
        const frameAncestors = frameAncestorsMatch[1].trim();
        if (frameAncestors === "'none'") {
          return false;
        }
        if (frameAncestors === "'self'") {
          return false;
        }
        // Check if nounspace.com is in the allowed list
        return (
          frameAncestors.includes("nounspace.com") ||
          frameAncestors.includes("*")
        );
      }
    }

    // If no restrictive headers are found, assume it can be embedded
    return true;
  } catch (error) {
    console.error("Error checking embeddability:", error);
    return false; // If there's an error checking, assume it cannot be embedded
  }
}

async function getIframelyEmbed(url: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_IFRAMELY_API_KEY;

  if (!apiKey) {
    throw new Error("Iframely API key is missing");
  }

  const response = await fetch(
    `https://iframe.ly/api/iframely?url=${encodeURIComponent(url)}&api_key=${apiKey}`,
    { next: { revalidate: 3600 } }, // Cache for 1 hour
  );

  if (!response.ok) {
    throw new Error(`Iframely API error: ${response.status}`);
  }

  const data = await response.json();
  return data.html || null;
}
