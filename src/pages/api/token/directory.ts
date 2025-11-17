import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { chunk } from "lodash";
import { formatUnits, type Address } from "viem";
import { mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import {
  getEnsName as wagmiGetEnsName,
  getEnsAvatar as wagmiGetEnsAvatar,
} from "wagmi/actions";
import { http } from "@wagmi/core";

import requestHandler, {
  type NounspaceResponse,
} from "@/common/data/api/requestHandler";
import neynar from "@/common/data/api/neynar";
import { fetchTokenData } from "@/common/lib/utils/fetchTokenData";
import type { EtherScanChainName } from "@/constants/etherscanChainIds";
import { ALCHEMY_API } from "@/constants/urls";

const DIRECTORY_QUERY_SCHEMA = z.object({
  network: z.enum(["base", "polygon", "mainnet"]),
  contractAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid contract address format"),
  pageSize: z.coerce.number().int().positive().max(1000).default(1000),
  // Whether to fetch ERC20 token holders or NFT owners
  assetType: z.enum(["token", "nft"]).default("token"),
  viewerFid: z.coerce.number().int().positive().optional(),
});

const NEYNAR_LOOKUP_BATCH_SIZE = 25;
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/i;

type DirectoryQuery = z.infer<typeof DIRECTORY_QUERY_SCHEMA>;
type DirectoryNetwork = DirectoryQuery["network"];

type AlchemyNftTokenBalance = {
  tokenId?: string | null;
  balance?: string | null;
};

// Generic holder record used internally regardless of source API
type AlchemyNftOwner = {
  ownerAddress?: string | null;
  tokenBalances?: AlchemyNftTokenBalance[] | null;
};

// Keep for reference in case we need to parse Alchemy responses again
type _AlchemyNftOwnersResponse = {
  owners?: AlchemyNftOwner[] | null;
  ownerAddresses?: AlchemyNftOwner[] | null;
  pageKey?: string | null;
  totalCount?: number | string | null;
  contractMetadata?: {
    name?: string | null;
    symbol?: string | null;
    tokenType?: string | null;
  } | null;
};

type RawAlchemyOwnerRecord = AlchemyNftOwner & {
  address?: string | null;
  balance?: string | null;
  tokenBalance?: string | null;
  tokenCount?: string | null;
  ownershipTokens?: Array<{
    tokenId?: string | null;
    balance?: string | null;
    tokenBalance?: string | null;
    tokenCount?: string | null;
  }> | null;
};

type NeynarBulkUsersResponse = Awaited<
  ReturnType<typeof neynar.fetchBulkUsersByEthOrSolAddress>
>;

type NeynarUser = NeynarBulkUsersResponse extends Record<string, infer V>
  ? V extends Array<infer U>
    ? U
    : never
  : never;

type DirectoryMemberViewerContext = {
  following?: boolean | null;
} | null;

type DirectoryMember = {
  address: string;
  balanceRaw: string;
  balanceFormatted: string;
  username?: string | null;
  displayName?: string | null;
  fid?: number | null;
  pfpUrl?: string | null;
  followers?: number | null;
  lastTransferAt?: string | null;
  ensName?: string | null;
  ensAvatarUrl?: string | null;
  primaryAddress?: string | null;
  etherscanUrl?: string | null;
  xHandle?: string | null;
  xUrl?: string | null;
  githubHandle?: string | null;
  githubUrl?: string | null;
  viewerContext?: DirectoryMemberViewerContext;
};

type DirectoryApiResponse = {
  fetchedAt: string;
  members: DirectoryMember[];
  tokenSymbol: string | null;
  tokenDecimals: number | null;
};

type DirectoryErrorResponse = {
  message: string;
};

type DirectoryDependencies = {
  fetchFn: typeof fetch;
  neynarClient: typeof neynar;
  getEnsNameFn: (address: Address) => Promise<string | null>;
  getEnsAvatarFn: (name: string) => Promise<string | null>;
};

let ensLookupConfig: ReturnType<typeof createConfig> | null = null;

function getEnsLookupConfig() {
  if (!ensLookupConfig) {
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_ALCHEMY_API_KEY is not configured");
    }

    ensLookupConfig = createConfig({
      chains: [mainnet],
      transports: {
        [mainnet.id]: http(`${ALCHEMY_API("eth")}v2/${apiKey}`),
      },
    });
  }

  return ensLookupConfig;
}

function ensureAlchemyApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_ALCHEMY_API_KEY is not configured");
  }
  return apiKey;
}

function getAlchemyNetwork(network: DirectoryNetwork): "eth" | "base" | "polygon" | null {
  switch (network) {
    case "mainnet":
      return "eth";
    case "base":
      return "base";
    case "polygon":
      return "polygon";
    default:
      return null;
  }
}

function normalizeAlchemyOwnerRecord(
  record: RawAlchemyOwnerRecord | null | undefined,
): AlchemyNftOwner | null {
  if (!record) {
    return null;
  }

  const ownerAddress =
    typeof record.ownerAddress === "string" && record.ownerAddress
      ? record.ownerAddress
      : typeof record.address === "string" && record.address
        ? record.address
        : null;
  if (!ownerAddress) {
    return null;
  }

  const tokenBalanceSource =
    Array.isArray(record.tokenBalances) && record.tokenBalances.length > 0
      ? record.tokenBalances
      : Array.isArray(record.ownershipTokens) && record.ownershipTokens.length > 0
        ? record.ownershipTokens
        : null;

  const normalizedBalances =
    tokenBalanceSource && tokenBalanceSource.length > 0
      ? tokenBalanceSource.map((tokenBalance: Record<string, any> | null) => {
          if (!tokenBalance) {
            return { balance: "1" };
          }
          const balanceValue =
            (tokenBalance as { balance?: string | null }).balance ??
            (tokenBalance as { tokenBalance?: string | null }).tokenBalance ??
            (tokenBalance as { tokenCount?: string | null }).tokenCount ??
            "1";
          const tokenId =
            (tokenBalance as { tokenId?: string | null }).tokenId ??
            (tokenBalance as { token_id?: string | null }).token_id ??
            null;
          return {
            tokenId,
            balance: balanceValue ?? "1",
          };
        })
      : [
          {
            balance:
              record.balance ??
              record.tokenBalance ??
              record.tokenCount ??
              "1",
          },
        ];

  return {
    ownerAddress,
    tokenBalances: normalizedBalances,
  };
}

const defaultDependencies: DirectoryDependencies = {
  fetchFn: fetch,
  neynarClient: neynar,
  getEnsNameFn: (address) => wagmiGetEnsName(getEnsLookupConfig(), { address }),
  getEnsAvatarFn: (name) => wagmiGetEnsAvatar(getEnsLookupConfig(), { name }),
};

type EnsMetadata = {
  ensName: string | null;
  ensAvatarUrl: string | null;
  twitterHandle: string | null;
  twitterUrl: string | null;
  githubHandle: string | null;
  githubUrl: string | null;
  primaryAddress: string | null;
};

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function isAddress(value: string): boolean {
  return ADDRESS_REGEX.test(value);
}

function extractOwnerAddress(owner: AlchemyNftOwner): string | null {
  if (typeof owner.ownerAddress === "string" && owner.ownerAddress) {
    return owner.ownerAddress;
  }
  return null;
}

function parseBalanceValue(value: string | null | undefined): bigint {
  if (!value) {
    return 0n;
  }

  try {
    if (value.startsWith("0x") || value.startsWith("0X")) {
      return BigInt(value);
    }
    return BigInt(value);
  } catch (error) {
    console.error("Unable to parse token balance", value, error);
    return 0n;
  }
}

function extractOwnerBalanceRaw(owner: AlchemyNftOwner): string {
  if (!Array.isArray(owner.tokenBalances) || owner.tokenBalances.length === 0) {
    return "0";
  }

  const total = owner.tokenBalances.reduce((sum, tokenBalance) => {
    return sum + parseBalanceValue(tokenBalance?.balance ?? null);
  }, 0n);

  return total.toString();
}

