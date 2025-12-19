"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatEther, isAddress, parseEther } from "viem";
import { base, mainnet, optimism } from "viem/chains";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useWriteContract,
  useEnsName,
  useEnsAvatar,
} from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { Input } from "@/common/components/atoms/input";
import { Button } from "@/common/components/atoms/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/atoms/select";
import { DAO_OPTIONS } from "@/constants/basedDaos";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import { FidgetArgs, FidgetModule, FidgetProperties, FidgetSettingsStyle } from "@/common/fidgets";
import { defaultStyleFields, WithMargin } from "@/fidgets/helpers";
import { wagmiConfig } from "@/common/providers/Wagmi";
import { DaoSelector } from "@/common/components/molecules/DaoSelector";

const BUILDER_SUBGRAPH_ENDPOINTS: Record<string, string> = {
  base:
    "https://api.goldsky.com/api/public/project_clkk1ucdyf6ak38svcatie9tf/subgraphs/nouns-builder-base-mainnet/stable/gn",
  mainnet: "https://api.thegraph.com/subgraphs/name/neokry/nouns-builder-mainnet",
  optimism:
    "https://api.thegraph.com/subgraphs/name/neokry/noun-builder-optimism-mainnet",
};

const SUPPORTED_NETWORKS = [
  { label: "Base", value: "base", chain: base },
  { label: "Ethereum", value: "mainnet", chain: mainnet },
  { label: "Optimism", value: "optimism", chain: optimism },
] as const;

type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number]["value"];

type DaoOption = {
  name: string;
  contract: string;
  graphUrl: string;
  icon?: string;
};

type BuilderAuction = {
  id: string;
  endTime: number;
  startTime: number;
  settled: boolean;
  tokenId: string;
  imageUrl?: string;
  highestBidAmount?: string;
  highestBidder?: string;
  winningBidAmount?: string;
  winningBidder?: string;
};

type BuilderDao = {
  auctionAddress?: `0x${string}`;
  name?: string;
};

const ACTIVE_AUCTION_QUERY = /* GraphQL */ `
  query ActiveAuction($dao: ID!) {
    dao(id: $dao) {
      auctionAddress
      name
    }
    auctions(
      where: { dao: $dao, settled: false }
      orderBy: startTime
      orderDirection: desc
      first: 1
    ) {
      id
      endTime
      startTime
      settled
      token {
        tokenId
        image
      }
      highestBid {
        amount
        bidder
      }
      winningBid {
        amount
        bidder
      }
    }
  }
`;

const PAST_AUCTIONS_QUERY = /* GraphQL */ `
  query PastAuctions($dao: ID!, $first: Int!, $skip: Int!) {
    auctions(
      where: { dao: $dao, settled: true }
      orderBy: endTime
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      endTime
      startTime
      token {
        tokenId
        image
      }
      winningBid {
        amount
        bidder
      }
      highestBid {
        amount
        bidder
      }
    }
  }
`;

const auctionAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "auction",
    inputs: [],
    outputs: [
      { name: "tokenId", type: "uint256" },
      { name: "highestBid", type: "uint256" },
      { name: "highestBidder", type: "address" },
      { name: "startTime", type: "uint40" },
      { name: "endTime", type: "uint40" },
      { name: "settled", type: "bool" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "createBid",
    inputs: [{ name: "_tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "settleAuction",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "settleCurrentAndCreateNewAuction",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "reservePrice",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "minBidIncrement",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "minBidIncrementPercentage",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "paused",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

async function runGraphQuery<T>(endpoint: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join(", "));
  }

  if (!json.data) {
    throw new Error("No data returned from subgraph");
  }

  return json.data;
}

const toHttpUri = (uri?: string | null): string | undefined => {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return uri;
};

const formatEthDisplay = (value?: string | bigint | null): string => {
  if (value == null) return "0 ETH";
  const asBigInt = typeof value === "bigint" ? value : BigInt(value);
  const numeric = Number.parseFloat(formatEther(asBigInt));
  if (!Number.isFinite(numeric)) return "0 ETH";
  const decimals = numeric >= 1 ? 2 : 4;
  return `${numeric.toFixed(decimals)} ETH`;
};

const shortenAddress = (address?: string | null): string => {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const AuctionArt: React.FC<{ imageUrl?: string; tokenId?: string; className?: string }> = ({
  imageUrl,
  tokenId,
  className,
}) => {
  return (
    <div
      className={mergeClasses(
        "aspect-square w-full overflow-hidden rounded-3xl bg-muted shadow-lg ring-1 ring-black/5",
        className,
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`Token ${tokenId}`}
          className="h-full w-full object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          No artwork
        </div>
      )}
    </div>
  );
};

const DEFAULT_BG = "#e1d7d5";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const useImageDominantColor = (imageUrl?: string) => {
  const [color, setColor] = useState<string | undefined>();

  useEffect(() => {
    if (!imageUrl) {
      setColor(undefined);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        setColor(`rgb(${r}, ${g}, ${b})`);
      } catch {
        setColor(undefined);
      }
    };
    img.onerror = () => {
      if (!cancelled) setColor(undefined);
    };
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return color;
};

const formatAuctionDate = (timestamp?: number) => {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(timestamp * 1000));
};

const formatCountdown = (endTime?: number) => {
  if (!endTime) return "00:00:00";
  const ms = endTime * 1000 - Date.now();
  if (ms <= 0) return "00:00:00";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const formatEnsOrAddress = (ens?: string | null, address?: string | null) => {
  if (ens) return ens;
  if (address) return shortenAddress(address);
  return "-";
};

const AddressDisplay: React.FC<{
  ensName?: string | null;
  address?: string | null;
  avatar?: string | null;
  className?: string;
}> = ({ ensName, address, avatar, className }) => {
  const label = formatEnsOrAddress(ensName, address);
  return (
    <div className={mergeClasses("flex items-center gap-2 text-sm font-medium text-[#4a4a60]", className)}>
      <div className="relative h-8 w-8 overflow-hidden rounded-full border border-black/10 bg-white shadow-sm">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#6b6b80]">
            {(ensName ?? address ?? "?").slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <span className="underline decoration-1 underline-offset-2">{label}</span>
    </div>
  );
};

export type NounishAuctionsSettings = {
  selectedDao: DaoOption;
  customDaoContract?: string;
  builderNetwork?: SupportedNetwork;
  customGraphUrl?: string;
} & FidgetSettingsStyle;

export const nounishAuctionsConfig: FidgetProperties = {
  fidgetName: "Nounish Auctions",
  icon: 0x1f3b0,
  fields: [
    {
      fieldName: "selectedDao",
      displayName: "Select DAO",
      displayNameHint: "Choose a Builder DAO to prefill address and subgraph",
      default: DAO_OPTIONS.find((dao) => dao.name === "Gnars") ?? DAO_OPTIONS[0],
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <DaoSelector {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "customDaoContract",
      displayName: "Custom DAO contract",
      displayNameHint: "Override the DAO address if it is not listed",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <Input {...props} placeholder="0x..." />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "builderNetwork",
      displayName: "Builder network",
      displayNameHint: "Network where the DAO is deployed",
      default: "base",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <Select value={props.value as string} onValueChange={(value) => props.onChange(value as SupportedNetwork)}>
            <SelectTrigger>
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_NETWORKS.map((network) => (
                <SelectItem key={network.value} value={network.value}>
                  {network.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "customGraphUrl",
      displayName: "Custom subgraph URL",
      displayNameHint: "Provide a custom Builder subgraph endpoint if needed",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <Input {...props} placeholder="https://..." />
        </WithMargin>
      ),
      group: "settings",
    },
    ...defaultStyleFields,
  ],
  size: {
    minHeight: 8,
    maxHeight: 36,
    minWidth: 6,
  maxWidth: 36,
  },
};

const pastFetchSize = 1;

export const NounishAuctions: React.FC<FidgetArgs<NounishAuctionsSettings>> = ({ settings }) => {
  const [activeAuction, setActiveAuction] = useState<BuilderAuction | null>(null);
  const [daoDetails, setDaoDetails] = useState<BuilderDao | null>(null);
  const [pastAuctionCache, setPastAuctionCache] = useState<Record<number, BuilderAuction>>({});
  const [viewOffset, setViewOffset] = useState(0);
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingPast, setLoadingPast] = useState(false);
  const [pastEndReached, setPastEndReached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [txPending, setTxPending] = useState(false);
  const [minBidIncrementPct, setMinBidIncrementPct] = useState<number | undefined>();
  const [minBidIncrementWei, setMinBidIncrementWei] = useState<bigint | undefined>();
  const [reservePrice, setReservePrice] = useState<bigint | undefined>();
  const [bidValue, setBidValue] = useState("");
  const [fallbackChecked, setFallbackChecked] = useState(false);
  const [now, setNow] = useState(Date.now());

  const { address, chainId } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const daoChoice = useMemo(() => settings.selectedDao ?? DAO_OPTIONS[0], [settings.selectedDao]);
  const customAddress = settings.customDaoContract ?? "";
  const networkValue = (settings.builderNetwork ?? "base") as SupportedNetwork;
  const customGraphUrl = settings.customGraphUrl ?? "";

  const daoAddress = useMemo(() => {
    const override = customAddress.trim();
    const fromSelector = daoChoice?.contract;
    return (override && isAddress(override) ? override : fromSelector) as `0x${string}` | undefined;
  }, [customAddress, daoChoice?.contract]);

  const resolvedNetwork =
    SUPPORTED_NETWORKS.find((item) => item.value === networkValue) ?? SUPPORTED_NETWORKS[0];

  const subgraphUrl =
    customGraphUrl ||
    daoChoice?.graphUrl ||
    BUILDER_SUBGRAPH_ENDPOINTS[networkValue] ||
    BUILDER_SUBGRAPH_ENDPOINTS.base;

  const hasValidDao = Boolean(daoAddress);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const fetchActiveAuction = useCallback(async () => {
    if (!hasValidDao) return;
    setLoadingActive(true);
    setError(null);
    try {
      const data = await runGraphQuery<{
        dao?: BuilderDao;
        auctions: Array<{
          id: string;
          endTime: string;
          startTime: string;
          settled: boolean;
          token?: { tokenId: string; image?: string | null } | null;
          highestBid?: { amount: string; bidder: string } | null;
          winningBid?: { amount: string; bidder: string } | null;
        }>;
      }>(subgraphUrl, ACTIVE_AUCTION_QUERY, { dao: daoAddress?.toLowerCase() });

      const auction = data.auctions?.[0];
      setDaoDetails(data.dao ?? null);

      if (auction) {
        setActiveAuction({
          id: auction.id,
          endTime: Number(auction.endTime),
          startTime: Number(auction.startTime),
          settled: auction.settled,
          tokenId: auction.token?.tokenId ?? "",
          imageUrl: toHttpUri(auction.token?.image),
          highestBidAmount: auction.highestBid?.amount ?? undefined,
          highestBidder: auction.highestBid?.bidder,
          winningBidAmount: auction.winningBid?.amount ?? undefined,
          winningBidder: auction.winningBid?.bidder,
        });
      } else {
        setActiveAuction(null);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setLoadingActive(false);
    }
  }, [daoAddress, hasValidDao, subgraphUrl]);

  const fetchPastAuction = useCallback(
    async (index: number) => {
      if (!hasValidDao || index < 0) return null;
      if (pastAuctionCache[index]) return pastAuctionCache[index];
      setLoadingPast(true);
      setError(null);
      try {
        const data = await runGraphQuery<{
          auctions: Array<{
            id: string;
            endTime: string;
            startTime?: string;
            token?: { tokenId: string; image?: string | null } | null;
            winningBid?: { amount: string; bidder: string } | null;
            highestBid?: { amount: string; bidder: string } | null;
          }>;
        }>(subgraphUrl, PAST_AUCTIONS_QUERY, {
          dao: daoAddress?.toLowerCase(),
          first: pastFetchSize,
          skip: index,
        });

        const auction = data.auctions?.[0];
        if (!auction) {
          setPastEndReached(true);
          return null;
        }

        const mapped: BuilderAuction = {
          id: auction.id,
          endTime: Number(auction.endTime),
          startTime: Number(auction.startTime ?? auction.endTime),
          settled: true,
          tokenId: auction.token?.tokenId ?? "",
          imageUrl: toHttpUri(auction.token?.image),
          highestBidAmount: auction.highestBid?.amount ?? auction.winningBid?.amount ?? undefined,
          highestBidder: auction.highestBid?.bidder ?? auction.winningBid?.bidder,
          winningBidAmount: auction.winningBid?.amount ?? auction.highestBid?.amount ?? undefined,
          winningBidder: auction.winningBid?.bidder ?? auction.highestBid?.bidder,
        };

        setPastAuctionCache((prev) => ({ ...prev, [index]: mapped }));
        return mapped;
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
        return null;
      } finally {
        setLoadingPast(false);
      }
    },
    [daoAddress, hasValidDao, pastAuctionCache, subgraphUrl],
  );

  useEffect(() => {
    setPastAuctionCache({});
    setViewOffset(0);
    setPastEndReached(false);
    setFallbackChecked(false);
    setBidValue("");
  }, [daoAddress, subgraphUrl]);

  useEffect(() => {
    fetchActiveAuction();
  }, [fetchActiveAuction, refreshKey]);

  useEffect(() => {
    if (loadingActive || fallbackChecked || !hasValidDao) return;
    if (!activeAuction) {
      setFallbackChecked(true);
      fetchPastAuction(0).then((auction) => {
        if (auction) setViewOffset(1);
      });
    }
  }, [activeAuction, fetchPastAuction, fallbackChecked, hasValidDao, loadingActive]);

  useEffect(() => {
    (async () => {
      if (!daoAddress) return;
      try {
        const [reserve, pct, increment] = await Promise.all([
          readContract(wagmiConfig, {
            address: daoAddress,
            abi: auctionAbi,
            functionName: "reservePrice",
            chainId: resolvedNetwork.chain.id,
          }).catch(() => undefined),
          readContract(wagmiConfig, {
            address: daoAddress,
            abi: auctionAbi,
            functionName: "minBidIncrementPercentage",
            chainId: resolvedNetwork.chain.id,
          }).catch(() => undefined),
          readContract(wagmiConfig, {
            address: daoAddress,
            abi: auctionAbi,
            functionName: "minBidIncrement",
            chainId: resolvedNetwork.chain.id,
          }).catch(() => undefined),
        ]);
        if (typeof reserve === "bigint") setReservePrice(reserve);
        if (typeof pct === "number" || typeof pct === "bigint") setMinBidIncrementPct(Number(pct));
        if (typeof increment === "bigint") setMinBidIncrementWei(increment);
      } catch (err) {
        console.warn("Failed to load auction parameters", err);
      }
    })();
  }, [daoAddress, resolvedNetwork.chain.id]);

  const ensureConnection = useCallback(async () => {
    if (!connectAsync || !switchChainAsync) return;
    if (!address) {
      const connector = connectors[0];
      if (!connector) throw new Error("No wallet connector available");
      await connectAsync({ connector, chainId: resolvedNetwork.chain.id });
      return;
    }
    if (chainId !== resolvedNetwork.chain.id) {
      await switchChainAsync({ chainId: resolvedNetwork.chain.id });
    }
  }, [address, chainId, connectAsync, connectors, resolvedNetwork.chain.id, switchChainAsync]);

  const isViewingActive = viewOffset === 0 && Boolean(activeAuction);
  const currentAuction = isViewingActive ? activeAuction : pastAuctionCache[viewOffset - 1] ?? null;
  const displayDaoName = daoDetails?.name ?? daoChoice?.name ?? "Auction";

  useEffect(() => {
    setBidValue("");
  }, [currentAuction?.id]);

  const activeHighestBidWei = useMemo(() => {
    const amount = activeAuction?.highestBidAmount;
    if (!amount) return 0n;
    return BigInt(amount);
  }, [activeAuction?.highestBidAmount]);

  const minBidWei = useMemo(() => {
    if (!isViewingActive) return undefined;
    const highest = activeHighestBidWei;
    if (highest === 0n) {
      if (reservePrice !== undefined) return reservePrice;
      if (minBidIncrementWei !== undefined) return minBidIncrementWei;
      return undefined;
    }
    if (minBidIncrementWei !== undefined) return highest + minBidIncrementWei;
    const pct = minBidIncrementPct ?? 5;
    const bump = (highest * BigInt(pct) + 99n) / 100n;
    return highest + bump;
  }, [activeHighestBidWei, isViewingActive, minBidIncrementPct, minBidIncrementWei, reservePrice]);

  const minBidPlaceholder = useMemo(() => {
    if (minBidWei == null) return "0.00";
    const eth = Number.parseFloat(formatEther(minBidWei));
    if (!Number.isFinite(eth)) return "0.00";
    const decimals = eth >= 1 ? 2 : 4;
    return eth.toFixed(decimals);
  }, [minBidWei]);

  const isEnded = currentAuction ? now >= currentAuction.endTime * 1000 : false;
  const needsSettlement = isViewingActive && Boolean(currentAuction) && !currentAuction?.settled && isEnded;

  const displayBidValue = isViewingActive
    ? currentAuction?.highestBidAmount ?? "0"
    : currentAuction?.winningBidAmount ?? currentAuction?.highestBidAmount ?? "0";
  const displayBidLabel = formatEthDisplay(displayBidValue);

  const displayAddressRaw = isViewingActive
    ? currentAuction?.highestBidder
    : currentAuction?.winningBidder ?? currentAuction?.highestBidder;
  const normalizedDisplayAddress =
    displayAddressRaw && isAddress(displayAddressRaw) ? (displayAddressRaw as `0x${string}`) : undefined;

  const { data: ensName } = useEnsName({
    address: normalizedDisplayAddress,
    chainId: mainnet.id,
    query: {
      enabled: Boolean(normalizedDisplayAddress && normalizedDisplayAddress !== ZERO_ADDRESS),
    },
  });

  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: mainnet.id,
    query: {
      enabled: Boolean(ensName),
    },
  });

  const timeLeftLabel = isViewingActive ? formatCountdown(currentAuction?.endTime) : "00:00:00";
  const backgroundColor = useImageDominantColor(currentAuction?.imageUrl) ?? DEFAULT_BG;
  const canGoNewer =
    viewOffset > 0 &&
    (!loadingActive || Boolean(activeAuction)) &&
    !(viewOffset === 1 && !activeAuction);
  const nextPastIndex = viewOffset;
  const canGoOlder =
    hasValidDao && !loadingPast && !loadingActive && (!pastEndReached || Boolean(pastAuctionCache[nextPastIndex]));

  const handlePrev = useCallback(async () => {
    const targetIndex = viewOffset;
    const cached = pastAuctionCache[targetIndex];
    if (cached) {
      setViewOffset((prev) => prev + 1);
      return;
    }
    const fetched = await fetchPastAuction(targetIndex);
    if (fetched) {
      setViewOffset((prev) => prev + 1);
    }
  }, [fetchPastAuction, pastAuctionCache, viewOffset]);

  const handleNext = useCallback(() => {
    if (viewOffset === 0) return;
    if (viewOffset === 1 && !activeAuction) return;
    setViewOffset((prev) => Math.max(0, prev - 1));
  }, [activeAuction, viewOffset]);

  const handleBid = useCallback(
    async (value: string) => {
      if (!activeAuction || !daoDetails?.auctionAddress || viewOffset !== 0) return;
      const trimmed = value.trim();
      if (!trimmed || Number(trimmed) <= 0) {
        setError("Enter a valid bid amount");
        return;
      }
      let bidWei: bigint;
      try {
        bidWei = parseEther(trimmed as `${number}`);
      } catch {
        setError("Enter a valid bid amount");
        return;
      }
      if (minBidWei != null && bidWei < minBidWei) {
        setError(`Bid must be at least ${formatEthDisplay(minBidWei)}`);
        return;
      }
      setError(null);
      try {
        setTxPending(true);
        await ensureConnection();
        const hash = await writeContractAsync({
          address: daoDetails.auctionAddress,
          abi: auctionAbi,
          functionName: "createBid",
          args: [BigInt(activeAuction.tokenId)],
          value: bidWei,
          chainId: resolvedNetwork.chain.id,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash, chainId: resolvedNetwork.chain.id });
        setRefreshKey((prev) => prev + 1);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setTxPending(false);
      }
    },
    [
      activeAuction,
      daoDetails?.auctionAddress,
      ensureConnection,
      minBidWei,
      resolvedNetwork.chain.id,
      viewOffset,
      writeContractAsync,
    ],
  );

  const handleSettle = useCallback(async () => {
    if (!activeAuction || !daoDetails?.auctionAddress) return;
    setError(null);
    try {
      setTxPending(true);
      await ensureConnection();
      const hash = await writeContractAsync({
        address: daoDetails.auctionAddress,
        abi: auctionAbi,
        functionName: "settleCurrentAndCreateNewAuction",
        args: [],
        chainId: resolvedNetwork.chain.id,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: resolvedNetwork.chain.id });
      setRefreshKey((prev) => prev + 1);
      setViewOffset(0);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setTxPending(false);
    }
  }, [activeAuction, daoDetails?.auctionAddress, ensureConnection, resolvedNetwork.chain.id, writeContractAsync]);

  const statusLabel = needsSettlement
    ? "Ended • needs settlement"
    : isViewingActive
      ? "Live auction"
      : "Settled auction";

  const bidderHasValue = Boolean(
    displayAddressRaw &&
    displayAddressRaw !== ZERO_ADDRESS &&
    (currentAuction?.highestBidAmount || currentAuction?.winningBidAmount),
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      style={{
        fontFamily: settings.fontFamily,
        color: settings.fontColor,
        backgroundColor,
      }}
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!hasValidDao ? (
          <div className="rounded-xl border border-black/5 bg-white/70 px-4 py-3 text-sm text-muted-foreground shadow-sm">
            Enter a valid DAO contract address in the fidget settings to load auctions.
          </div>
        ) : null}

        {hasValidDao && (loadingActive || (!currentAuction && loadingPast)) && (
          <div className="rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm text-muted-foreground shadow-sm">
            Loading auction details...
          </div>
        )}

        {hasValidDao && !loadingActive && !loadingPast && !currentAuction && (
          <div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-sm text-muted-foreground shadow-sm">
            No auctions found for this DAO yet.
          </div>
        )}

        {hasValidDao && currentAuction && (
          <div className="mx-auto flex max-w-6xl flex-col gap-6 md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:items-center">
            <div className="flex justify-center">
              <div className="w-full max-w-[420px] md:max-w-[520px]">
                <AuctionArt imageUrl={currentAuction.imageUrl} tokenId={currentAuction.tokenId} />
              </div>
            </div>

            <div className="w-full">
              <div className="rounded-3xl bg-white/95 p-5 shadow-xl ring-1 ring-black/5 backdrop-blur md:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-[#5a5a70]">
                    {formatAuctionDate(currentAuction.startTime || currentAuction.endTime)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrev}
                      disabled={!canGoOlder}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-black/10 bg-white text-black shadow-sm transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous auction"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!canGoNewer}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-black/10 bg-white text-black shadow-sm transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next auction"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div
                    className="inline-flex items-center rounded-full bg-black text-white px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                    style={{ letterSpacing: "0.04em" }}
                  >
                    {statusLabel}
                  </div>
                  <div className="text-sm font-medium text-[#4a4a60]">
                    {displayDaoName} • Token #{currentAuction.tokenId || "—"}
                  </div>
                </div>

                <h2
                  className="mt-3 text-3xl font-semibold text-[#17171d] md:text-5xl"
                  style={settings.fontFamily ? { fontFamily: settings.fontFamily } : undefined}
                >
                  {currentAuction.tokenId ? `Noun ${currentAuction.tokenId}` : displayDaoName}
                </h2>

                <div className="mt-5 grid grid-cols-2 gap-4 md:flex md:gap-12">
                  <div>
                    <p className="text-sm font-medium text-[#5a5a70]">
                      {isViewingActive ? "Current bid" : "Winning bid"}
                    </p>
                    <p className="text-3xl font-semibold text-[#17171d] md:text-4xl">{displayBidLabel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#5a5a70]">{isViewingActive ? "Time left" : "Time left"}</p>
                    <p className="text-3xl font-semibold text-[#17171d] md:text-4xl">
                      {isViewingActive ? (isEnded ? "00:00:00" : timeLeftLabel) : "00:00:00"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {needsSettlement ? (
                    <Button
                      onClick={handleSettle}
                      disabled={txPending}
                      className="h-12 w-full justify-center rounded-2xl bg-black text-base font-semibold text-white transition hover:scale-[1.01] hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/30 md:w-auto md:px-8"
                    >
                      {txPending ? "Settling..." : "Settle Auction"}
                    </Button>
                  ) : isViewingActive ? (
                    <>
                      <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={bidValue}
                            onChange={(event) => setBidValue(event.target.value)}
                            placeholder={minBidPlaceholder}
                            disabled={txPending || isEnded}
                            className="h-12 w-full rounded-2xl border-2 border-black/10 bg-white pr-16 text-base font-semibold text-[#17171d] placeholder:font-semibold"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#5a5a70]">
                            ETH
                          </span>
                        </div>
                        <Button
                          disabled={txPending || isEnded || !bidValue}
                          onClick={() => handleBid(bidValue)}
                          className="h-12 w-full justify-center rounded-2xl bg-black text-base font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/30 md:w-auto md:px-8"
                        >
                          {txPending ? "Submitting..." : "Place Bid"}
                        </Button>
                      </div>
                      <div className="text-sm font-medium text-[#5a5a70]">
                        {bidderHasValue ? (
                          <>
                            Highest bidder{" "}
                            <AddressDisplay
                              ensName={ensName}
                              address={normalizedDisplayAddress}
                              avatar={ensAvatar}
                              className="inline-flex align-middle"
                            />
                          </>
                        ) : (
                          "No bids yet"
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 text-sm font-medium text-[#5a5a70]">
                      <div>Winning bid {displayBidLabel}</div>
                      <div className="flex items-center gap-2">
                        Won by{" "}
                        {bidderHasValue ? (
                          <AddressDisplay ensName={ensName} address={normalizedDisplayAddress} avatar={ensAvatar} />
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default {
  fidget: NounishAuctions,
  properties: nounishAuctionsConfig,
} as FidgetModule<FidgetArgs<NounishAuctionsSettings>>;
