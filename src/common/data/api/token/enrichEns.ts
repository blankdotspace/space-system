import { chunk } from "lodash";
import type { DirectoryDependencies, EnsMetadata, TokenHolder } from "./types";
import { normalizeAddress, isAddress, extractOwnerAddress, parseSocialRecord } from "./utils";

const ENSTATE_BATCH_SIZE = 50;
const ENSDATA_BATCH_SIZE = 50;

/**
 * Fetches ENS metadata for a list of addresses
 * Uses Enstate.rs for bulk lookups, with ensdata.net as fallback
 * Gracefully handles addresses without ENS names (returns null values)
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

  // First, try bulk lookup via Enstate.rs
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

  // Try ensdata.net as fallback for addresses not resolved by enstate.rs
  const unresolvedAddresses = uniqueAddresses.filter(
    (addr) => !enstateMetadata[addr]?.ensName,
  );

  if (unresolvedAddresses.length > 0) {
    try {
      for (const batch of chunk(unresolvedAddresses, ENSDATA_BATCH_SIZE)) {
        // ensdata.net supports individual lookups; fetch in parallel with concurrency limit
        const results = await Promise.allSettled(
          batch.map(async (addr) => {
            try {
              const response = await fetch(`https://ensdata.net/${addr}`, {
                signal: AbortSignal.timeout(5000),
              });
              if (!response.ok) return null;
              const data = await response.json();
              return { address: addr, data };
            } catch {
              return null;
            }
          }),
        );

        for (const result of results) {
          if (result.status !== "fulfilled" || !result.value) continue;
          const { address: addr, data } = result.value;
          if (!data || typeof data !== "object") continue;

          const partial = enstateMetadata[addr] ?? {};
          if (!partial.ensName && typeof data.ens === "string") {
            partial.ensName = data.ens;
          }
          if (!partial.ensAvatarUrl && typeof data.avatar === "string") {
            partial.ensAvatarUrl = data.avatar;
          }
          if (!partial.primaryAddress && typeof data.address === "string") {
            partial.primaryAddress = normalizeAddress(data.address);
          }
          // ensdata.net may include records in different format
          const records = data.records;
          if (records && typeof records === "object") {
            if (!partial.twitterHandle) {
              const parsedTwitter = parseSocialRecord(
                records["com.twitter"] ??
                  records["twitter"] ??
                  records["com.x"] ??
                  records["x"],
                "twitter",
              );
              if (parsedTwitter) {
                partial.twitterHandle = parsedTwitter.handle;
                partial.twitterUrl = parsedTwitter.url;
              }
            }
            if (!partial.githubHandle) {
              const parsedGithub = parseSocialRecord(
                records["com.github"] ?? records["github"],
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
      console.error("Failed to fetch ENS metadata from ensdata.net", error);
    }
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

