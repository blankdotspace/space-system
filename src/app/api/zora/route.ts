import { NextRequest, NextResponse } from "next/server";

const ZORA_GRAPHQL_ENDPOINT = "https://api.zora.co/graphql";

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

    // GraphQL query for coin data
    const query = `
      query GetCoin($address: String!, $chain: Chain!) {
        zora20Token(address: $address, chain: $chain) {
          address
          name
          symbol
          marketCap
          tokenPrice {
            priceInUsdc
          }
          mediaContent {
            originalUri
            mimeType
          }
          creatorProfile {
            handle
            avatar
          }
        }
      }
    `;

    // Make GraphQL request to Zora
    const zoraResponse = await fetch(ZORA_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        query,
        variables: {
          address,
          chain: chain === 8453 ? "BASE_MAINNET" : "BASE_MAINNET", // Map chain ID to enum
        },
      }),
    });

    if (!zoraResponse.ok) {
      const errorText = await zoraResponse.text();
      console.error("Zora API error:", zoraResponse.status, errorText);
      return NextResponse.json(
        { error: `Zora API error: ${zoraResponse.statusText}` },
        { status: zoraResponse.status }
      );
    }

    const data = await zoraResponse.json();
    
    // Return in the same format as the SDK would
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in Zora API route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
