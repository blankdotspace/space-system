'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  WagmiProvider,
  useAccount,
  useConnect,
  useEnsName,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { simulateContract, waitForTransactionReceipt } from "wagmi/actions";
import { ContractFunctionExecutionError } from "viem";
import AuctionHero from "./components/AuctionHero";
import BidModal from "./components/BidModal";
import StatsRow from "./components/StatsRow";
import {
  AlreadyOwnSection,
  FaqAccordion,
  GetANounSection,
  GovernedByYouSection,
  JourneySection,
  LearnSection,
  NounsFundsIdeasSection,
  TheseAreNounsStrip,
  ThisIsNounsSection,
} from "./components/Sections";
import { nounsWagmiConfig, REQUIRED_CHAIN_ID } from "./wagmiConfig";
import { nounsPublicClient, NOUNS_AH_ADDRESS } from "./config";
import { NounsAuctionHouseV3Abi, NounsAuctionHouseExtraAbi } from "./abis";
import type { Auction, Settlement } from "./types";
import { formatEth, getAuctionStatus } from "./utils";
import { useEthUsdPrice, formatUsd } from "./price";
import { fetchExecutedProposalsCount, fetchCurrentTokenHolders, fetchLatestAuction, fetchAuctionById, fetchNounSeedBackground, NOUNS_BG_HEX, fetchAccountLeaderboardCount } from "./subgraph";
import LinkOut from "./LinkOut";


const useAuctionData = () => {
  const [auction, setAuction] = useState<Auction | undefined>();
  const [loading, setLoading] = useState(true);

  const fetchAuction = useCallback(async () => {
    try {
      setLoading(true);
      // Prefer subgraph for resiliency and speed
      try {
        const sg = await fetchLatestAuction();
        if (sg) {
          const normalized: Auction = {
            nounId: BigInt(sg.id),
            amount: BigInt(sg.amount),
            startTime: BigInt(sg.startTime),
            endTime: BigInt(sg.endTime),
            bidder: (sg.bidder?.id ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
            settled: Boolean(sg.settled),
          };
          setAuction(normalized);
          return normalized;
        }
      } catch (_) {
        // fall through to on-chain
      }

      const data = await nounsPublicClient.readContract({
        address: NOUNS_AH_ADDRESS,
        abi: NounsAuctionHouseV3Abi,
        functionName: "auction",
      });
      const [nounId, amount, startTime, endTime, bidder, settled] = data as unknown as [
        bigint,
        bigint,
        bigint,
        bigint,
        `0x${string}`,
        boolean,
      ];
      const normalized: Auction = { nounId, amount, startTime, endTime, bidder, settled };
      setAuction(normalized);
      return normalized;
    } catch (error) {
      console.error("Failed to load auction", error);
      setAuction(undefined);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const result = await fetchAuction();
        if (!mounted) return;
        setAuction(result);
      } catch (error) {
        console.error(error);
      }
    };
    load();
    const interval = setInterval(load, 15_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchAuction]);

  return {
    auction,
    loading,
    refetch: fetchAuction,
  };
};

const pageSize = 12;

const useSettlements = (auction?: Auction) => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadSettlements = useCallback(
    async (pageToLoad: number, reset = false) => {
      if (!auction) return;
      setIsLoading(true);
      try {
        const currentAuctionId = Number(auction.nounId);
        const latestSettledId = auction.settled
          ? currentAuctionId
          : currentAuctionId - 1;
        if (latestSettledId < 0) {
          setSettlements([]);
          setHasMore(false);
          return;
        }
        const endId = latestSettledId - pageToLoad * pageSize;
        if (endId < 0) {
          setHasMore(false);
          return;
        }
        const startId = Math.max(0, endId - (pageSize - 1));
        if (startId > endId) {
          setHasMore(false);
          return;
        }
        const data = await nounsPublicClient.readContract({
          address: NOUNS_AH_ADDRESS,
          abi: NounsAuctionHouseV3Abi,
          functionName: "getSettlements",
          args: [BigInt(startId), BigInt(endId), true],
        });
        const normalized = (data as unknown as Settlement[])
          .map((item) => ({
            blockTimestamp: Number(item.blockTimestamp),
            amount: BigInt(item.amount),
            winner: item.winner,
            nounId: BigInt(item.nounId),
            clientId: Number(item.clientId),
          }))
          .sort((a, b) => Number(b.nounId - a.nounId));
        setSettlements((prev) => {
          if (reset || pageToLoad === 0) {
            return normalized;
          }
          const existingIds = new Set(prev.map((item) => item.nounId.toString()));
          const merged = [
            ...prev,
            ...normalized.filter(
              (item) => !existingIds.has(item.nounId.toString()),
            ),
          ];
          return merged;
        });
        setHasMore(startId > 0);
        setPage(pageToLoad);
      } catch (error) {
        if (error instanceof ContractFunctionExecutionError) {
          // The contract reverts with "Internal error" when a requested range has
          // no settlements yet. This is expected during gaps and does not impact
          // the user experience, so we treat it as "no more data".
          setHasMore(false);
          return;
        }
        console.error("Failed to load settlements", error);
      } finally {
        setIsLoading(false);
      }
    },
    [auction],
  );

  useEffect(() => {
    if (!auction) return;
    loadSettlements(0, true);
  }, [auction, loadSettlements]);

  return {
    settlements,
    isLoading,
    hasMore,
    loadNext: () => {
      if (!hasMore || isLoading) return;
      loadSettlements(page + 1);
    },
    refresh: () => loadSettlements(0, true),
  };
};