function parseSocialRecord(
  value: unknown,
  platform: "twitter" | "github",
): { handle: string; url: string } | null {
  if (typeof value !== "string") {
    return null;
  }

  let handle = value.trim();
  if (!handle) {
    return null;
  }

  const patterns =
    platform === "twitter"
      ? [
          /^https?:\/\/(www\.)?twitter\.com\//i,
          /^https?:\/\/(www\.)?x\.com\//i,
        ]
      : [/^https?:\/\/(www\.)?github\.com\//i];

  for (const pattern of patterns) {
    handle = handle.replace(pattern, "");
  }

  handle = handle.replace(/^@/, "");
  handle = handle.replace(/\/+$/, "");

  if (!handle) {
    return null;
  }

  const url =
    platform === "twitter"
      ? `https://twitter.com/${handle}`
      : `https://github.com/${handle}`;

  return { handle, url };
}

// Moralis helpers and types
function getMoralisChain(network: DirectoryNetwork): string {
  // Prefer hex chain IDs for widest Moralis compatibility
  switch (network) {
    case "mainnet":
      return "0x1"; // Ethereum mainnet
    case "polygon":
      return "0x89"; // Polygon mainnet
    case "base":
      return "0x2105"; // Base mainnet
    default:
      return "0x1";
  }
}

function getMoralisChainFallbacks(network: DirectoryNetwork): string[] {
  // Try both hex and named identifiers for resilience
  switch (network) {
    case "mainnet":
      return ["0x1", "eth"];
    case "polygon":
      return ["0x89", "polygon"];
    case "base":
      return ["0x2105", "base"];
    default:
      return ["0x1", "eth"];
  }
}

type MoralisErc20Holder = {
  // Common fields seen across Moralis responses
  address?: string | null;
  wallet_address?: string | null;
  owner_address?: string | null;
  balance?: string | number | null;
  total?: string | number | null;
  value?: string | number | null;
  decimals?: number | string | null;
  symbol?: string | null;
};

type MoralisErc20HoldersResponse = {
  result?: MoralisErc20Holder[] | null;
  cursor?: string | null;
  next?: string | null;
  page_size?: number | null;
  total?: number | null;
  // Sometimes included on response level
  decimals?: number | string | null;
  token_decimals?: number | string | null;
  symbol?: string | null;
  token_symbol?: string | null;
};

function ensureMoralisApiKey(): string {
  const apiKey = process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_API_KEY;
  if (!apiKey) {
    throw new Error("MORALIS_API_KEY is not configured");
  }
  return apiKey;
}

async function fetchAlchemyNftOwners(
  params: DirectoryQuery,
  deps: DirectoryDependencies,
): Promise<{
  holders: AlchemyNftOwner[];
  tokenDecimals: number | null;
  tokenSymbol: string | null;
  updatedAt: string;
}> {
  const apiKey = ensureAlchemyApiKey();
  const alchemyNetwork = getAlchemyNetwork(params.network);
  if (!alchemyNetwork) {
    throw new Error(`Alchemy NFT owners are not supported on ${params.network}`);
  }

  const baseEndpoint = `${ALCHEMY_API(alchemyNetwork)}nft/v3/${apiKey}/getOwnersForContract`;
  const holders: AlchemyNftOwner[] = [];
  const updatedAt: string = new Date().toISOString();
  let tokenSymbol: string | null = null;
  let pageKey: string | undefined;

  while (holders.length < params.pageSize) {
    const url = new URL(baseEndpoint);
    url.searchParams.set("contractAddress", params.contractAddress);
    url.searchParams.set("withTokenBalances", "true");
    const remaining = params.pageSize - holders.length;
    if (remaining > 0) {
      url.searchParams.set("pageSize", String(Math.min(remaining, 100)));
    }
    if (pageKey) {
      url.searchParams.set("pageKey", pageKey);
    }

    const response = await deps.fetchFn(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Failed to fetch NFT owners from Alchemy (status ${response.status}): ${message}`,
      );
    }

    const payload = (await response.json()) as _AlchemyNftOwnersResponse;
    if (tokenSymbol === null) {
      tokenSymbol = payload.contractMetadata?.symbol ?? null;
    }
    const records = Array.isArray(payload.owners)
      ? payload.owners
      : Array.isArray(payload.ownerAddresses)
        ? payload.ownerAddresses
        : [];

    for (const record of records as RawAlchemyOwnerRecord[]) {
      const normalized = normalizeAlchemyOwnerRecord(record);
      if (!normalized) continue;
      holders.push(normalized);
      if (holders.length >= params.pageSize) {
        break;
      }
    }

    pageKey = payload.pageKey ?? undefined;
    if (!pageKey) {
      break;
    }
  }

  return {
    holders: holders.slice(0, params.pageSize),
    tokenDecimals: 0,
    tokenSymbol,
    updatedAt,
  };
}

async function fetchMoralisTokenHolders(
  params: DirectoryQuery,
  deps: DirectoryDependencies,
): Promise<{
  holders: AlchemyNftOwner[];
  tokenDecimals: number | null;
  tokenSymbol: string | null;
  updatedAt: string;
}> {
  const apiKey = ensureMoralisApiKey();
  const baseUrl = "https://deep-index.moralis.io/api/v2.2";
  const chainCandidates = getMoralisChainFallbacks(params.network);

  const holders: AlchemyNftOwner[] = [];
  let tokenDecimals: number | null = null;
  let tokenSymbol: string | null = null;
  const updatedAt: string = new Date().toISOString();
  let cursor: string | undefined;
  let chainIndex = 0;

  while (holders.length < params.pageSize) {
    const remaining = params.pageSize - holders.length;
    const url = new URL(
      `${baseUrl}/erc20/${params.contractAddress}/owners`,
    );
    url.searchParams.set("chain", chainCandidates[chainIndex] ?? getMoralisChain(params.network));
    url.searchParams.set("limit", String(Math.min(remaining, 100)));
    url.searchParams.set("order", "DESC");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await deps.fetchFn(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Failed to fetch ERC20 holders (status ${response.status}): ${message}`,
      );
    }

    const payload = (await response.json()) as MoralisErc20HoldersResponse;
    const batch = Array.isArray(payload.result) ? payload.result : [];

    // Extract token metadata once if present
    if (tokenDecimals === null) {
      const dec =
        (typeof payload.decimals === "string"
          ? Number(payload.decimals)
          : payload.decimals) ??
        (typeof payload.token_decimals === "string"
          ? Number(payload.token_decimals)
          : payload.token_decimals) ??
        (typeof batch?.[0]?.decimals === "string"
          ? Number(batch?.[0]?.decimals)
          : (batch?.[0]?.decimals as number | null | undefined)) ??
        null;
      tokenDecimals = Number.isFinite(dec as number) ? (dec as number) : null;
    }

    if (tokenSymbol === null) {
      tokenSymbol =
        payload.symbol ?? payload.token_symbol ?? (batch?.[0]?.symbol ?? null) ?? null;
    }

    for (const entry of batch) {
      const address =
        entry.address ??
        (entry as any).holder_address ??
        entry.wallet_address ??
        entry.owner_address ??
        null;
      if (!address) continue;
      const raw =
        entry.balance ?? entry.total ?? entry.value ?? "0";
      const balanceStr = typeof raw === "number" ? String(raw) : (raw ?? "0");

      holders.push({
        ownerAddress: address,
        tokenBalances: [{ balance: balanceStr }],
      });
    }

    // Pagination
    cursor = (payload.cursor ?? payload.next ?? undefined) || undefined;
    if (!cursor) {
      // If we didn't get any results and there is another chain candidate, try it
      if (holders.length === 0 && chainIndex + 1 < chainCandidates.length) {
        chainIndex += 1;
        // reset cursor and try again with next chain id
        cursor = undefined;
        continue;
      }
      break;
    }
  }

  return {
    holders: holders.slice(0, params.pageSize),
    tokenDecimals,
    tokenSymbol,
    updatedAt,
  };
}

