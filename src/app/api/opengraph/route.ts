import { NextRequest, NextResponse } from "next/server";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getMetaContent(html: string, property: string): string | null {
  const escapedProperty = escapeRegExp(property);
  const patterns = [
    new RegExp(
      `<meta\\s+[^>]*(?:property|name)="${escapedProperty}"[^>]*content="([^"]+)"`,
      "i",
    ),
    new RegExp(
      `<meta\\s+[^>]*content="([^"]+)"[^>]*(?:property|name)="${escapedProperty}"`,
      "i",
    ),
    new RegExp(
      `<meta\\s+[^>]*(?:property|name)='${escapedProperty}'[^>]*content='([^']+)'`,
      "i",
    ),
    new RegExp(
      `<meta\\s+[^>]*content='([^']+)'[^>]*(?:property|name)='${escapedProperty}'`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function resolveMaybeRelativeUrl(value: string | null, baseUrl: string): string | null {
  if (!value) {
    return null;
  }

  if (value.startsWith("http") || value.startsWith("data:")) {
    return value;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  // Only allow http and https URLs
  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    // If URL constructor fails, treat as unsupported
    return NextResponse.json({
      title: url,
      description: null,
      image: null,
      siteName: url,
      url,
      error: "Unsupported or invalid URL scheme"
    });
  }

  if (parsedUrl.protocol !== "https:") {
    // Only allow https URLs for security; reject http and other protocols
    return NextResponse.json({
      title: parsedUrl.hostname || url,
      description: null,
      image: null,
      siteName: parsedUrl.hostname || url,
      url,
      error: `Only https URLs are allowed. Unsupported URL protocol: ${parsedUrl.protocol}`
    });
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
      signal: AbortSignal.timeout(8000), // 8 second timeout - reduced to fail faster
    });

    if (!response.ok) {
      // Handle common HTTP errors gracefully
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

    const title =
      getMetaContent(html, "og:title") ||
      getMetaContent(html, "twitter:title") ||
      html.match(/<title>([^<]+)<\/title>/i)?.[1] ||
      null;

    const description =
      getMetaContent(html, "og:description") ||
      getMetaContent(html, "twitter:description") ||
      getMetaContent(html, "description") ||
      null;

    const rawImage =
      getMetaContent(html, "og:image") ||
      getMetaContent(html, "twitter:image") ||
      null;

    let image = resolveMaybeRelativeUrl(rawImage, url);

    let rawVideo =
      getMetaContent(html, "og:video") ||
      getMetaContent(html, "twitter:player") ||
      null;

    let video = resolveMaybeRelativeUrl(rawVideo, url);

    // Filter out video URLs from image field (e.g., .m3u8, .mp4, etc.)
    if (image) {
      const imageUrl = image.toLowerCase();
      const videoExtensions = ['.m3u8', '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv'];
      const isVideoUrl = videoExtensions.some(ext => imageUrl.includes(ext)) || 
                         imageUrl.includes('/video/') ||
                         imageUrl.includes('video/upload');
      
      if (isVideoUrl) {
        // Move video URL from image to video field
        if (!video) {
          video = image;
        }
        image = null;
      }
    }

    const siteName = getMetaContent(html, "og:site_name") || new URL(url).hostname;

    const ogData = {
      title,
      description,
      image,
      video,
      siteName,
      url,
    };

    // ...existing code...

    return NextResponse.json(ogData);
  } catch (error) {
    console.error("Error fetching OpenGraph data:", error);
    
    // Return minimal fallback data
    return NextResponse.json({
      title: parsedUrl?.hostname || url,
      description: null,
      image: null,
      video: null,
      siteName: parsedUrl?.hostname || url,
      url,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