const INNER_PADDING = "space-y-10 md:space-y-14";

const NounsHomeInner: React.FC = () => {
  const { auction, refetch } = useAuctionData();
  const { settlements, refresh } = useSettlements(auction);
  const { isConnected, address, chainId } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [countdown, setCountdown] = useState(0);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [reservePrice, setReservePrice] = useState<bigint | null>(null);
  const [minIncrementPct, setMinIncrementPct] = useState<number | null>(null);
  const [viewNounId, setViewNounId] = useState<number | null>(null);
  const [displayAuction, setDisplayAuction] = useState<Auction | undefined>();
  const [bgHex, setBgHex] = useState<string | undefined>(undefined);
  const [floorNative, setFloorNative] = useState<number | undefined>(undefined);
  const [topOfferNative, setTopOfferNative] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!auction) return;
    // Do not override if user is viewing a past auction
    setViewNounId((prev) => (prev == null || prev >= Number(auction.nounId) ? Number(auction.nounId) : prev));
    setDisplayAuction(auction);
    const updateCountdown = () => {
      const remaining = Number(auction.endTime) * 1000 - Date.now();
      setCountdown(Math.max(0, remaining));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1_000);
    return () => clearInterval(timer);
  }, [auction]);

  useEffect(() => {
    (async () => {
      if (viewNounId == null) return;
      try {
        const sg = await fetchAuctionById(viewNounId);
        if (sg) {
          setDisplayAuction({
            nounId: BigInt(sg.id),
            amount: BigInt(sg.amount),
            startTime: BigInt(sg.startTime),
            endTime: BigInt(sg.endTime),
            bidder: (sg.bidder?.id ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
            settled: Boolean(sg.settled),
          });
          const endMs = Number(sg.endTime) * 1000;
          setCountdown(Math.max(0, endMs - Date.now()));
        }
        const bgIdx = await fetchNounSeedBackground(viewNounId);
        if (bgIdx !== undefined) setBgHex(NOUNS_BG_HEX[bgIdx as 0 | 1] ?? NOUNS_BG_HEX[0]);
      } catch (e) {
        console.warn('Failed loading display auction or background', e);
      }
    })();
  }, [viewNounId]);

  // Fetch collection floor / top offer (Reservoir)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          "https://api.reservoir.tools/collections/v7?id=0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03&includeTopBid=true",
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const json = await res.json();
        const col = json?.collections?.[0];
        // Read exactly what nouns.com reads from Reservoir
        const floor = col?.floorAsk?.price?.amount?.decimal ?? col?.floorAsk?.price?.native;
        const top = col?.topBid?.price?.amount?.decimal ?? col?.topBid?.price?.native;
        if (!cancelled) {
          if (Number.isFinite(floor)) setFloorNative(floor);
          if (Number.isFinite(top)) setTopOfferNative(top);
        }
      } catch (_) {
        // ignore; non-blocking
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch precise bidding parameters when the component mounts
  useEffect(() => {
    (async () => {
      try {
        const [minPct, reserve] = await Promise.all([
          nounsPublicClient
            .readContract({ address: NOUNS_AH_ADDRESS, abi: NounsAuctionHouseExtraAbi, functionName: "minBidIncrementPercentage" })
            .catch(() => null),
          nounsPublicClient
            .readContract({ address: NOUNS_AH_ADDRESS, abi: NounsAuctionHouseExtraAbi, functionName: "reservePrice" })
            .catch(() => null),
        ]);
        if (typeof minPct === "number") setMinIncrementPct(minPct);
        if (typeof reserve === "bigint") setReservePrice(reserve);
      } catch (_) {
        // optional getters; ignore failures
      }
    })();
  }, []);

  const activeAuction = displayAuction ?? auction;

  const minRequiredWei = useMemo(() => {
    if (!activeAuction) return undefined;
    const pct = minIncrementPct ?? 5;
    if (activeAuction.amount === 0n) {
      return (reservePrice ?? 0n) || undefined;
    }
    const increment = (activeAuction.amount * BigInt(pct) + 99n) / 100n; // round up
    return activeAuction.amount + increment;
  }, [activeAuction, minIncrementPct, reservePrice]);

  const { data: bidderEns } = useEnsName({
    address: activeAuction?.bidder,
    chainId: mainnet.id,
    query: {
      enabled:
        Boolean(activeAuction?.bidder) &&
        activeAuction?.bidder !== "0x0000000000000000000000000000000000000000",
    },
  });

  const totalSettled = useMemo(() => {
    if (!activeAuction) return 0;
    const base = Number(activeAuction.nounId);
    return activeAuction.settled ? base + 1 : base;
  }, [activeAuction]);

  const nounHolderCount = useMemo(() => {
    if (!settlements?.length) return undefined;
    const holders = new Set<string>();
    for (const settlement of settlements) {
      const winner = settlement.winner?.toLowerCase();
      if (winner && winner !== '0x0000000000000000000000000000000000000000') {
        holders.add(winner);
      }
    }
    if (auction?.bidder && auction.bidder !== '0x0000000000000000000000000000000000000000') {
      holders.add(auction.bidder.toLowerCase());
    }
    return holders.size || undefined;
  }, [settlements, auction]);

  // Fetch precise counts from public subgraph
  const [executedCount, setExecutedCount] = useState<number | undefined>();
  const [holdersFromSubgraph, setHoldersFromSubgraph] = useState<number | undefined>();
  const [holdersFromPonder, setHoldersFromPonder] = useState<number | undefined>();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [exec, holders, ponder] = await Promise.all([
          fetchExecutedProposalsCount().catch(() => undefined),
          fetchCurrentTokenHolders().catch(() => undefined),
          fetchAccountLeaderboardCount().catch(() => undefined),
        ]);
        if (!cancelled) {
          setExecutedCount(exec);
          setHoldersFromSubgraph(holders);
          setHoldersFromPonder(ponder);
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const treasuryRaisedLabel = useMemo(() => {
    if (!settlements?.length) return undefined;
    const totalEth = settlements.reduce((acc, item) => acc + item.amount, 0n);
    return formatEth(totalEth);
  }, [settlements]);
  const ethUsd = useEthUsdPrice();
  const treasuryRaisedUsdLabel = useMemo(() => {
    if (!settlements?.length || !ethUsd) return undefined;
    const totalEth = settlements.reduce((acc, item) => acc + item.amount, 0n);
    const asEth = Number(formatEth(totalEth).split(' ')[0].replace(/,/g, ''));
    if (!Number.isFinite(asEth)) return undefined;
    return formatUsd(asEth * ethUsd);
  }, [settlements, ethUsd]);

  const status = getAuctionStatus(activeAuction);
  const dateLabel = useMemo(() => {
    const start = activeAuction ? Number(activeAuction.startTime) * 1000 : undefined;
    return start ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(start)) : undefined;
  }, [activeAuction]);

  const handlePrev = () => {
    if (viewNounId == null) return;
    setViewNounId(Math.max(0, viewNounId - 1));
  };
  const handleNext = () => {
    if (viewNounId == null || !auction) return;
    if (viewNounId >= Number(auction.nounId)) return;
    setViewNounId(viewNounId + 1);
  };
  const canGoNext = auction ? (viewNounId ?? 0) < Number(auction.nounId) : false;

  const canBid = isConnected && chainId === REQUIRED_CHAIN_ID && status === "active" && viewNounId === (auction ? Number(auction.nounId) : undefined);

  const handleOpenBid = useCallback(() => {
    setActionMessage(null);
    if (!isConnected) {
      const preferred = connectors?.[0];
      if (preferred) {
        connectAsync({ connector: preferred, chainId: REQUIRED_CHAIN_ID }).catch(() => {
          setActionError("Please connect a wallet to bid.");
        });
      } else {
        setActionError("Please connect a wallet to bid.");
      }
      return;
    }
    if (chainId !== REQUIRED_CHAIN_ID) {
      // Try to switch network automatically
      switchChainAsync({ chainId: REQUIRED_CHAIN_ID }).catch(() => {
        setActionError("Switch to Ethereum mainnet to bid.");
      });
      return;
    }
    if (!canBid) {
      setActionError("Auction is not currently accepting bids.");
      return;
    }
    setActionError(null);
    setBidModalOpen(true);
  }, [isConnected, chainId, canBid]);

  const handleBidSubmit = useCallback(
    async (valueWei: bigint) => {
      if (!auction) return;
      if (!isConnected) {
        setActionError("Connect a wallet to place a bid.");
        return;
      }
      if (chainId !== REQUIRED_CHAIN_ID) {
        try {
          setActionMessage("Switching to Ethereum mainnet...");
          await switchChainAsync({ chainId: REQUIRED_CHAIN_ID });
        } catch {
          setActionError("Switch to Ethereum mainnet to bid.");
          return;
        }
      }
      try {
        setBidSubmitting(true);
        setActionError(null);
        setActionMessage("Waiting for wallet signature...");
        let hash: `0x${string}` | undefined;
        try {
          const simulation = await simulateContract(nounsWagmiConfig, {
            address: NOUNS_AH_ADDRESS,
            abi: NounsAuctionHouseV3Abi,
            functionName: "createBid",
            args: [auction.nounId],
            chainId: REQUIRED_CHAIN_ID,
            account: address!,
            value: valueWei,
          });
          setActionMessage("Transaction submitted. Waiting for confirmation...");
          hash = await writeContractAsync(simulation.request);
        } catch (simErr) {
          // Some RPCs occasionally fail simulate with opaque internal errors.
          // Fallback to a direct write; the chain will enforce validity.
          console.warn("Simulation failed; attempting direct write", simErr);
          setActionMessage("Submitting transaction...");
          hash = await writeContractAsync({
            address: NOUNS_AH_ADDRESS,
            abi: NounsAuctionHouseV3Abi,
            functionName: "createBid",
            args: [auction.nounId],
            chainId: REQUIRED_CHAIN_ID,
            // account optional for injected; wagmi picks signer from connector
            value: valueWei,
          } as any);
        }
        if (!hash) throw new Error("No transaction hash");
        setTxHash(hash);
        const receipt = await waitForTransactionReceipt(nounsWagmiConfig, {
          hash,
        });
        if (receipt.status === "success") {
          setActionMessage("Bid confirmed!");
          setBidModalOpen(false);
          await refetch();
          await refresh();
        } else {
          setActionError("Bid transaction failed");
        }
      } catch (error) {
        console.error("Bid failed", error);
        const message =
          error instanceof Error ? error.message : "Failed to place bid";
        setActionMessage(null);
        setActionError(message);
      } finally {
        setBidSubmitting(false);
        setTimeout(() => setActionMessage(null), 6_000);
      }
    },
    [
      auction,
      isConnected,
      chainId,
      address,
      refetch,
      refresh,
      writeContractAsync,
      switchChainAsync,
    ],
  );

  const attemptSettle = useCallback(
    async (fnName: "settleAuction" | "settleCurrentAndCreateNewAuction") => {
      if (!auction) return null;
      const simulation = await simulateContract(nounsWagmiConfig, {
        address: NOUNS_AH_ADDRESS,
        abi: NounsAuctionHouseV3Abi,
        functionName: fnName,
        args: [],
        chainId: REQUIRED_CHAIN_ID,
        account: address!,
      });
      const hash = await writeContractAsync(simulation.request);
      setTxHash(hash);
      const receipt = await waitForTransactionReceipt(nounsWagmiConfig, { hash });
      return receipt.status;
    },
    [auction, address, writeContractAsync],
  );

  const handleSettle = useCallback(async () => {
    if (!auction) return;
    if (!isConnected) {
      setActionError("Connect a wallet to settle the auction.");
      return;
    }
    if (chainId !== REQUIRED_CHAIN_ID) {
      try {
        setActionMessage("Switching to Ethereum mainnet...");
        await switchChainAsync({ chainId: REQUIRED_CHAIN_ID });
      } catch {
        setActionError("Switch to Ethereum mainnet to settle.");
        return;
      }
    }
    try {
      setIsSettling(true);
      setActionError(null);
      setActionMessage("Submitting settle transaction...");
      const attempts: ("settleAuction" | "settleCurrentAndCreateNewAuction")[] = [
        "settleAuction",
        "settleCurrentAndCreateNewAuction",
      ];
      let success = false;
      let lastError: unknown = null;
      for (const fn of attempts) {
        try {
          const status = await attemptSettle(fn);
          if (status === "success") {
            success = true;
            break;
          }
        } catch (error) {
          lastError = error;
        }
      }
      if (success) {
        setActionMessage("Auction settled!");
        await refetch();
        await refresh();
      } else {
        throw lastError ?? new Error("Settle reverted");
      }
    } catch (error) {
      console.error("Settle failed", error);
      const message =
        error instanceof Error ? error.message : "Failed to settle auction";
      setActionMessage(null);
      setActionError(message);
    } finally {
      setIsSettling(false);
      setTimeout(() => setActionMessage(null), 6_000);
    }
  }, [auction, attemptSettle, chainId, isConnected, refetch, refresh]);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const heroRef = React.useRef<HTMLDivElement>(null);
  const scrollToAuction = React.useCallback(() => {
    const root = rootRef.current;
    const hero = heroRef.current;
    if (!root || !hero) return;
    const top = hero.offsetTop - 8;
    root.scrollTo({ top, behavior: 'smooth' });
  }, []);

  return (
    <div ref={rootRef} className="flex h-full flex-col gap-6 overflow-y-auto p-4 md:p-6">

      <div ref={heroRef}>
      <AuctionHero
        auction={activeAuction}
        ensName={bidderEns}
        countdownMs={countdown}
        onOpenBid={handleOpenBid}
        onSettle={handleSettle}
        isSettling={isSettling}
        isConnected={isConnected}
        headingFontClassName="user-theme-headings-font"
        headingFontFamilyCss="var(--user-theme-headings-font)"
        dateLabel={dateLabel}
        onPrev={handlePrev}
        onNext={handleNext}
        canGoNext={canGoNext}
        backgroundHex={bgHex}
        minRequiredWei={minRequiredWei}
        onPlaceBid={canBid ? handleBidSubmit : undefined}
        floorPriceNative={floorNative}
        topOfferNative={topOfferNative}
        isCurrentView={!canGoNext}
      />
      </div>
      <div className={INNER_PADDING}>
        <ThisIsNounsSection />
        <NounsFundsIdeasSection />
        <GovernedByYouSection nounHolderCount={holdersFromPonder ?? holdersFromSubgraph ?? nounHolderCount} />
        <TheseAreNounsStrip />
        <GetANounSection
          currentAuction={activeAuction}
          countdownMs={countdown}
          onScrollToAuction={scrollToAuction}
          auctionBgHex={bgHex}
        />
        <AlreadyOwnSection />
        <StatsRow
          totalSettled={totalSettled}
          nounHolderCount={holdersFromPonder ?? holdersFromSubgraph ?? nounHolderCount}
          ideasFundedLabel={(executedCount ?? undefined)?.toLocaleString() || "Hundreds+"}
          treasuryRaisedLabel={treasuryRaisedUsdLabel ?? treasuryRaisedLabel}
        />
        <JourneySection />
        <LearnSection />
        <FaqAccordion settlements={settlements} />
      </div>

      {bidModalOpen && auction && (
        <BidModal
          isOpen={bidModalOpen}
          nounId={auction.nounId}
          currentAmount={auction.amount}
          minRequiredWei={minRequiredWei}
          onDismiss={() => {
            setBidModalOpen(false);
            setActionError(null);
          }}
          onConfirm={handleBidSubmit}
          isSubmitting={bidSubmitting}
          errorMessage={actionError ?? undefined}
        />
      )}

      {(actionMessage || actionError || txHash) && (
        <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm shadow-sm">
          {actionMessage && <p className="font-medium">{actionMessage}</p>}
          {actionError && <p className="text-red-600">{actionError}</p>}
          {txHash && (
            <p className="text-xs text-muted-foreground">
              Tx hash: <LinkOut href={`https://etherscan.io/tx/${txHash}`}>{txHash}</LinkOut>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const NounsHomeFidget: React.FC = () => {
  return (
    <WagmiProvider config={nounsWagmiConfig}>
      <NounsHomeInner />
    </WagmiProvider>
  );
};

export default NounsHomeFidget;