async function fetchEnsMetadata(
  addresses: string[],
  deps: DirectoryDependencies,
): Promise<Record<string, EnsMetadata>> {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!apiKey) {
    return {};
  }

  const uniqueAddresses = Array.from(
    new Set(
      addresses
        .map((address) => normalizeAddress(address))
        .filter((address) => isAddress(address)),
    ),
  );

  if (uniqueAddresses.length === 0) {
    return {};
  }

  const enstateMetadata: Record<string, Partial<EnsMetadata>> = {};
  const ENSTATE_BATCH_SIZE = 50;

  try {
    for (const batch of chunk(uniqueAddresses, ENSTATE_BATCH_SIZE)) {
      if (batch.length === 0) continue;
      const url = new URL("https://enstate.rs/bulk/a");
      for (const addr of batch) {
        url.searchParams.append("addresses[]", addr);
      }
      const response = await deps.fetchFn(url.toString());
      if (!response.ok) {
        continue;
      }
      const json = await response.json();
      const records: any[] = Array.isArray(json?.response) ? json.response : [];
      for (const record of records) {
        const addr = normalizeAddress(record?.address || "");
        if (!addr) continue;
        const partial = enstateMetadata[addr] ?? {};
        if (!partial.ensName && typeof record?.name === "string") {
          partial.ensName = record.name;
        }
        if (!partial.ensAvatarUrl && typeof record?.avatar === "string") {
          partial.ensAvatarUrl = record.avatar;
        }
        if (!partial.primaryAddress && typeof record?.chains?.eth === "string") {
          partial.primaryAddress = normalizeAddress(record.chains.eth);
        }
        const ensRecords = record?.records;
        if (ensRecords && typeof ensRecords === "object") {
          if (!partial.twitterHandle) {
            const parsedTwitter = parseSocialRecord(
              ensRecords["com.twitter"] ??
                ensRecords["twitter"] ??
                ensRecords["com.x"] ??
                ensRecords["x"],
              "twitter",
            );
            if (parsedTwitter) {
              partial.twitterHandle = parsedTwitter.handle;
              partial.twitterUrl = parsedTwitter.url;
            }
          }
          if (!partial.githubHandle) {
            const parsedGithub = parseSocialRecord(
              ensRecords["com.github"] ?? ensRecords["github"],
              "github",
            );
            if (parsedGithub) {
              partial.githubHandle = parsedGithub.handle;
              partial.githubUrl = parsedGithub.url;
            }
          }
        }
        enstateMetadata[addr] = partial;
      }
    }
  } catch (error) {
    console.error("Failed to fetch ENS social metadata", error);
  }

  const entries = await Promise.all(
    uniqueAddresses.map(async (address) => {
      const viemAddress = address as Address;
      const existing = enstateMetadata[address] ?? {};
      let ensName: string | null = existing.ensName ?? null;
      let ensAvatarUrl: string | null = existing.ensAvatarUrl ?? null;
      const twitterHandle: string | null = existing.twitterHandle ?? null;
      const twitterUrl: string | null = existing.twitterUrl ?? null;
      const githubHandle: string | null = existing.githubHandle ?? null;
      const githubUrl: string | null = existing.githubUrl ?? null;
      const primaryAddress: string | null = existing.primaryAddress
        ? normalizeAddress(existing.primaryAddress)
        : null;

      try {
        const resolvedName = await deps.getEnsNameFn(viemAddress);
        if (resolvedName) {
          ensName = ensName ?? resolvedName;
        }
        if (!ensAvatarUrl && ensName) {
          try {
            ensAvatarUrl = await deps.getEnsAvatarFn(ensName);
          } catch (avatarError) {
            console.error(
              `Failed to resolve ENS avatar for ${ensName}`,
              avatarError,
            );
          }
        }
      } catch (error) {
        console.error(
          `Failed to resolve ENS metadata for address ${address}`,
          error,
        );
      }

      return [
        address,
        {
          ensName: ensName ?? null,
          ensAvatarUrl: ensAvatarUrl ?? null,
          twitterHandle: twitterHandle ?? null,
          twitterUrl:
            twitterUrl ??
            (twitterHandle ? `https://twitter.com/${twitterHandle}` : null),
          githubHandle: githubHandle ?? null,
          githubUrl:
            githubUrl ??
            (githubHandle ? `https://github.com/${githubHandle}` : null),
          primaryAddress,
        },
      ] as const;
    }),
  );

  return Object.fromEntries(entries);
}

