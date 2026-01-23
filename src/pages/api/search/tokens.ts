import { NextApiRequest, NextApiResponse } from "next";
import { z, ZodSchema } from "zod";
import requestHandler, { BlankspaceResponse } from "@/common/data/api/requestHandler";

interface TokenResult {
  id: string;
  name: string;
  symbol: string;
  image: string | null;
  contractAddress: string;
  network: string;
}

const QuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(5).default(5),
});

type TokenSearchResult = {
  tokens: TokenResult[];
};

const _validateQueryParams = <T extends ZodSchema>(
  req: NextApiRequest,
  schema: T,
): [z.infer<T> | null, string | null] => {
  const parseResult = schema.safeParse(req.query);

  if (parseResult.success) {
    return [parseResult.data, null];
  }

  const error = parseResult.error.errors[0];
  const errorMessage = `${error.message} (${error.path.join(".")})`;
  return [null, errorMessage];
};

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const CLANKER_BASE_URL = "https://www.clanker.world/api";

const CLANKER_CHAIN_ID_TO_NETWORK: Record<number, TokenResult["network"]> = {
  1: "mainnet",
  8453: "base",
  137: "polygon",
};

async function fetchTokenByAddress(address: string): Promise<TokenResult | null> {
  const url = `${COINGECKO_BASE_URL}/coins/ethereum/contract/${address}`;
  const res = await fetch(url, {
    headers: {
      "x-cg-demo-api-key": process.env.COINGECKO_API_KEY ?? "",
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const platformId: string = json.asset_platform_id || "ethereum";
  const platforms: Record<string, string> = json.platforms || {};
  const contractAddress =
    (platforms[platformId] || platforms.ethereum || Object.values(platforms)[0] || "").toLowerCase();
  if (!contractAddress) return null;
  return {
    id: json.id,
    name: json.name,
    symbol: json.symbol,
    image: json.image?.small || json.image?.large || json.image?.thumb || null,
    contractAddress,
    network: ({
      ethereum: "mainnet",
      "polygon-pos": "polygon",
      optimism: "optimism",
      "arbitrum-one": "arbitrum",
    } as Record<string, string>)[platformId] ?? platformId,
  };
}

async function fetchTokensByQuery(query: string, limit: number): Promise<TokenResult[]> {
  const params = new URLSearchParams({ query });
  const searchRes = await fetch(`${COINGECKO_BASE_URL}/search?${params.toString()}`, {
    headers: {
      "x-cg-demo-api-key": process.env.COINGECKO_API_KEY ?? "",
    },
  });
  if (!searchRes.ok) return [];
  const searchJson = await searchRes.json();
  const coins = Array.isArray(searchJson.coins) ? searchJson.coins.slice(0, limit) : [];

  const detailResponses = await Promise.allSettled(
    coins.map((c) =>
      fetch(`${COINGECKO_BASE_URL}/coins/${c.id}`, {
        headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY ?? "" },
      }),
    ),
  );

  const results: TokenResult[] = [];
  for (const d of detailResponses) {
    if (d.status !== "fulfilled" || !d.value.ok) continue;
    const json = await d.value.json();
    const platformId: string = json.asset_platform_id || "ethereum";
    const platforms: Record<string, string> = json.platforms || {};
    const contractAddress =
      platforms[platformId] || platforms.ethereum || Object.values(platforms)[0];
    if (!contractAddress) continue;
    results.push({
      id: json.id,
      name: json.name,
      symbol: json.symbol,
      image: json.image?.small || json.image?.large || json.image?.thumb || null,
      contractAddress,
      network: platformId === "ethereum" ? "mainnet" : platformId.replace("polygon-pos", "polygon"),
    });
    if (results.length >= limit) break;
  }

  return results;
}

type ClankerTokenResponse = {
  data?: Array<{
    contract_address?: string;
    name?: string;
    symbol?: string;
    img_url?: string | null;
    chain_id?: number;
  }>;
};

async function fetchClankerTokens(query: string, limit: number): Promise<TokenResult[]> {
  if (!query.trim() || limit <= 0) return [];

  const params = new URLSearchParams({
    q: query,
    sort: "asc",
    limit: String(limit),
  });

  try {
    const response = await fetch(`${CLANKER_BASE_URL}/tokens?${params.toString()}`);
    if (!response.ok) return [];

    const json = (await response.json()) as ClankerTokenResponse;
    if (!Array.isArray(json.data)) return [];

    const clankerTokens: TokenResult[] = [];
    for (const token of json.data) {
      if (!token?.contract_address || !token?.name || !token?.symbol) continue;

      const network = token.chain_id ? CLANKER_CHAIN_ID_TO_NETWORK[token.chain_id] : undefined;
      if (!network) continue;

      clankerTokens.push({
        id: `${token.contract_address.toLowerCase()}-${network}`,
        name: token.name,
        symbol: token.symbol,
        image: token.img_url || null,
        contractAddress: token.contract_address.toLowerCase(),
        network,
      });

      if (clankerTokens.length >= limit) break;
    }

    return clankerTokens;
  } catch (error) {
    console.error("Error fetching Clanker tokens:", error);
    return [];
  }
}

const get = async (
  req: NextApiRequest,
  res: NextApiResponse<BlankspaceResponse<TokenSearchResult>>,
) => {
  const [params, errorMessage] = _validateQueryParams(req, QuerySchema);

  if (errorMessage) {
    return res.status(400).json({ result: "error", error: { message: errorMessage } });
  }

  try {
    const { q, limit } = params!;
    const maxResults = Math.min(limit, 5);

    const coingeckoTokens = /^0x[a-fA-F0-9]{40}$/.test(q)
      ? await (async () => {
          const token = await fetchTokenByAddress(q);
          return token ? [token] : [];
        })()
      : await fetchTokensByQuery(q, maxResults);

    const clankerTokens = await fetchClankerTokens(q, maxResults);

    const combinedTokens = [...coingeckoTokens, ...clankerTokens];
    const uniqueTokens: TokenResult[] = [];
    const seen = new Set<string>();

    for (const token of combinedTokens) {
      const key = `${token.network}:${token.contractAddress.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueTokens.push(token);
      if (uniqueTokens.length >= maxResults) break;
    }

    const tokens = uniqueTokens.slice(0, maxResults);

    return res.status(200).json({ result: "success", value: { tokens } });
  } catch (err) {
    return res.status(500).json({
      result: "error",
      error: { message: err instanceof Error ? err.message : "Unknown error" },
    });
  }
};

export default requestHandler({ get });

export type { TokenResult };
