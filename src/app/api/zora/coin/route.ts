import { NextRequest, NextResponse } from "next/server";

// Server-side only - API key is not exposed to client
const ZORA_API_KEY = process.env.ZORA_API_KEY;

// Validate API key at build/startup time
if (!ZORA_API_KEY && process.env.NODE_ENV === "production") {
  console.warn("[Zora API] ZORA_API_KEY not configured - Zora Coins fidget will not work");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");
  const chain = searchParams.get("chain") || "8453";

  if (!address) {
    return NextResponse.json({ error: "Missing address parameter" }, { status: 400 });
  }

  if (!ZORA_API_KEY) {
    return NextResponse.json(
      { error: "Zora API key not configured on server" },
      { status: 500 }
    );
  }

  try {
    // Build URL with proper encoding to prevent injection
    const url = new URL('https://api-sdk.zora.engineering/coin');
    url.searchParams.set('address', address);
    url.searchParams.set('chain', chain);

    // Add timeout to prevent hanging requests
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url.toString(), {
        headers: {
          "x-api-key": ZORA_API_KEY,
        },
        signal: abortController.signal,
      });

      // Clear timeout on successful response
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `Zora API error: ${response.status} ${errorText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
    
    // Debug logging to see what Zora API returns
    console.log("[Zora API] Response data:", JSON.stringify(data, null, 2));
    if (data?.zora20Token?.mediaContent) {
      console.log("[Zora API] Media content:", data.zora20Token.mediaContent);
    }
    
    return NextResponse.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout - Zora API took too long to respond' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("[Zora API] Error fetching coin:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch coin data" },
      { status: 500 }
    );
  }
}
