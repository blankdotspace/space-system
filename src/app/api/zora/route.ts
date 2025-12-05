import { NextRequest, NextResponse } from "next/server";
import { getCoin, setApiKey } from "@zoralabs/coins-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, chain } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Zora API key not configured" },
        { status: 500 }
      );
    }

    // Set API key for SDK
    setApiKey(apiKey);

    // Use the SDK to fetch coin data
    const response = await getCoin({
      address: address as `0x${string}`,
      chain: chain || 8453,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in Zora API route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
