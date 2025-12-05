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
    const response = await fetch(
      `https://api-sdk.zora.engineering/coin?address=${address}&chain=${chain}`,
      {
        headers: {
          "x-api-key": ZORA_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Zora API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Zora API] Error fetching coin:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch coin data" },
      { status: 500 }
    );
  }
}
