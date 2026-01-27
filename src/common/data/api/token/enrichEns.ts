import { chunk } from "lodash";
import type { DirectoryDependencies, EnsMetadata, TokenHolder } from "./types";
import { normalizeAddress, isAddress, extractOwnerAddress, parseSocialRecord } from "./utils";

// web3.bio API supports max 30 addresses per batch
const WEB3BIO_BATCH_SIZE = 30;
// enstate.rs supports up to 50 addresses per batch (used as fallback)
const ENSTATE_BATCH_SIZE = 50;

/**
 * Extracts social handles from web3.bio links array
 */
function extractWeb3BioSocials(links: Record<string, any> | undefined): {
  twitterHandle: string | null;
  twitterUrl: string | null;
  githubHandle: string | null;
  githubUrl: string | null;
} {
  let twitterHandle: string | null = null;
  let twitterUrl: string | null = null;
  let githubHandle: string | null = null;
  let githubUrl: string | null = null;

  if (!links || typeof links !== "object") {
    return { twitterHandle, twitterUrl, githubHandle, githubUrl };
  }

  // web3.bio returns links as an object with platform keys
  const twitter = links.twitter || links.x;
  if (twitter && typeof twitter === "object") {
    const handle = twitter.handle || twitter.identity;
    if (typeof handle === "string" && handle) {
      twitterHandle = handle.replace(/^@/, "");
      twitterUrl = twitter.link || `https://twitter.com/${twitterHandle}`;
    }
  }

  const github = links.github;
  if (github && typeof github === "object") {
    const handle = github.handle || github.identity;
    if (typeof handle === "string" && handle) {
      githubHandle = handle.replace(/^@/, "");
      githubUrl = github.link || `https://github.com/${githubHandle}`;
    }
  }

  return { twitterHandle, twitterUrl, githubHandle, githubUrl };
}

/**
 * Fetches profile metadata for token holders using web3.bio API (primary)
 * with enstate.rs as fallback. Gracefully handles addresses without
 * ENS names (returns null values).
 *
 * web3.bio returns richer data including social links and display names.
 * See: https://api.web3.bio/#batch-query
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

  const metadata: Record<string, Partial<EnsMetadata>> = {};

  // Primary: web3.bio batch API (parallel batches for speed)
  try {
    const batches = chunk(uniqueAddresses, WEB3BIO_BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batches.map(async (batch) => {
        if (batch.length === 0) return [];
        // web3.bio expects format: ethereum,0xaddress
        const ids = batch.map((addr) => `ethereum,${addr}`).join(",");
        const url = `https://api.web3.bio/profile/batch/${encodeURIComponent(ids)}`;
        const response = await deps.fetchFn(url, {
          signal: AbortSignal.timeout(10000), // 10 second timeout per batch
        });
        if (!response.ok) {
          return [];
        }
        const json = await response.json();
        return Array.isArray(json) ? json : [];
      }),
    );

    for (const result of batchResults) {
      if (result.status !== "fulfilled") continue;
      const profiles = result.value;
      for (const profile of profiles) {
        // web3.bio returns address in the response
        const addr = normalizeAddress(profile?.address || "");
        if (!addr) continue;
        const partial = metadata[addr] ?? {};

        // ENS name from identity field (for ENS platform profiles)
        if (!partial.ensName && typeof profile?.identity === "string") {
          // Only use identity if it looks like an ENS name
          if (profile.identity.endsWith(".eth") || profile.platform === "ens") {
            partial.ensName = profile.identity;
          }
        }
        // Also check aliases for ENS names
        if (!partial.ensName && Array.isArray(profile?.aliases)) {
          for (const alias of profile.aliases) {
            if (typeof alias === "string" && alias.endsWith(".eth")) {
              partial.ensName = alias;
              break;
            }
          }
        }

        if (!partial.ensAvatarUrl && typeof profile?.avatar === "string") {
          partial.ensAvatarUrl = profile.avatar;
        }
        if (!partial.primaryAddress && typeof profile?.address === "string") {
          partial.primaryAddress = normalizeAddress(profile.address);
        }

        // Extract social links from web3.bio response
        const socials = extractWeb3BioSocials(profile?.links);
        if (!partial.twitterHandle && socials.twitterHandle) {
          partial.twitterHandle = socials.twitterHandle;
          partial.twitterUrl = socials.twitterUrl;
        }
        if (!partial.githubHandle && socials.githubHandle) {
          partial.githubHandle = socials.githubHandle;
          partial.githubUrl = socials.githubUrl;
        }

        metadata[addr] = partial;
      }
    }
  } catch (error) {
    console.error("Failed to fetch profile metadata from web3.bio", error);
  }

  // Fallback: enstate.rs for addresses not resolved by web3.bio
  const unresolvedAddresses = uniqueAddresses.filter(
    (addr) => !metadata[addr]?.ensName,
  );

  if (unresolvedAddresses.length > 0) {
    try {
      const batches = chunk(unresolvedAddresses, ENSTATE_BATCH_SIZE);
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
          const partial = metadata[addr] ?? {};
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
          metadata[addr] = partial;
        }
      }
    } catch (error) {
      console.error("Failed to fetch ENS metadata from enstate.rs (fallback)", error);
    }
  }

  // Build final metadata entries for all addresses
  // Addresses without ENS data will have null values (graceful handling)
  const entries = uniqueAddresses.map((address) => {
    const existing = metadata[address] ?? {};
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
