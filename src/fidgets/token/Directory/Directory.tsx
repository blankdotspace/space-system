import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isEqual } from "lodash";

import {
  type FidgetArgs,
  type FidgetModule,
  type FidgetProperties,
} from "@/common/fidgets";
import {
  buildEtherscanUrl,
  normalizeAddress as normalizeAddressUtil,
  parseSocialRecord,
} from "@/common/data/api/token/utils";
import {
  PaginationControls,
  DirectoryCardView,
  DirectoryListView,
  EmptyState,
  DirectoryHeader,
  DirectoryControls,
} from "./components";
import {
  resolveFontFamily,
  sortMembers,
  sanitizeSortOption,
  parseCsv,
  chunkArray,
  getNestedUser,
  mapNeynarUserToMember,
  createDefaultMemberForCsv,
  extractViewerContext,
  type NeynarUser,
} from "./utils";
import {
  STALE_AFTER_MS,
  PAGE_SIZE,
  CHANNEL_FETCH_DEBOUNCE_MS,
} from "./constants";
import type {
  DirectoryNetwork,
  DirectoryAssetType,
  DirectorySortOption,
  DirectoryLayoutStyle,
  DirectoryIncludeOption,
  DirectorySource,
  DirectoryChannelFilterOption,
  CsvTypeOption,
  CsvSortOption,
  DirectoryMemberData,
  DirectoryMemberViewerContext,
  DirectoryFidgetData,
  DirectoryFidgetSettings,
} from "./types";

// Re-export types for backward compatibility
export type {
  DirectoryNetwork,
  DirectoryAssetType,
  DirectorySortOption,
  DirectoryLayoutStyle,
  DirectoryIncludeOption,
  DirectorySource,
  DirectoryChannelFilterOption,
  CsvTypeOption,
  CsvSortOption,
  DirectoryMemberData,
  DirectoryFidgetData,
  DirectoryFidgetSettings,
};

import { directoryProperties } from "./properties";
import { useFarcasterSigner } from "@/fidgets/farcaster";

const Directory: React.FC<
  FidgetArgs<DirectoryFidgetSettings, DirectoryFidgetData>
