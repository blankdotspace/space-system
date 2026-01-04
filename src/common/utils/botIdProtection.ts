import type { IncomingHttpHeaders } from "node:http";
import { NextResponse, type NextRequest } from "next/server";
import { checkBotId } from "botid/server";

type BotIdProtectRoute = {
  path: string;
  method: string;
  advancedOptions?: {
    checkLevel?: "deepAnalysis" | "basic";
  };
};

type BotIdRequestLike = Request | NextRequest;

export type BotIdVerificationResult = Awaited<ReturnType<typeof checkBotId>>;

const isDevelopment = process.env.NODE_ENV !== "production";

export const botIdProtectedRoutes: BotIdProtectRoute[] = [
  { path: "/api/miniapp-discovery", method: "GET" },
  { path: "/api/miniapp-discovery", method: "POST" },
  { path: "/api/opengraph", method: "GET" },
  { path: "/api/frames", method: "GET" },
  { path: "/api/frames", method: "POST" },
  { path: "/api/iframely", method: "GET" },
  { path: "/api/rss", method: "GET" },
  { path: "/api/venice", method: "POST" },
  { path: "/api/venice/background", method: "POST" },
];

export async function enforceBotIdProtection(
  request: BotIdRequestLike,
): Promise<BotIdVerificationResult | NextResponse> {
  const verification = await checkBotId({
    advancedOptions: {
      headers: normalizeHeaders(request.headers),
    },
    developmentOptions: {
      isDevelopment,
    },
  });

  if (verification.isBot) {
    const response = NextResponse.json(
      { success: false, error: "Access denied" },
      { status: 403 },
    );
    applyBotIdHeaders(response, verification);
    return response;
  }

  return verification;
}

export function applyBotIdHeaders(
  response: NextResponse,
  verification: BotIdVerificationResult,
) {
  if (!("responseHeaders" in verification)) {
    return;
  }

  const headers = verification.responseHeaders;
  if (!headers) {
    return;
  }

  const applyHeader = (entry: { key: string; value: string }, append = false) => {
    if (append) {
      response.headers.append(entry.key, entry.value);
    } else {
      response.headers.set(entry.key, entry.value);
    }
  };

  headers.replaceHeaders?.forEach((entry) => applyHeader(entry));
  headers.addHeaders?.forEach((entry) => applyHeader(entry));
  headers.addValuesToHeaders?.forEach((entry) => applyHeader(entry, true));
}

function normalizeHeaders(headers: Headers): IncomingHttpHeaders {
  const normalized: IncomingHttpHeaders = {};

  headers.forEach((value, key) => {
    const name = key.toLowerCase();
    const existing = normalized[name];

    if (typeof existing === "undefined") {
      normalized[name] = value;
      return;
    }

    if (typeof existing === "string") {
      normalized[name] = [existing, value];
      return;
    }

    if (Array.isArray(existing)) {
      normalized[name] = [...existing, value];
    }
  });

  return normalized;
}