function mapNeynarUsersByAddress(
  addressRecords: NeynarBulkUsersResponse,
): Record<string, NeynarUser | undefined> {
  return Object.fromEntries(
    Object.entries(addressRecords).map(([address, users]) => [
      normalizeAddress(address),
      Array.isArray(users) && users.length > 0 ? users[0] : undefined,
    ]),
  );
}

function extractViewerContext(
  profile: NeynarUser | undefined,
): DirectoryMemberViewerContext {
  if (!profile || typeof profile !== "object") {
    return null;
  }
  const viewerContext = (profile as { viewer_context?: { following?: boolean | null } | null }).viewer_context;
  if (viewerContext && typeof viewerContext === "object") {
    const following = (viewerContext as { following?: boolean | null }).following;
    if (typeof following === "boolean" || following === null) {
      return { following };
    }
  }
  return null;
}

export async function fetchDirectoryData(
  params: DirectoryQuery,
  deps: DirectoryDependencies = defaultDependencies,
): Promise<DirectoryApiResponse> {
  let holdersResult:
    | Awaited<ReturnType<typeof fetchMoralisTokenHolders>>
    | Awaited<ReturnType<typeof fetchAlchemyNftOwners>>;
  if (params.assetType === "nft") {
    holdersResult = await fetchAlchemyNftOwners(params, deps);
  } else {
    holdersResult = await fetchMoralisTokenHolders(params, deps);
  }

  const { holders, tokenDecimals, tokenSymbol, updatedAt } = holdersResult;

  const addresses = holders
    .map((holder) => {
      const address = extractOwnerAddress(holder);
      return address ? normalizeAddress(address) : null;
    })
    .filter((value): value is string => Boolean(value));
  const uniqueAddresses = Array.from(new Set(addresses));

  let neynarProfiles: Record<string, NeynarUser | undefined> = {};
  if (process.env.NEYNAR_API_KEY) {
    const batches = chunk(uniqueAddresses, NEYNAR_LOOKUP_BATCH_SIZE);
    for (const batch of batches) {
      if (batch.length === 0) continue;
      try {
        const response = await deps.neynarClient.fetchBulkUsersByEthOrSolAddress({
          addresses: batch,
          ...(params.viewerFid ? { viewerFid: params.viewerFid } : {}),
        });
        neynarProfiles = {
          ...neynarProfiles,
          ...mapNeynarUsersByAddress(response),
        };
      } catch (error) {
        console.error("Failed to fetch Neynar profiles", error);
      }
    }
  }

  // Always fetch ENS metadata for all unique addresses, even if
  // Farcaster data is present. This ensures the response contains
  // both Farcaster and ENS details so the client can render both badges.
  let ensMetadata: Record<string, EnsMetadata> = {};
  if (uniqueAddresses.length > 0) {
    ensMetadata = await fetchEnsMetadata(uniqueAddresses, deps);
  }

  let resolvedDecimals = tokenDecimals ?? null;
  if (resolvedDecimals === null) {
    try {
      const tokenData = await fetchTokenData(
        params.contractAddress,
        null,
        params.network as EtherScanChainName,
      );
      resolvedDecimals = tokenData?.decimals ?? null;
    } catch (error) {
      console.error("Unable to resolve token decimals", error);
    }
  }

  // Build initial per-holder entries and aggregate by Farcaster fid
  const members: DirectoryMember[] = [];
  type Agg = {
    sum: bigint;
    username?: string | null;
    displayName?: string | null;
    fid?: number | null;
    pfpUrl?: string | null;
    followers?: number | null;
    ensName?: string | null;
    ensAvatarUrl?: string | null;
    primaryAddress?: string | null;
    etherscanUrl?: string | null;
    xHandle?: string | null;
    xUrl?: string | null;
    githubHandle?: string | null;
    githubUrl?: string | null;
    viewerContext?: DirectoryMemberViewerContext;
  };
  const byFid = new Map<number, Agg>();

  for (const holder of holders) {
    const address = extractOwnerAddress(holder);
    if (!address) {
      continue;
    }

    const key = normalizeAddress(address);
    const profile = neynarProfiles[key];
    const balanceRaw = extractOwnerBalanceRaw(holder);
    let balanceFormatted = balanceRaw;

    const ensInfo = ensMetadata[key];

    if (resolvedDecimals !== null) {
      try {
        balanceFormatted = formatUnits(BigInt(balanceRaw), resolvedDecimals);
      } catch (error) {
        console.error("Failed to format token balance", error);
      }
    }

    const username = profile && "username" in profile ? profile.username ?? null : null;
    const displayName =
      profile && "display_name" in profile
        ? (profile as { display_name?: string | null }).display_name ?? null
        : null;
    const fid = profile && "fid" in profile ? (profile as { fid?: number }).fid ?? null : null;
    const followers =
      profile && "follower_count" in profile
        ? (profile as { follower_count?: number | null }).follower_count ?? null
        : null;
    const pfpUrl =
      profile && typeof profile === "object" && profile !== null && "pfp_url" in profile
        ? (profile as { pfp_url?: string | null }).pfp_url ?? null
        : profile && typeof profile === "object" && profile !== null && "profile" in profile
          ? ((profile as { profile?: { pfp_url?: string | null } }).profile?.pfp_url ?? null)
          : null;
    const viewerContext = extractViewerContext(profile);

    let xHandleFromProfile: string | null = null;
    let xUrlFromProfile: string | null = null;
    let githubHandleFromProfile: string | null = null;
    let githubUrlFromProfile: string | null = null;
    const verifiedAccounts =
      profile && typeof profile === "object" && profile !== null && "verified_accounts" in profile
        ? (profile as { verified_accounts?: Array<any> }).verified_accounts
        : undefined;
    if (Array.isArray(verifiedAccounts)) {
      for (const account of verifiedAccounts) {
        const platform =
          typeof account?.platform === "string" ? account.platform.toLowerCase() : "";
        const usernameValue =
          typeof account?.username === "string" ? account.username.trim() : "";
        const normalizedUsername = usernameValue.replace(/^@/, "");
        if (!normalizedUsername) continue;
        if (!xHandleFromProfile && (platform === "x" || platform === "twitter")) {
          xHandleFromProfile = normalizedUsername;
          xUrlFromProfile = `https://twitter.com/${normalizedUsername}`;
        } else if (!githubHandleFromProfile && platform === "github") {
          githubHandleFromProfile = normalizedUsername;
          githubUrlFromProfile = `https://github.com/${normalizedUsername}`;
        }
      }
    }

    const verifiedAddresses =
      profile && typeof profile === "object" && profile !== null && "verified_addresses" in profile
        ? (profile as {
            verified_addresses?: {
              primary?: { eth_address?: string | null } | null;
              eth_addresses?: Array<string | null> | null;
            };
          }).verified_addresses
        : undefined;

    let primaryAddress: string | null = null;
    if (verifiedAddresses && typeof verifiedAddresses === "object") {
      const primary = verifiedAddresses.primary;
      if (
        primary &&
        typeof primary === "object" &&
        typeof primary.eth_address === "string" &&
        primary.eth_address
      ) {
        primaryAddress = primary.eth_address;
      }
      if (!primaryAddress && Array.isArray(verifiedAddresses.eth_addresses)) {
        const candidate = verifiedAddresses.eth_addresses.find(
          (value): value is string => typeof value === "string" && value.length > 0,
        );
        if (candidate) {
          primaryAddress = candidate;
        }
      }
    }
    if (!primaryAddress && profile && typeof profile === "object" && profile !== null) {
      const custody = (profile as { custody_address?: string | null }).custody_address;
      if (typeof custody === "string" && custody) {
        primaryAddress = custody;
      }
    }
    if (
      !primaryAddress &&
      profile &&
      typeof profile === "object" &&
      profile !== null &&
      Array.isArray((profile as { verifications?: string[] }).verifications)
    ) {
      const verification = (profile as { verifications?: string[] }).verifications?.find(
        (value): value is string => typeof value === "string" && value.length > 0,
      );
      if (verification) {
        primaryAddress = verification;
      }
    }
    if (
      !primaryAddress &&
      profile &&
      typeof profile === "object" &&
      profile !== null &&
      Array.isArray((profile as { auth_addresses?: Array<{ address?: string }> }).auth_addresses)
    ) {
      const authAddress = (profile as { auth_addresses?: Array<{ address?: string }> })
        .auth_addresses?.find(
          (entry) => entry && typeof entry.address === "string" && entry.address.length > 0,
        );
      if (authAddress?.address) {
        primaryAddress = authAddress.address;
      }
    }
    if (!primaryAddress && ensInfo?.primaryAddress) {
      primaryAddress = ensInfo.primaryAddress;
    }
    const normalizedPrimaryAddress = primaryAddress
      ? normalizeAddress(primaryAddress)
      : null;
    const etherscanUrl = normalizedPrimaryAddress
      ? `https://etherscan.io/address/${normalizedPrimaryAddress}`
      : null;

    const ensTwitterHandle = ensInfo?.twitterHandle ?? null;
    const ensTwitterUrl =
      ensInfo?.twitterUrl ??
      (ensTwitterHandle ? `https://twitter.com/${ensTwitterHandle}` : null);
    const ensGithubHandle = ensInfo?.githubHandle ?? null;
    const ensGithubUrl =
      ensInfo?.githubUrl ??
      (ensGithubHandle ? `https://github.com/${ensGithubHandle}` : null);

    const combinedXHandle = xHandleFromProfile ?? ensTwitterHandle ?? null;
    const combinedXUrl =
      xUrlFromProfile ??
      ensTwitterUrl ??
      (combinedXHandle ? `https://twitter.com/${combinedXHandle}` : null);
    const combinedGithubHandle = githubHandleFromProfile ?? ensGithubHandle ?? null;
    const combinedGithubUrl =
      githubUrlFromProfile ??
      ensGithubUrl ??
      (combinedGithubHandle ? `https://github.com/${combinedGithubHandle}` : null);


    if (typeof fid === "number" && fid > 0) {
      const current = byFid.get(fid) ?? { sum: 0n };
      const fallbackAddressForAgg = normalizedPrimaryAddress ?? key;
      current.sum = current.sum + BigInt(balanceRaw ?? "0");
      // Prefer to keep first non-null metadata
      current.username = current.username ?? username;
      current.displayName = current.displayName ?? displayName;
      current.fid = fid;
      current.pfpUrl = current.pfpUrl ?? pfpUrl;
      current.followers = current.followers ?? followers;
      current.ensName = current.ensName ?? ensInfo?.ensName ?? null;
      current.ensAvatarUrl = current.ensAvatarUrl ?? ensInfo?.ensAvatarUrl ?? null;
      current.primaryAddress = current.primaryAddress ?? fallbackAddressForAgg ?? null;
      current.etherscanUrl =
        current.etherscanUrl ??
        etherscanUrl ??
        (fallbackAddressForAgg ? `https://etherscan.io/address/${fallbackAddressForAgg}` : null);
      current.xHandle = current.xHandle ?? combinedXHandle ?? null;
      current.xUrl = current.xUrl ?? combinedXUrl ?? null;
      current.githubHandle = current.githubHandle ?? combinedGithubHandle ?? null;
      current.githubUrl = current.githubUrl ?? combinedGithubUrl ?? null;
      current.viewerContext = current.viewerContext ?? viewerContext ?? null;
      byFid.set(fid, current);
    } else {
      const fallbackAddress = normalizedPrimaryAddress ?? key;
      members.push({
        address: key,
        balanceRaw,
        balanceFormatted,
        lastTransferAt: null,
        username,
        displayName,
        fid,
        followers,
        pfpUrl,
        ensName: ensInfo?.ensName ?? null,
        ensAvatarUrl: ensInfo?.ensAvatarUrl ?? null,
        primaryAddress: fallbackAddress ?? null,
        etherscanUrl:
          etherscanUrl ??
          (fallbackAddress ? `https://etherscan.io/address/${fallbackAddress}` : null),
        xHandle: combinedXHandle ?? null,
        xUrl: combinedXUrl ?? null,
        githubHandle: combinedGithubHandle ?? null,
        githubUrl: combinedGithubUrl ?? null,
        viewerContext: viewerContext ?? null,
      });
    }
  }

  // Convert fid aggregates to members
  for (const [fid, agg] of byFid.entries()) {
    const sumRaw = agg.sum.toString();
    let sumFormatted = sumRaw;
    if (resolvedDecimals !== null) {
      try {
        sumFormatted = formatUnits(BigInt(sumRaw), resolvedDecimals);
      } catch (e) {
        // keep raw string if formatting fails
      }
    }
    members.push({
      address: `fc_fid_${fid}`,
      balanceRaw: sumRaw,
      balanceFormatted: sumFormatted,
      lastTransferAt: null,
      username: agg.username ?? null,
      displayName: agg.displayName ?? null,
      fid: fid,
      followers: agg.followers ?? null,
      pfpUrl: agg.pfpUrl ?? null,
      ensName: agg.ensName ?? null,
      ensAvatarUrl: agg.ensAvatarUrl ?? null,
      primaryAddress: agg.primaryAddress ?? null,
      etherscanUrl:
        agg.etherscanUrl ??
        (agg.primaryAddress
          ? `https://etherscan.io/address/${agg.primaryAddress}`
          : null),
      xHandle: agg.xHandle ?? null,
      xUrl: agg.xUrl ?? null,
      githubHandle: agg.githubHandle ?? null,
      githubUrl: agg.githubUrl ?? null,
      viewerContext: agg.viewerContext ?? null,
    });
  }

  return {
    fetchedAt: updatedAt,
    members,
    tokenSymbol: tokenSymbol ?? null,
    tokenDecimals: resolvedDecimals,
  };
}

const get = async (
  req: NextApiRequest,
  res: NextApiResponse<NounspaceResponse<DirectoryApiResponse, DirectoryErrorResponse>>,
) => {
  const parseResult = DIRECTORY_QUERY_SCHEMA.safeParse(req.query);

  if (!parseResult.success) {
    return res.status(400).json({
      result: "error",
      error: {
        message: parseResult.error.errors[0]?.message ?? "Invalid request parameters",
      },
    });
  }

  try {
    const data = await fetchDirectoryData(parseResult.data);

    return res.status(200).json({
      result: "success",
      value: data,
    });
  } catch (error) {
    console.error("Failed to build token directory", error);
    return res.status(500).json({
      result: "error",
      error: {
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while generating the directory",
      },
    });
  }
};

export default requestHandler({
  get,
});

export { DIRECTORY_QUERY_SCHEMA };