> = ({ settings, data, saveData }) => {
  const source: DirectorySource = settings.source ?? "tokenHolders";
  const { network, contractAddress } = settings;
  const assetType: DirectoryAssetType = (settings.assetType ?? "token") as DirectoryAssetType;
  // Local view state (defaults from settings)
  const [currentSort, setCurrentSort] = useState<DirectorySortOption>(
    sanitizeSortOption(settings.sortBy),
  );
  const [currentLayout, setCurrentLayout] = useState<DirectoryLayoutStyle>(
    settings.layoutStyle,
  );
  const [currentChannelFilter, setCurrentChannelFilter] = useState<DirectoryChannelFilterOption>(
    (settings.channelFilter ?? "members") as DirectoryChannelFilterOption,
  );
  const includeFilter = (settings.include ?? "holdersWithFarcasterAccount") as DirectoryIncludeOption;
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Keep defaults in sync if the fidget settings change
  useEffect(() => {
    setCurrentSort(sanitizeSortOption(settings.sortBy));
    setCurrentLayout(settings.layoutStyle);
    setCurrentChannelFilter((settings.channelFilter ?? "members") as DirectoryChannelFilterOption);
    setCurrentPage(1);
  }, [settings.layoutStyle, settings.sortBy, settings.channelFilter]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);
  const normalizedAddress = normalizeAddressUtil(contractAddress || "");
  const channelName = (settings.channelName ?? "").trim();
  const [debouncedChannelName, setDebouncedChannelName] = useState(channelName);
  const csvUploadedAt = settings.csvUpload ?? settings.csvUploadedAt ?? "";
  const isConfigured =
    source === "tokenHolders"
      ? normalizedAddress.length === 42
      : source === "farcasterChannel"
        ? channelName.length > 0
        : (csvUploadedAt as string).length > 0;
  const primaryFontFamily = useMemo(
    () => resolveFontFamily(
      settings.primaryFontFamily,
      "var(--user-theme-headings-font)",
    ),
    [settings.primaryFontFamily],
  );
  const secondaryFontFamily = useMemo(
    () => resolveFontFamily(
      settings.secondaryFontFamily,
      "var(--user-theme-font)",
    ),
    [settings.secondaryFontFamily],
  );
  const primaryFontColor =
    settings.primaryFontColor || "var(--user-theme-headings-font-color)";
  const secondaryFontColor = settings.secondaryFontColor || "var(--user-theme-font-color)";
  const headingTextStyle = useMemo(
    () =>
      ({
        fontFamily: primaryFontFamily,
        color: primaryFontColor,
      }) as React.CSSProperties,
    [primaryFontFamily, primaryFontColor],
  );
  const secondaryTextStyle = useMemo(
    () =>
      ({
        fontFamily: secondaryFontFamily,
        color: secondaryFontColor,
      }) as React.CSSProperties,
    [secondaryFontFamily, secondaryFontColor],
  );
  const headingFontFamilyStyle = useMemo(
    () =>
      ({
        fontFamily: primaryFontFamily,
      }) as React.CSSProperties,
    [primaryFontFamily],
  );

  const { fid: viewerFid, signer } = useFarcasterSigner("Directory");

  const [directoryData, setDirectoryData] = useState<DirectoryFidgetData>(() => ({
    members: data?.members ?? [],
    lastUpdatedTimestamp: data?.lastUpdatedTimestamp ?? null,
    tokenSymbol: data?.tokenSymbol ?? null,
    tokenDecimals: data?.tokenDecimals ?? null,
    lastFetchSettings: data?.lastFetchSettings,
  }));
  const [lastViewerContextFid, setLastViewerContextFid] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [suppressAutoRefresh, setSuppressAutoRefresh] = useState(false);
  const lastCsvTriggerRef = useRef<string | null>(null);
  const lastManualRefreshRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    setDirectoryData((prev) => {
      const next: DirectoryFidgetData = {
        members: data.members ?? prev.members,
        lastUpdatedTimestamp: data.lastUpdatedTimestamp ?? prev.lastUpdatedTimestamp ?? null,
        tokenSymbol: data.tokenSymbol ?? prev.tokenSymbol ?? null,
        tokenDecimals: data.tokenDecimals ?? prev.tokenDecimals ?? null,
        lastFetchSettings: data.lastFetchSettings ?? prev.lastFetchSettings,
      };

      if (
        isEqual(prev.members, next.members) &&
        prev.lastUpdatedTimestamp === next.lastUpdatedTimestamp &&
        prev.tokenSymbol === next.tokenSymbol &&
        prev.tokenDecimals === next.tokenDecimals &&
        isEqual(prev.lastFetchSettings, next.lastFetchSettings)
      ) {
        return prev;
      }

      return next;
    });
  }, [data]);

  useEffect(() => {
    if (viewerFid > 0) {
      return;
    }

    setLastViewerContextFid(null);
    setDirectoryData((prev) => {
      const members = prev.members ?? [];
      let updated = false;
      const clearedMembers = members.map((member) => {
        if (member.viewerContext != null) {
          updated = true;
          return { ...member, viewerContext: null } as DirectoryMemberData;
        }
        return member;
      });

      if (!updated) {
        return prev;
      }

      return {
        ...prev,
        members: clearedMembers,
      };
    });
  }, [viewerFid]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (source !== "farcasterChannel") {
      setDebouncedChannelName(channelName);
      return;
    }
    const timer = setTimeout(() => setDebouncedChannelName(channelName), CHANNEL_FETCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [channelName, source]);

  const customSubheader = (settings.subheader ?? "").trim();
  const computedSubheader = useMemo(() => {
    if (customSubheader.length > 0) {
      return customSubheader;
    }
    if (source === "tokenHolders") {
      return directoryData.tokenSymbol ? `${directoryData.tokenSymbol} • ${network}` : null;
    }
    if (source === "farcasterChannel") {
      return channelName ? `/${channelName}` : null;
    }
    return null;
  }, [customSubheader, source, directoryData.tokenSymbol, network, channelName]);

  // Reset or clamp page when filter/sort/data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [includeFilter, currentSort]);

  useEffect(() => {
    if (viewerFid <= 0) {
      return;
    }

    const members = directoryData.members ?? [];
    const pendingFids = members
      .filter(
        (member): member is DirectoryMemberData & { fid: number } =>
          typeof member.fid === "number" &&
          member.fid > 0 &&
          (member.viewerContext == null || typeof member.viewerContext.following === "undefined"),
      )
      .map((member) => member.fid);

    if (pendingFids.length === 0) {
      return;
    }

    const uniqueFids = Array.from(new Set(pendingFids));
    const controller = new AbortController();
    let cancelled = false;

    const hydrateViewerContext = async () => {
      try {
        const updates = new Map<number, DirectoryMemberViewerContext | null>();
        const batches = chunkArray(uniqueFids, 100);
        for (const batch of batches) {
          if (batch.length === 0) {
            continue;
          }

          const params = new URLSearchParams();
          params.set("fids", batch.join(","));
          params.set("viewer_fid", String(viewerFid));

          const response = await fetch(`/api/farcaster/neynar/users?${params.toString()}`, {
            signal: controller.signal,
          });

          if (!response.ok) {
            console.error(
              "[Directory] Failed to load viewer follow context",
              response.status,
              await response.text(),
            );
            continue;
          }

          const payload = await response.json();
          const users: any[] = Array.isArray(payload?.users) ? payload.users : [];
          users.forEach((entry) => {
            const user = getNestedUser(entry);
            if (!user || typeof user.fid !== "number" || user.fid <= 0) {
              return;
            }

            updates.set(user.fid, extractViewerContext(user));
          });
        }

        if (updates.size === 0 || cancelled) {
          return;
        }

        setDirectoryData((prev) => {
          const prevMembers = prev.members ?? [];
          let mutated = false;
          const nextMembers = prevMembers.map((member) => {
            if (typeof member.fid === "number" && member.fid > 0 && updates.has(member.fid)) {
              const nextContext = updates.get(member.fid) ?? null;
              const currentFollowing = member.viewerContext?.following ?? null;
              const nextFollowing = nextContext?.following ?? null;
              if (currentFollowing !== nextFollowing) {
                mutated = true;
                return {
                  ...member,
                  viewerContext: nextContext,
                };
              }
            }
            return member;
          });

          if (!mutated) {
            return prev;
          }

          return {
            ...prev,
            members: nextMembers,
          };
        });

        setLastViewerContextFid(viewerFid);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        console.error("[Directory] Failed to hydrate viewer follow context", error);
      }
    };

    void hydrateViewerContext();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [directoryData.members, viewerFid]);

  const shouldRefresh = useMemo(() => {
    if (!isConfigured) {
      return false;
    }

    if (source === "csv") {
      return false;
    }

    const lastFetch = directoryData.lastFetchSettings;
    const lastUpdated = directoryData.lastUpdatedTimestamp
      ? Date.parse(directoryData.lastUpdatedTimestamp)
      : 0;

    // If no previous fetch, need to fetch
    if (!lastFetch || !lastUpdated) {
      return true;
    }

    if (viewerFid > 0) {
      if (lastViewerContextFid !== viewerFid) {
        return true;
      }
    } else if (lastViewerContextFid !== null) {
      return true;
    }

    // Extract relevant settings for comparison (only the ones that affect data fetching)
    const currentFetchSettings: Partial<DirectoryFidgetSettings> = {
      source,
      ...(source === "tokenHolders" && {
        network,
        contractAddress: normalizedAddress,
        assetType,
      }),
      ...(source === "farcasterChannel" && {
        channelName: debouncedChannelName,
        channelFilter: settings.channelFilter ?? "members",
      }),
    };

    // If settings changed, need refresh
    if (!isEqual(currentFetchSettings, lastFetch)) {
      return true;
    }

    // Otherwise check if data is stale
    return Date.now() - lastUpdated > STALE_AFTER_MS;
  }, [
    directoryData.lastFetchSettings,
    directoryData.lastUpdatedTimestamp,
    isConfigured,
    source,
    network,
    normalizedAddress,
    assetType,
    debouncedChannelName,
    settings.channelFilter,
    viewerFid,
    lastViewerContextFid,
  ]);

  const stripViewerContext = useCallback(
    (members: DirectoryMemberData[] | undefined): DirectoryMemberData[] =>
      ((members ?? []).map(({ viewerContext: _viewerContext, ...rest }) => ({
        ...rest,
      })) as DirectoryMemberData[]),
    [],
  );

  const persistDataIfChanged = useCallback(
    async (payload: DirectoryFidgetData) => {
      const nextMembersStripped = stripViewerContext(payload.members);
      const currentMembersStripped = stripViewerContext(directoryData.members);
      const hasChanged =
        !isEqual(currentMembersStripped, nextMembersStripped) ||
        directoryData.lastUpdatedTimestamp !== payload.lastUpdatedTimestamp ||
        directoryData.tokenSymbol !== payload.tokenSymbol ||
        directoryData.tokenDecimals !== payload.tokenDecimals ||
        !isEqual(directoryData.lastFetchSettings, payload.lastFetchSettings);

      setDirectoryData(payload);
      setLastViewerContextFid(viewerFid > 0 ? viewerFid : null);

      if (hasChanged) {
        await saveData({
          ...payload,
          members: nextMembersStripped,
        });
      }
    },
    [directoryData, saveData, stripViewerContext, viewerFid],
  );

  const fetchTokenDirectory = useCallback(
    async (controller: AbortController) => {
      const viewerParam = viewerFid > 0 ? `&viewerFid=${viewerFid}` : "";
      const response = await fetch(
        `/api/token/directory?network=${network}&contractAddress=${normalizedAddress}&assetType=${assetType}&pageSize=1000${viewerParam}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load token directory");
      }

      const json = (await response.json()) as {
        result: "success" | "error";
        value?: DirectoryFidgetData;
        error?: { message?: string };
      };

      if (json.result === "error" || !json.value) {
        throw new Error(json.error?.message || "Failed to load token directory");
      }

      const sortedMembers = sortMembers(
        json.value.members ?? [],
        sanitizeSortOption(settings.sortBy),
      );
      const timestamp = new Date().toISOString();

      await persistDataIfChanged({
        members: sortedMembers,
        tokenSymbol: json.value.tokenSymbol,
        tokenDecimals: json.value.tokenDecimals,
        lastUpdatedTimestamp: timestamp,
        lastFetchSettings: {
          source: "tokenHolders",
          network,
          contractAddress: normalizedAddress,
          assetType,
        },
      });
    },
    [assetType, network, normalizedAddress, persistDataIfChanged, settings.sortBy, viewerFid],
  );

  const fetchChannelDirectory = useCallback(
    async (controller: AbortController) => {
      const fetchMembers = async () => {
        const viewerQuery = viewerFid > 0 ? `&viewer_fid=${viewerFid}` : "";
        const res = await fetch(
          `/api/farcaster/neynar/channel/members?id=${encodeURIComponent(
            (settings.channelName ?? "").trim(),
          )}&limit=100${viewerQuery}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const membersArray: any[] = Array.isArray(data?.members) ? data.members : [];
        return membersArray
          .map((m) => getNestedUser(m))
          .filter(Boolean) as NeynarUser[];
      };

      const fetchFollowers = async () => {
        const viewerQuery = viewerFid > 0 ? `&viewer_fid=${viewerFid}` : "";
        const res = await fetch(
          `/api/farcaster/neynar/channel/followers?id=${encodeURIComponent(
            (settings.channelName ?? "").trim(),
          )}&limit=1000${viewerQuery}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const usersArray: any[] = Array.isArray(data?.users) ? data.users : [];
        return usersArray
          .map((u) => getNestedUser(u))
          .filter(Boolean) as NeynarUser[];
      };

      let users: NeynarUser[] = [];
      const filter = (settings.channelFilter ?? "members") as DirectoryChannelFilterOption;
      if (filter === "members") {
        users = await fetchMembers();
      } else if (filter === "followers") {
        users = await fetchFollowers();
      } else {
        const [m, f] = await Promise.all([fetchMembers(), fetchFollowers()]);
        const byFid = new Map<number, NeynarUser>();
        for (const u of [...m, ...f]) {
          if (typeof u.fid === "number") byFid.set(u.fid, u);
        }
        users = Array.from(byFid.values());
      }

      const members: DirectoryMemberData[] = users.map(mapNeynarUserToMember);

      // For channel lists, default to sorting by followers
      const sortedMembers = sortMembers(members, "followers");
      const timestamp = new Date().toISOString();

      await persistDataIfChanged({
        members: sortedMembers,
        tokenSymbol: null,
        tokenDecimals: null,
        lastUpdatedTimestamp: timestamp,
        lastFetchSettings: {
          source: "farcasterChannel",
          channelName: (settings.channelName ?? "").trim(),
          channelFilter: (settings.channelFilter ?? "members") as DirectoryChannelFilterOption,
        },
      });
    },
    [persistDataIfChanged, settings.channelName, settings.channelFilter, viewerFid],
  );


  const fetchCsvDirectory = useCallback(
    async (controller: AbortController) => {
      console.log("[Directory] CSV fetch starting", {
        source: settings.source,
        csvType: settings.csvType,
        csvSortBy: settings.csvSortBy,
        csvUpload: settings.csvUpload ?? settings.csvUploadedAt,
        contentLength: (settings.csvContent ?? "").length,
      });
      const type = (settings.csvType ?? "username") as CsvTypeOption;
      const csvSortBy = (settings.csvSortBy ?? "followers") as CsvSortOption;
      const raw = settings.csvContent ?? "";
      const entries = parseCsv(raw, type);
      if (entries.length === 0) {
        throw new Error(
          "CSV appears empty or unrecognized. Expected a first column or headers named username/handle/fc, address/eth/wallet, or fid/id.",
        );
      }

      console.log("[Directory] CSV parsed entries", entries.length);

      const unique = Array.from(new Set(entries));

      const byKey = new Map<string, DirectoryMemberData>();

      if (type === "username") {
        const usernameChunks = chunkArray(unique, 50);
        for (const usernames of usernameChunks) {
          console.log("[Directory] CSV usernames batch", usernames.length);
          const lookupParams = new URLSearchParams();
          lookupParams.set("usernames", usernames.join(","));
          const lookupRes = await fetch(
            `/api/farcaster/neynar/getFids?${lookupParams.toString()}`,
            { signal: controller.signal },
          );
          if (!lookupRes.ok) throw new Error(await lookupRes.text());
          const lookupData = (await lookupRes.json()) as { username: string; fid: string }[];
          const usernameOfFid = new Map<number, string>();
          const fids = lookupData
            .map((entry) => {
              const fidNumber = Number(entry.fid);
              if (Number.isFinite(fidNumber)) {
                const uname = entry.username.toLowerCase();
                usernameOfFid.set(fidNumber, uname);
                return fidNumber;
              }
              return null;
            })
            .filter((fid): fid is number => fid !== null);

          if (fids.length === 0) {
            continue;
          }

          const query = new URLSearchParams();
          query.set("fids", fids.join(","));
          if (viewerFid > 0) {
            query.set("viewer_fid", String(viewerFid));
          }
          const res = await fetch(`/api/farcaster/neynar/users?${query.toString()}`, {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          const users: any[] = Array.isArray(data?.users) ? data.users : [];
          users.forEach((u) => {
            const nestedUser = getNestedUser(u);
            if (!nestedUser) return;
            const member = mapNeynarUserToMember(nestedUser);
            if (member.fid != null) {
              byKey.set(String(member.fid), member);
              const lookedUpUsername = usernameOfFid.get(member.fid);
              const keyUsername = (member.username ?? lookedUpUsername)?.toLowerCase();
              if (keyUsername) {
                byKey.set(keyUsername, member);
              }
            } else if (member.username) {
              byKey.set(member.username.toLowerCase(), member);
            }
          });
        }
      } else if (type === "fid") {
        const fidChunks = chunkArray(unique, 100);
        for (const chunk of fidChunks) {
          console.log("[Directory] CSV fids batch", chunk.length);
          const query = new URLSearchParams();
          query.set("fids", chunk.join(","));
          if (viewerFid > 0) {
            query.set("viewer_fid", String(viewerFid));
          }
          const res = await fetch(`/api/farcaster/neynar/users?${query.toString()}`, {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          const users: any[] = Array.isArray(data?.users) ? data.users : [];
          users.forEach((u) => {
            const nestedUser = getNestedUser(u);
            if (!nestedUser) return;
            const member = mapNeynarUserToMember(nestedUser);
            if (member.fid != null) byKey.set(String(member.fid), member);
            if (member.username) byKey.set(member.username.toLowerCase(), member);
          });
        }
      } else if (type === "address") {
        // Batched Farcaster user resolution by address
        const addressChunks = chunkArray(unique, 100);
        for (const ch of addressChunks) {
          if (ch.length === 0) continue;
          try {
            const params = new URLSearchParams();
            ch.forEach((a) => params.append("addresses[]", a));
            if (viewerFid > 0) {
              params.set("viewer_fid", String(viewerFid));
            }
            console.log("[Directory] CSV address batch (Farcaster)", ch.length);
            const resp = await fetch(`/api/farcaster/neynar/bulk-address?${params.toString()}`,
              { signal: controller.signal });
            if (resp.ok) {
              const data = await resp.json();
              // data is an object: { [address]: User[] }
              Object.entries<any>(data || {}).forEach(([addr, users]) => {
                const first = Array.isArray(users) && users.length > 0 ? users[0] : undefined;
                if (first) {
                  const nestedUser = getNestedUser(first);
                  if (nestedUser) {
                    const member = mapNeynarUserToMember(nestedUser);
                    byKey.set(addr.toLowerCase(), member);
                  }
                }
              });
            }
          } catch (e) {
            // ignore batch failure; continue
          }
        }

        // Batched ENS resolution via enstate.rs
        try {
          const ensChunks = chunkArray(unique, 100);
          for (const ch of ensChunks) {
            if (ch.length === 0) continue;
            const url = new URL("https://enstate.rs/bulk/a");
            ch.forEach((a) => url.searchParams.append("addresses[]", a));
      console.log("[Directory] CSV address batch (ENS)", ch.length);
            const res = await fetch(url.toString(), { signal: controller.signal });
            if (!res.ok) continue;
            const json = await res.json();
            const records: any[] = Array.isArray(json?.response) ? json.response : [];
            for (const rec of records) {
              const addr = (rec?.address || "").toLowerCase();
              if (!addr) continue;
              const current = byKey.get(addr);
              const ensName = rec?.name || null;
              const ensAvatarUrl = rec?.avatar || null;
              const recordsObj = rec?.records;
              const parsedTwitter = parseSocialRecord(
                recordsObj?.["com.twitter"] ??
                  recordsObj?.twitter ??
                  recordsObj?.["com.x"] ??
                  recordsObj?.x,
                "twitter",
              );
              const parsedGithub = parseSocialRecord(
                recordsObj?.["com.github"] ?? recordsObj?.github,
                "github",
              );
              const ensPrimaryAddress =
                typeof rec?.chains?.eth === "string"
                  ? rec.chains.eth.toLowerCase()
                  : null;
              const fallbackPrimaryAddress = ensPrimaryAddress ?? addr;
              const merged =
                current ??
                ({
                  address: addr,
                  balanceRaw: "0",
                  balanceFormatted: "",
                  username: null,
                  displayName: null,
                  fid: null,
                  pfpUrl: null,
                  followers: null,
                  lastTransferAt: null,
                  ensName: null,
                  ensAvatarUrl: null,
                  primaryAddress: fallbackPrimaryAddress,
                  etherscanUrl: buildEtherscanUrl(fallbackPrimaryAddress),
                  xHandle: null,
                  xUrl: null,
                  githubHandle: null,
                  githubUrl: null,
                } as DirectoryMemberData);

              const resolvedPrimaryAddress =
                merged.primaryAddress ?? fallbackPrimaryAddress ?? null;

              const next: DirectoryMemberData = {
                ...merged,
                ensName: merged.ensName ?? ensName ?? null,
                ensAvatarUrl: merged.ensAvatarUrl ?? ensAvatarUrl ?? null,
                primaryAddress: resolvedPrimaryAddress,
                etherscanUrl:
                  merged.etherscanUrl ??
                  buildEtherscanUrl(resolvedPrimaryAddress ?? addr),
                xHandle: merged.xHandle ?? parsedTwitter?.handle ?? null,
                xUrl: merged.xUrl ?? parsedTwitter?.url ?? null,
                githubHandle: merged.githubHandle ?? parsedGithub?.handle ?? null,
                githubUrl: merged.githubUrl ?? parsedGithub?.url ?? null,
              };

              byKey.set(addr, next);
            }
          }
        } catch (e) {
          // ignore ENS batch errors
        }
      }

      // Build members preserving CSV order
      const members: DirectoryMemberData[] = entries.map((val) => {
        const key = type === "username" ? val.toLowerCase() : type === "fid" ? String(Number(val)) : val.toLowerCase();
        return byKey.get(key) || createDefaultMemberForCsv(type, val);
      });

      const finalMembers = csvSortBy === "followers"
        ? sortMembers(members, "followers")
        : members;

      const timestamp = new Date().toISOString();
      console.log("[Directory] CSV fetch complete", {
        members: finalMembers.length,
        sort: csvSortBy,
      });
      await persistDataIfChanged({
        members: finalMembers,
        tokenSymbol: null,
        tokenDecimals: null,
        lastUpdatedTimestamp: timestamp,
        lastFetchSettings: {
          source: "csv",
          csvUpload: settings.csvUpload ?? settings.csvUploadedAt ?? "",
          csvUploadedAt: settings.csvUpload ?? settings.csvUploadedAt ?? "",
          csvType: type,
          csvSortBy,
        },
      });
    },
    [
      persistDataIfChanged,
      settings.csvContent,
      settings.csvUpload,
      settings.csvUploadedAt,
      settings.csvType,
      settings.csvSortBy,
      viewerFid,
    ],
  );

  const fetchDirectory = useCallback(async () => {
    if (!isConfigured) {
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsRefreshing(true);
    setError(null);

    try {
      if ((settings.source ?? "tokenHolders") === "tokenHolders") {
        await fetchTokenDirectory(controller);
      } else if ((settings.source ?? "tokenHolders") === "farcasterChannel") {
        await fetchChannelDirectory(controller);
      } else {
        await fetchCsvDirectory(controller);
      }
      setCurrentPage(1);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      console.error(err);
      const src = settings.source ?? "tokenHolders";
      const prefix = src === "tokenHolders"
        ? "Failed to load token directory"
        : src === "farcasterChannel"
          ? "Failed to load Farcaster channel users"
          : "Failed to import CSV";
      setError(`${prefix}: ${(err as Error).message || "Unknown error"}`);
      setSuppressAutoRefresh(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [isConfigured, settings.source, fetchTokenDirectory, fetchChannelDirectory, fetchCsvDirectory]);

  useEffect(() => {
    if (source === "csv") {
      return;
    }
    if (shouldRefresh && !isRefreshing && !suppressAutoRefresh) {
      void fetchDirectory();
    }
  }, [source, fetchDirectory, isRefreshing, shouldRefresh, suppressAutoRefresh]);

  // If fetch context changes, reset error and allow auto refresh
  useEffect(() => {
    setSuppressAutoRefresh(false);
    setError(null);
  }, [
    source,
    network,
    normalizedAddress,
    assetType,
    channelName,
    currentChannelFilter,
    settings.csvUploadedAt,
    settings.csvUpload,
    settings.csvType,
    settings.csvSortBy,
    settings.refreshToken,
    viewerFid,
  ]);

  // Trigger fetch when CSV upload or manual refresh changes
  useEffect(() => {
    if ((settings.source ?? "tokenHolders") !== "csv") {
      lastCsvTriggerRef.current = null;
      return;
    }
    const uploadToken = settings.csvUpload ?? settings.csvUploadedAt ?? "";
    const refreshToken = settings.refreshToken ?? "";
    if (!uploadToken && !refreshToken) {
      return;
    }
    const combined = `${uploadToken}__${refreshToken}`;
    if (lastCsvTriggerRef.current === combined) {
      return;
    }
    lastCsvTriggerRef.current = combined;
    setSuppressAutoRefresh(false);
    setError(null);
    void fetchDirectory();
  }, [settings.source, settings.csvUpload, settings.csvUploadedAt, settings.refreshToken, fetchDirectory]);

  useEffect(() => {
    if ((settings.source ?? "tokenHolders") === "csv") {
      return;
    }
    const token = settings.refreshToken ?? "";
    if (!token) {
      return;
    }
    const key = `${settings.source ?? "tokenHolders"}__${token}`;
    if (lastManualRefreshRef.current === key) {
      return;
    }
    lastManualRefreshRef.current = key;
    setSuppressAutoRefresh(false);
    setError(null);
    void fetchDirectory();
  }, [settings.refreshToken, settings.source, fetchDirectory]);

  const filteredSortedMembers = useMemo(() => {
    if ((settings.source ?? "tokenHolders") !== "tokenHolders") {
      // Already sorted when fetched
      return directoryData.members ?? [];
    }
    // Optional client-side safety net: drop duplicate fids if any slip through
    const base = directoryData.members ?? [];
    const seenFids = new Set<number>();
    const deduped = base.filter((m) => {
      if (typeof m.fid === "number" && m.fid > 0) {
        if (seenFids.has(m.fid)) return false;
        seenFids.add(m.fid);
        return true;
      }
      return true;
    });
    const members = sortMembers(deduped, currentSort);
    if (includeFilter === "holdersWithFarcasterAccount") {
      return members.filter((member) => Boolean(member.username));
    }
    return members;
  }, [directoryData.members, includeFilter, currentSort, settings.source]);

  const pageCount = useMemo(() => {
    const total = filteredSortedMembers.length;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [filteredSortedMembers.length]);

  // Clamp current page if total changes
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, pageCount));
  }, [pageCount]);

  const displayedMembers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredSortedMembers.slice(start, end);
  }, [filteredSortedMembers, currentPage]);

  const emptyStateMessage =
    (settings.source ?? "tokenHolders") === "farcasterChannel"
      ? (currentChannelFilter === "members"
          ? "No channel members found."
          : currentChannelFilter === "followers"
            ? "No channel followers found."
            : "No users found for this channel.")
      : includeFilter === "allHolders"
        ? "No holders found for this asset yet."
        : "No Farcaster profiles found for this asset yet.";


  if (!isConfigured) {
    return (
      <EmptyState
        source={source}
        headingTextStyle={headingTextStyle}
        secondaryTextStyle={secondaryTextStyle}
      />
    );
  }

  return (
    <div className="flex h-full flex-col" style={secondaryTextStyle}>
      <DirectoryHeader
        subheader={computedSubheader}
        headingTextStyle={headingTextStyle}
        headingFontFamilyStyle={headingFontFamilyStyle}
        primaryFontColor={primaryFontColor}
        lastUpdatedTimestamp={directoryData.lastUpdatedTimestamp}
      />

      <DirectoryControls
        source={source}
        currentLayout={currentLayout}
        currentSort={currentSort}
        currentPage={currentPage}
        pageCount={pageCount}
        totalCount={filteredSortedMembers.length}
        onLayoutChange={(layout) => setCurrentLayout(layout)}
        onSortChange={(sort) => setCurrentSort(sort)}
        onPagePrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onPageNext={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
      />

      {error && (
        <div className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isRefreshing && !directoryData.members?.length ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading directory…
          </div>
        ) : displayedMembers.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {emptyStateMessage}
          </div>
        ) : currentLayout === "list" ? (
          <DirectoryListView
            members={displayedMembers}
            settings={settings}
            tokenSymbol={directoryData.tokenSymbol}
            headingTextStyle={headingTextStyle}
            network={network}
            includeFilter={includeFilter}
            viewerFid={viewerFid}
            signer={signer}
          />
        ) : (
          <DirectoryCardView
            members={displayedMembers}
            settings={settings}
            tokenSymbol={directoryData.tokenSymbol}
            headingTextStyle={headingTextStyle}
            headingFontFamilyStyle={headingFontFamilyStyle}
            network={network}
            includeFilter={includeFilter}
            viewerFid={viewerFid}
            signer={signer}
          />
        )}
        {/* Bottom pagination */}
        {filteredSortedMembers.length > 0 && (
          <div className="mt-4 flex items-center justify-end">
            <PaginationControls
              currentPage={currentPage}
              pageCount={pageCount}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              totalCount={filteredSortedMembers.length}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const DirectoryModule: FidgetModule<FidgetArgs> = {
  fidget: Directory as unknown as React.FC<FidgetArgs>,
  properties: directoryProperties as unknown as FidgetProperties,
};

export default DirectoryModule;
