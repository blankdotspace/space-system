import { isAddress } from "viem";

const CLANKER_API_BASE = "https://www.clanker.world/api/";

export interface ClankerTokenMetadata {
  auditUrls?: string[];
  description?: string;
  socialMediaUrls?: string[];
  [key: string]: unknown;
}

export interface ClankerDeployConfig {
  devBuyAmount?: number;
  lockupPercentage?: number;
  vestingUnlockDate?: number;
  [key: string]: unknown;
}

export interface ClankerDeployedToken {
  id: number;
  created_at: string;
  tx_hash: string;
  contract_address: string;
  requestor_fid: number | null;
  name: string;
  symbol: string;
  img_url?: string | null;
  pool_address?: string | null;
  cast_hash?: string | null;
  type?: string | null;
  pair?: string | null;
  chain_id?: number | null;
  metadata?: ClankerTokenMetadata | string | null;
  deploy_config?: ClankerDeployConfig | string | null;
  social_context?: Record<string, unknown> | string | null;
  deployed_at?: string | null;
  msg_sender?: string | null;
  factory_address?: string | null;
  locker_address?: string | null;
  warnings?: unknown[];
  starting_market_cap?: number | null;
  pool_config?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ClankerTokensResponse {
  data: ClankerDeployedToken[];
  hasMore: boolean;
  total: number;
}

export interface ClankerFeeTokenInfo {
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  [key: string]: unknown;
}

export interface ClankerUncollectedFeesResponse {
  lockerAddress: string;
  lpNftId?: number;
  token0UncollectedRewards?: string;
  token1UncollectedRewards?: string;
  token0?: ClankerFeeTokenInfo | null;
  token1?: ClankerFeeTokenInfo | null;
  [key: string]: unknown;
}

export type ClankerVersion = "v4" | "v3_1" | "unknown";

export interface ClankerManagerTokenResult {
  token: ClankerDeployedToken;
  version: ClankerVersion;
  uncollectedFees: ClankerUncollectedFeesResponse | null;
  uncollectedFeesError?: string;
  requiresRewardRecipient: boolean;
  missingRewardRecipient: boolean;
}

export interface ClankerManagerApiResponse {
  data: ClankerManagerTokenResult[];
  hasMore: boolean;
  total: number;
  page: number;
  rewardRecipientAddress?: string;
}

function requireApiKey(): string {
  const key = process.env.CLANKER_API_KEY;
  if (!key) {
    throw new Error("Clanker API key is not configured");
  }
  return key;
}

async function clankerFetch<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
  const apiKey = requireApiKey();
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, CLANKER_API_BASE);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      text ? `Clanker API request failed (${response.status}): ${text}` : `Clanker API request failed (${response.status})`,
    );
  }

  return (await response.json()) as T;
}

export async function fetchTokensDeployedByAddress(address: string, page = 1): Promise<ClankerTokensResponse> {
  if (!isAddress(address)) {
    throw new Error("Invalid Ethereum address provided");
  }

  return clankerFetch<ClankerTokensResponse>("/tokens/fetch-deployed-by-address", {
    address,
    page,
  });
}

export async function fetchUncollectedFees(options: {
  contractAddress: string;
  rewardRecipientAddress?: string;
  version: ClankerVersion;
}): Promise<ClankerUncollectedFeesResponse> {
  const { contractAddress, rewardRecipientAddress, version } = options;

  if (!isAddress(contractAddress)) {
    throw new Error("Invalid contract address provided");
  }

  const path = `/get-estimated-uncollected-fees/${contractAddress}`;
  const queryParams: Record<string, string | undefined> = {};

  if (version === "v4") {
    if (!rewardRecipientAddress || !isAddress(rewardRecipientAddress)) {
      throw new Error("Valid reward recipient address required for v4 tokens");
    }
    queryParams.rewardRecipientAddress = rewardRecipientAddress;
  }

  return clankerFetch<ClankerUncollectedFeesResponse>(path, queryParams);
}

export function determineClankerVersion(tokenType?: string | null): ClankerVersion {
  if (!tokenType) {
    return "unknown";
  }

  if (tokenType.toLowerCase().includes("v4")) {
    return "v4";
  }

  if (tokenType.toLowerCase().includes("v3")) {
    return "v3_1";
  }

  return "unknown";
}
