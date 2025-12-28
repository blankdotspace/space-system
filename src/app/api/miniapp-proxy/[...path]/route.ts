import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const normalizeProxyRoot = (proxyRoot: string) =>
  proxyRoot.endsWith("/") ? proxyRoot.slice(0, -1) : proxyRoot;

const rewriteNextAssetPrefix = (html: string, assetPrefix: string) => {
  const nextDataRegex =
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i;
  const match = html.match(nextDataRegex);
  if (!match) {
    return html;
  }

  try {
    const data = JSON.parse(match[1]);
    if (data?.assetPrefix === assetPrefix) {
      return html;
    }
    data.assetPrefix = assetPrefix;
    const updatedScript = match[0].replace(match[1], JSON.stringify(data));
    return html.replace(match[0], updatedScript);
  } catch (error) {
    console.warn("[miniapp-proxy] Failed to rewrite __NEXT_DATA__", error);
    return html;
  }
};

const rewriteHtmlUrls = (
  html: string,
  proxyRoot: string,
  targetOrigin?: string,
) => {
  const normalizedProxyRoot = normalizeProxyRoot(proxyRoot);

  const rewriteRootPath = (value: string) => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return value;
    }
    if (
      value === normalizedProxyRoot ||
      value.startsWith(`${normalizedProxyRoot}/`)
    ) {
      return value;
    }
    return `${normalizedProxyRoot}${value}`;
  };

  const rewriteAbsoluteUrl = (value: string) => {
    if (!value || !targetOrigin) {
      return value;
    }
    const isAbsolute =
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("//");
    if (!isAbsolute) {
      return value;
    }
    try {
      const parsed = new URL(value, targetOrigin);
      if (parsed.origin === targetOrigin) {
        return `${normalizedProxyRoot}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return value;
    }
    return value;
  };

  const rewriteUrlValue = (value: string) => {
    if (!value) {
      return value;
    }
    if (value.startsWith("/") && !value.startsWith("//")) {
      return rewriteRootPath(value);
    }
    return rewriteAbsoluteUrl(value);
  };

  let updated = html.replace(
    /(\s(?:src|href|action|poster)=["'])([^"']+)(["'])/gi,
    (_match, prefix, value, suffix) => {
      const rewritten = rewriteUrlValue(value);
      return `${prefix}${rewritten}${suffix}`;
    },
  );

  updated = updated.replace(
    /(\ssrcset=["'])([^"']*)(["'])/gi,
    (_match, prefix, value, suffix) => {
      const rewritten = value
        .split(",")
        .map((entry) => {
          const trimmed = entry.trim();
          if (!trimmed) {
            return entry;
          }
          const firstSpace = trimmed.search(/\s/);
          const url =
            firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
          const descriptor =
            firstSpace === -1 ? "" : trimmed.slice(firstSpace).trim();
          const nextUrl = rewriteUrlValue(url);
          return descriptor ? `${nextUrl} ${descriptor}` : nextUrl;
        })
        .join(", ");
      return `${prefix}${rewritten}${suffix}`;
    },
  );

  updated = updated.replace(
    /url\(\s*(['"]?)(\/(?!\/)[^'")]+)\1\s*\)/gi,
    (_match, quote, path) => {
      const rewritten = rewriteRootPath(path);
      return `url(${quote}${rewritten}${quote})`;
    },
  );

  updated = updated.replace(
    /url\(\s*(['"]?)(https?:\/\/[^'")]+|\/\/[^'")]+)\1\s*\)/gi,
    (_match, quote, path) => {
      const rewritten = rewriteAbsoluteUrl(path);
      return `url(${quote}${rewritten}${quote})`;
    },
  );

  return updated;
};

const stripMetaCsp = (html: string) =>
  html.replace(
    /<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi,
    "",
  );

const CONTEXT_PARAM_KEYS = new Set([
  "fid",
  "username",
  "displayName",
  "pfpUrl",
]);

const isHtmlResponse = (contentType: string | null) =>
  contentType
    ? contentType.includes("text/html") ||
      contentType.includes("application/xhtml+xml")
    : false;

const isCssResponse = (contentType: string | null) =>
  contentType ? contentType.includes("text/css") : false;

const buildTargetUrl = (
  request: NextRequest,
  pathSegments: string[] | undefined,
) => {
  if (!pathSegments || pathSegments.length === 0) {
    return null;
  }

  const [encodedOrigin, ...rest] = pathSegments;
  if (!encodedOrigin) {
    return null;
  }

  let origin: string;
  try {
    origin = decodeURIComponent(encodedOrigin);
  } catch {
    return null;
  }

  if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
    return null;
  }

  const normalizedOrigin = origin.replace(/\/$/, "");
  const restPath = rest.join("/");
  const baseTarget = restPath
    ? `${normalizedOrigin}/${restPath}`
    : `${normalizedOrigin}/`;

  const forwardedParams = new URLSearchParams(request.nextUrl.searchParams);
  CONTEXT_PARAM_KEYS.forEach((key) => forwardedParams.delete(key));
  const query = forwardedParams.toString();

  return query ? `${baseTarget}?${query}` : baseTarget;
};

const injectBaseTag = (html: string, proxyBaseHref: string) => {
  const baseTag = `<base href="${proxyBaseHref}">`;
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch && headMatch[0]) {
    const headTag = headMatch[0];
    const firstHeadIndex = html.indexOf(headTag);
    if (firstHeadIndex !== -1) {
      return (
        html.slice(0, firstHeadIndex + headTag.length) +
        "\n" +
        baseTag +
        html.slice(firstHeadIndex + headTag.length)
      );
    }
  }

  const htmlTagMatch = html.match(/<html[^>]*>/i);
  if (htmlTagMatch && htmlTagMatch[0]) {
    const firstHtmlIndex = html.indexOf(htmlTagMatch[0]);
    if (firstHtmlIndex !== -1) {
      return (
        html.slice(0, firstHtmlIndex + htmlTagMatch[0].length) +
        "\n" +
        baseTag +
        html.slice(firstHtmlIndex + htmlTagMatch[0].length)
      );
    }
  }

  return `${baseTag}\n${html}`;
};

const proxyRequest = async (request: NextRequest, targetUrl: string) => {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.set("accept-encoding", "identity");

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  const contentType = response.headers.get("content-type");
  const targetOrigin = new URL(targetUrl).origin;
  const proxyRoot = `/api/miniapp-proxy/${encodeURIComponent(targetOrigin)}`;

  if (isCssResponse(contentType)) {
    let css = await response.text();
    css = rewriteHtmlUrls(css, proxyRoot, targetOrigin);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("content-type", "text/css; charset=utf-8");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    return new NextResponse(css, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  if (!isHtmlResponse(contentType)) {
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  let html = await response.text();
  const targetBasePath = new URL(".", targetUrl).pathname;
  const proxyBaseHref = `${proxyRoot}${targetBasePath}`;

  html = stripMetaCsp(html);
  html = injectBaseTag(html, proxyBaseHref);
  html = rewriteHtmlUrls(html, proxyRoot, targetOrigin);
  html = rewriteNextAssetPrefix(html, proxyRoot);

  return new NextResponse(html, {
    status: response.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

type RouteHandlerContext = {
  params: Promise<any>;
};

const getPathSegments = (params?: Record<string, string | string[] | undefined>) => {
  const pathValue = params?.path;
  if (!pathValue) {
    return undefined;
  }
  return Array.isArray(pathValue) ? pathValue : [pathValue];
};

const handle = async (
  request: NextRequest,
  context: RouteHandlerContext,
) => {
  const params = (await context.params) as Record<
    string,
    string | string[] | undefined
  >;
  const targetUrl = buildTargetUrl(request, getPathSegments(params));
  if (!targetUrl) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  return proxyRequest(request, targetUrl);
};

export async function GET(
  request: NextRequest,
  context: RouteHandlerContext,
) {
  return handle(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: RouteHandlerContext,
) {
  return handle(request, context);
}

export async function POST(
  request: NextRequest,
  context: RouteHandlerContext,
) {
  return handle(request, context);
}

export async function PUT(
  request: NextRequest,
  context: RouteHandlerContext,
) {
  return handle(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: RouteHandlerContext,
) {
  return handle(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: RouteHandlerContext,
) {
  return handle(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: RouteHandlerContext,
) {
  return handle(request, context);
}
