import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const normalizeProxyRoot = (proxyRoot: string) =>
  proxyRoot.endsWith("/") ? proxyRoot.slice(0, -1) : proxyRoot;

const rewriteHtmlUrls = (html: string, proxyRoot: string) => {
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

  let updated = html.replace(
    /(\s(?:src|href|action|poster)=["'])([^"']+)(["'])/gi,
    (_match, prefix, value, suffix) => {
      const rewritten = rewriteRootPath(value);
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
          const nextUrl = rewriteRootPath(url);
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

  return updated;
};

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
  const targetOrigin = new URL(targetUrl).origin;
  const proxyRoot = `/api/miniapp-proxy/${encodeURIComponent(targetOrigin)}`;
  const targetBasePath = new URL(".", targetUrl).pathname;
  const proxyBaseHref = `${proxyRoot}${targetBasePath}`;

  html = injectBaseTag(html, proxyBaseHref);
  html = rewriteHtmlUrls(html, proxyRoot);

  return new NextResponse(html, {
    status: response.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

const handle = async (
  request: NextRequest,
  context: { params: { path: string[] } },
) => {
  const targetUrl = buildTargetUrl(request, context.params.path);
  if (!targetUrl) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  return proxyRequest(request, targetUrl);
};

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return handle(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return handle(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return handle(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return handle(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return handle(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return handle(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return handle(request, context);
}
