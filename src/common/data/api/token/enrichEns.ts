import { chunk } from "lodash";
import type { DirectoryDependencies, EnsMetadata, TokenHolder } from "./types";
import { normalizeAddress, isAddress, extractOwnerAddress, parseSocialRecord } from "./utils";

const ENSTATE_BATCH_SIZE = 50;

/**
 * Fetches ENS metadata for a list of addresses using Enstate.rs bulk lookups.
 * Gracefully handles addresses without ENS names (returns null values).
 *
 * Note: We only use enstate.rs for ENS resolution to avoid timeouts.
 * Most token holders don't have ENS names, so additional fallback APIs
 * would just add latency without meaningful benefit.
 */
export async function enrichWithEns(
  holders: TokenHolder[],
  deps: DirectoryDependencies,
): Promise<Record<string, EnsMetadata>> {
  const addresses = holders
    .map((holder) => {
      const address = extractOwnerAddress(holder);
      return address ? normalizeAddress(address) : null;
    })
    .filter((value): value is string => Boolean(value));
  const uniqueAddresses = Array.from(new Set(addresses)).filter(isAddress);

  if (uniqueAddresses.length === 0) {
    return {};
  }

  const enstateMetadata: Record<string, Partial<EnsMetadata>> = {};

  // Bulk lookup via Enstate.rs (parallel batches for speed)
  try {
    const batches = chunk(uniqueAddresses, ENSTATE_BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batches.map(async (batch) => {
        if (batch.length === 0) return [];
        const url = new URL("https://enstate.rs/bulk/a");
        for (const addr of batch) {
          url.searchParams.append("addresses[]", addr);
        }
        const response = await deps.fetchFn(url.toString(), {
          signal: AbortSignal.timeout(10000), // 10 second timeout per batch
        });
        if (!response.ok) {
          return [];
        }
        const json = await response.json();
        return Array.isArray(json?.response) ? json.response : [];
      }),
    );

    for (const result of batchResults) {
      if (result.status !== "fulfilled") continue;
      const records = result.value;
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
    console.error("Failed to fetch ENS metadata from enstate.rs", error);
  }

  // Build final metadata entries for all addresses
  // Addresses without ENS data will have null values (graceful handling)
  const entries = uniqueAddresses.map((address) => {
    const existing = enstateMetadata[address] ?? {};
    const ensName: string | null = existing.ensName ?? null;
    const ensAvatarUrl: string | null = existing.ensAvatarUrl ?? null;
    const twitterHandle: string | null = existing.twitterHandle ?? null;
    const twitterUrl: string | null = existing.twitterUrl ?? null;
    const githubHandle: string | null = existing.githubHandle ?? null;
    const githubUrl: string | null = existing.githubUrl ?? null;
    const primaryAddress: string | null = existing.primaryAddress
      ? normalizeAddress(existing.primaryAddress)
      : null;

    return [
      address,
      {
        ensName,
        ensAvatarUrl,
        twitterHandle,
        twitterUrl:
          twitterUrl ??
          (twitterHandle ? `https://twitter.com/${twitterHandle}` : null),
        githubHandle,
        githubUrl:
          githubUrl ??
          (githubHandle ? `https://github.com/${githubHandle}` : null),
        primaryAddress,
      },
    ] as const;
  });

  return Object.fromEntries(entries);
}
