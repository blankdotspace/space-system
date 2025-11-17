import React, { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import TextInput from "@/common/components/molecules/TextInput";
import FontSelector from "@/common/components/molecules/FontSelector";
import ThemeColorSelector from "@/common/components/molecules/ThemeColorSelector";
import { Button } from "@/common/components/atoms/button";
import { ScrollArea } from "@/common/components/atoms/scroll-area";
import {
  FidgetArgs,
  FidgetModule,
  FidgetProperties,
  type FidgetSettingsStyle,
} from "@/common/fidgets";
import axiosBackend from "@/common/data/api/backend";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import {
  defaultStyleFields,
  WithMargin,
} from "@/fidgets/helpers";
import type {
  ClankerManagerApiResponse,
  ClankerManagerTokenResult,
} from "@/common/data/queries/clankerManager";
import { formatUnits, getAddress, type Address } from "viem";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import {
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { wagmiConfig } from "@/common/providers/Wagmi";
import { RiRobot2Line } from "react-icons/ri";

const CLANKER_FEE_LOCKER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "feeOwner", type: "address" },
      { internalType: "address", name: "token", type: "address" },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const LP_LOCKER_V2_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const CLANKER_V4_FEE_LOCKER_ADDRESS = getAddress(
  "0xF3622742b1E446D92e45E22923Ef11C2fcD55D68",
);

const CLANKER_V3_FEE_LOCKER_ADDRESS = getAddress(
  "0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E",
);

export type ClankerManagerSettings = {
  deployerAddress: string;
  rewardRecipientAddress?: string;
  accentColor: string;
  primaryFontFamily?: string;
  primaryFontColor?: string;
  secondaryFontFamily?: string;
  secondaryFontColor?: string;
} & FidgetSettingsStyle;

const clankerManagerProperties: FidgetProperties = {
  fidgetName: "Clanker Manager",
  mobileFidgetName: "Clanker",
  icon: 0x1f916,
  mobileIcon: <RiRobot2Line size={20} />,
  fields: [
    {
      fieldName: "deployerAddress",
      displayName: "Deployer Address",
      displayNameHint:
        "Ethereum address that deployed the Clanker tokens you want to manage.",
      default: "",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} placeholder="0x1234..." />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "rewardRecipientAddress",
      displayName: "Reward Recipient Address",
      displayNameHint:
        "Optional. Address that receives fees for v4 tokens. Defaults to the deployer address when left blank.",
      default: "",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} placeholder="0xABC..." />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "accentColor",
      displayName: "Secondary Color",
      displayNameHint: "Accent color used for highlights and key UI elements.",
      default: "#2563eb",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ThemeColorSelector
            {...props}
            themeVariable="var(--user-theme-link-color)"
            defaultColor="#2563eb"
            colorType="accent color"
          />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "primaryFontFamily",
      displayName: "Primary Font",
      displayNameHint: "Font used for body content.",
      default: "var(--user-theme-font)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <FontSelector {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "primaryFontColor",
      displayName: "Primary Font Color",
      displayNameHint: "Color used for body text.",
      default: "var(--user-theme-font-color)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ThemeColorSelector
            {...props}
            themeVariable="var(--user-theme-font-color)"
            defaultColor="#1f2937"
            colorType="font color"
          />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "secondaryFontFamily",
      displayName: "Secondary Font",
      displayNameHint: "Font used for headings and labels.",
      default: "var(--user-theme-headings-font)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <FontSelector {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "secondaryFontColor",
      displayName: "Secondary Font Color",
      displayNameHint: "Color used for headings and highlight text.",
      default: "var(--user-theme-headings-font-color)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ThemeColorSelector
            {...props}
            themeVariable="var(--user-theme-headings-font-color)"
            defaultColor="#111827"
            colorType="headings color"
          />
        </WithMargin>
      ),
      group: "style",
    },
    ...defaultStyleFields,
  ],
  size: {
    minHeight: 3,
    maxHeight: 36,
    minWidth: 3,
    maxWidth: 36,
  },
};

type ClaimState = {
  status: "idle" | "pending" | "success" | "error";
  message?: string;
};

type ClaimTargets = {
  address: Address;
  symbol?: string;
  amount: bigint;
  decimals: number;
  name?: string;
}[];

function truncateMiddle(value: string, chars = 4): string {
  if (value.length <= chars * 2 + 2) {
    return value;
  }
  return `${value.slice(0, chars + 2)}…${value.slice(-chars)}`;
}

function safeGetAddress(value?: string | null): Address | undefined {
  if (!value) return undefined;
  try {
    return getAddress(value);
  } catch {
    return undefined;
  }
}

function buildClaimTargets(item: ClankerManagerTokenResult): ClaimTargets {
  const rewards: ClaimTargets = [];
  const fees = item.uncollectedFees;
  if (!fees) return rewards;

  const token0Address = safeGetAddress(fees.token0?.address);
  const token1Address = safeGetAddress(fees.token1?.address);
  const token0Amount = fees.token0UncollectedRewards
    ? safeBigInt(fees.token0UncollectedRewards)
    : undefined;
  const token1Amount = fees.token1UncollectedRewards
    ? safeBigInt(fees.token1UncollectedRewards)
    : undefined;

  if (
    token0Address &&
    token0Amount !== undefined &&
    token0Amount > 0n &&
    typeof fees.token0?.decimals === "number"
  ) {
    rewards.push({
      address: token0Address,
      amount: token0Amount,
      decimals: fees.token0.decimals,
      symbol: fees.token0.symbol,
      name: fees.token0.name,
    });
  }

  if (
    token1Address &&
    token1Amount !== undefined &&
    token1Amount > 0n &&
    typeof fees.token1?.decimals === "number"
  ) {
    rewards.push({
      address: token1Address,
      amount: token1Amount,
      decimals: fees.token1.decimals,
      symbol: fees.token1.symbol,
      name: fees.token1.name,
    });
  }

  return rewards;
}

function safeBigInt(value: string): bigint | undefined {
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function parseLpTokenId(value: unknown): bigint | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    return BigInt(Math.trunc(value));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    return safeBigInt(trimmed);
  }

  return undefined;
}

function parseChainId(
  value: number | string | null | undefined,
): number | undefined {
  if (value == null) return undefined;
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function formatTokenAmount(
  amount: string | undefined,
  decimals: number | undefined,
  symbol?: string,
): string | null {
  if (!amount || decimals == null) {
    return null;
  }

  const value = safeBigInt(amount);
  if (value === undefined || value === 0n) {
    return null;
  }

  const units = formatUnits(value, decimals);
  const numeric = Number.parseFloat(units);
  const formatted = Number.isFinite(numeric)
    ? numeric.toLocaleString(undefined, {
        maximumFractionDigits: numeric < 1 ? 6 : 4,
      })
    : units;

  return symbol ? `${formatted} ${symbol}` : formatted;
}

const ClankerManagerFidget: React.FC<FidgetArgs<ClankerManagerSettings>> = ({
  settings,
}) => {
  const {
    deployerAddress,
    rewardRecipientAddress,
    accentColor,
    primaryFontFamily,
    primaryFontColor,
    secondaryFontFamily,
    secondaryFontColor,
    background,
    fidgetBorderColor,
    fidgetBorderWidth,
    fidgetShadow,
  } = settings;

  const normalizedDeployerAddress = useMemo(() => {
    if (!deployerAddress?.trim()) return undefined;
    try {
      return getAddress(deployerAddress.trim());
    } catch {
      return null;
    }
  }, [deployerAddress]);

  const normalizedRewardRecipient = useMemo(() => {
    if (rewardRecipientAddress && rewardRecipientAddress.trim()) {
      try {
        return getAddress(rewardRecipientAddress.trim());
      } catch {
        return null;
      }
    }
    if (normalizedDeployerAddress && normalizedDeployerAddress !== null) {
      return normalizedDeployerAddress as Address | undefined;
    }
    return undefined;
  }, [rewardRecipientAddress, normalizedDeployerAddress]);

  const rewardRecipientForClaims = useMemo(
    () => safeGetAddress(normalizedRewardRecipient ?? undefined),
    [normalizedRewardRecipient],
  );

  const primaryFont = primaryFontFamily || "var(--user-theme-font)";
  const primaryColor = primaryFontColor || "var(--user-theme-font-color)";
  const secondaryFont = secondaryFontFamily || "var(--user-theme-headings-font)";
  const secondaryColor = secondaryFontColor || "var(--user-theme-headings-font-color)";
  const accent = accentColor || "#2563eb";

  const {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      "clanker-manager",
      normalizedDeployerAddress,
      normalizedRewardRecipient,
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      if (!normalizedDeployerAddress) {
        throw new Error("A valid deployer address is required");
      }

      const { data: response } = await axiosBackend.get<ClankerManagerApiResponse>(
        "/api/clanker/manager",
        {
          params: {
            address: normalizedDeployerAddress,
            page: pageParam,
            rewardRecipient:
              normalizedRewardRecipient && normalizedRewardRecipient !== null
                ? normalizedRewardRecipient
                : undefined,
          },
        },
      );
      return response;
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: Boolean(normalizedDeployerAddress && normalizedDeployerAddress !== null),
    retry: 1,
    staleTime: 60 * 1000,
  });

  const tokens = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data?.pages],
  );

  const [claimStates, setClaimStates] = useState<Record<string, ClaimState>>({});

  const { address: connectedAddress, chainId } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();

  const setClaimState = useCallback((contract: string, update: ClaimState) => {
    setClaimStates((prev) => ({ ...prev, [contract]: update }));
  }, []);

  const handleClaim = useCallback(
    async (item: ClankerManagerTokenResult) => {
      const contractAddress = item.token.contract_address;
      const tokenAddress = safeGetAddress(contractAddress);
      if (!tokenAddress) {
        setClaimState(contractAddress, {
          status: "error",
          message: "Invalid token address; cannot claim fees.",
        });
        return;
      }

      const providedLockerAddress = safeGetAddress(
        item.uncollectedFees?.lockerAddress ?? item.token.locker_address,
      );

      const lockerAddress =
        item.version === "v4"
          ? CLANKER_V4_FEE_LOCKER_ADDRESS
          : item.version === "v3_1"
            ? CLANKER_V3_FEE_LOCKER_ADDRESS
            : providedLockerAddress;

      if (!lockerAddress) {
        setClaimState(contractAddress, {
          status: "error",
          message: "Locker address unavailable for this token.",
        });
        return;
      }

      const claimTargets = buildClaimTargets(item);
      const lpTokenId = parseLpTokenId(item.uncollectedFees?.lpNftId);

      const rewardRecipient = item.version === "v4"
        ? rewardRecipientForClaims
        : undefined;

      if (item.version === "v4" && !rewardRecipient) {
        setClaimState(contractAddress, {
          status: "error",
          message: "Valid reward recipient is required for v4 tokens.",
        });
        return;
      }

      if (item.version === "v4" && !claimTargets.length) {
        setClaimState(contractAddress, {
          status: "error",
          message: "No uncollected fees to claim.",
        });
        return;
      }

      if (item.version === "v3_1" && lpTokenId === undefined) {
        setClaimState(contractAddress, {
          status: "error",
          message: "Unable to determine the LP token for this deployment.",
        });
        return;
      }

      setClaimState(contractAddress, {
        status: "pending",
        message: "Preparing claim...",
      });

      try {
        let activeAccount = safeGetAddress(connectedAddress);
        let activeChainId = chainId;

        const targetChainId =
          parseChainId(item.token.chain_id) ??
          parseChainId(item.uncollectedFees?.token0?.chainId) ??
          parseChainId(item.uncollectedFees?.token1?.chainId);

        if (!activeAccount) {
          const preferredConnector = connectors?.[0];
          if (!preferredConnector) {
            throw new Error("No wallet connectors available. Please connect a wallet manually.");
          }

          setClaimState(contractAddress, {
            status: "pending",
            message: "Connecting wallet...",
          });

          const connection = await connectAsync({
            connector: preferredConnector,
            chainId: targetChainId ?? activeChainId ?? undefined,
          });

          const connectionData = connection as unknown as {
            account?: string;
            accounts?: readonly string[];
            chainId?: number;
          };

          activeAccount =
            safeGetAddress(connectionData.account) ??
            safeGetAddress(connectionData.accounts?.[0]);
          activeChainId = connectionData.chainId ?? activeChainId ?? targetChainId ?? undefined;

          if (!activeAccount) {
            throw new Error("Wallet connection failed. Please try again.");
          }

          setClaimState(contractAddress, {
            status: "pending",
            message: "Preparing claim...",
          });
        }

        if (!activeAccount) {
          throw new Error("Unable to determine a connected wallet address.");
        }

        if (targetChainId && activeChainId !== targetChainId) {
          if (!switchChainAsync) {
            throw new Error("Switching chains is not supported by this wallet.");
          }

          setClaimState(contractAddress, {
            status: "pending",
            message: "Switching network...",
          });

          const switched = await switchChainAsync({ chainId: targetChainId });
          activeChainId = switched.id;
        }

        const resolvedChainId = targetChainId ?? activeChainId;
        if (!resolvedChainId) {
          throw new Error("Unable to determine the appropriate chain for this claim.");
        }

        setClaimState(contractAddress, {
          status: "pending",
          message: "Awaiting wallet confirmation...",
        });

        console.info("[ClankerManager] Preparing claim", {
          contractAddress,
          lockerAddress,
          version: item.version,
          claimTargets: claimTargets.map((target) => target.address),
          chainId: resolvedChainId,
          providedLockerAddress,
          lpTokenId: lpTokenId?.toString(),
        });

        if (item.version === "v4") {
          for (const target of claimTargets) {
            setClaimState(contractAddress, {
              status: "pending",
              message: `Claiming ${target.symbol ?? "fees"}...`,
            });
            console.info("[ClankerManager] Simulating v4 claim", {
              lockerAddress,
              feeOwner: rewardRecipient,
              rewardToken: target.address,
              chainId: resolvedChainId,
            });

            const simulation = await simulateContract(wagmiConfig, {
              abi: CLANKER_FEE_LOCKER_ABI,
              address: lockerAddress,
              functionName: "claim",
              account: activeAccount,
              chainId: resolvedChainId,
              args: [rewardRecipient as Address, target.address],
            });

            const hash = await writeContract(wagmiConfig, simulation.request);
            console.info("[ClankerManager] Submitted v4 claim", { hash });
            await waitForTransactionReceipt(wagmiConfig, { hash, chainId: resolvedChainId });
          }
        } else if (item.version === "v3_1") {
          setClaimState(contractAddress, {
            status: "pending",
            message: "Claiming LP rewards...",
          });
          console.info("[ClankerManager] Simulating v3.1 claim", {
            lockerAddress,
            tokenAddress,
            lpTokenId: lpTokenId?.toString(),
            chainId: resolvedChainId,
          });

          const simulation = await simulateContract(wagmiConfig, {
            abi: LP_LOCKER_V2_ABI,
            address: lockerAddress,
            functionName: "claimRewards",
            account: activeAccount,
            chainId: resolvedChainId,
            args: [lpTokenId as bigint],
          });

          const hash = await writeContract(wagmiConfig, simulation.request);
          console.info("[ClankerManager] Submitted v3.1 claim", { hash });
          await waitForTransactionReceipt(wagmiConfig, { hash, chainId: resolvedChainId });
        } else {
          throw new Error("Unsupported Clanker version");
        }

        setClaimState(contractAddress, {
          status: "success",
          message: "Fees claimed. Refreshing…",
        });
        await refetch();
      } catch (err) {
        console.error("[ClankerManager] Claim failed", err);
        const message = err instanceof Error ? err.message : String(err);
        setClaimState(contractAddress, {
          status: "error",
          message,
        });
      }
    },
      [
        chainId,
        connectedAddress,
        connectAsync,
        connectors,
        rewardRecipientForClaims,
        refetch,
        setClaimState,
        switchChainAsync,
      ],
  );

  const renderContent = () => {
    if (normalizedDeployerAddress === null) {
      return (
        <div className="flex min-h-[200px] items-center justify-center text-center text-sm">
          Invalid deployer address. Please double-check the value in the fidget settings.
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex min-h-[200px] flex-col gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-lg border border-dashed border-neutral-300/60 p-4"
              style={{
                background: "rgba(255,255,255,0.35)",
              }}
            >
              <div className="h-4 w-1/3 rounded bg-neutral-200" />
              <div className="mt-2 h-3 w-2/3 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load Clanker data.";
      return (
        <div className="flex min-h-[200px] items-center justify-center text-center text-sm">
          {message}
        </div>
      );
    }

    if (!tokens.length) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm">
          <span>No Clanker tokens found for this address.</span>
          <span className="text-xs text-muted-foreground">
            Deploy a token or adjust the deployer address in the settings.
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {tokens.map((item) => {
          const claimTargets = buildClaimTargets(item);
          const lpTokenId = parseLpTokenId(item.uncollectedFees?.lpNftId);
          const claimState = claimStates[item.token.contract_address] ?? {
            status: "idle",
          };
          const hasClaimable =
            claimTargets.length > 0 &&
            (item.version !== "v3_1" || lpTokenId !== undefined);
          const lockerAddress = safeGetAddress(
            item.uncollectedFees?.lockerAddress ?? item.token.locker_address,
          );
          const missingLockerAddress = !lockerAddress;
          const tokenSpaceHref = `/t/base/${item.token.contract_address}`;
          const token0Label = formatTokenAmount(
            item.uncollectedFees?.token0UncollectedRewards,
            item.uncollectedFees?.token0?.decimals,
            item.uncollectedFees?.token0?.symbol,
          );
          const token1Label = formatTokenAmount(
            item.uncollectedFees?.token1UncollectedRewards,
            item.uncollectedFees?.token1?.decimals,
            item.uncollectedFees?.token1?.symbol,
          );
          const needsRewardRecipient =
            item.requiresRewardRecipient && !rewardRecipientForClaims;
          const missingLpTokenId = item.version === "v3_1" && lpTokenId === undefined;
          const defaultHelperMessage = needsRewardRecipient
            ? "Provide a reward recipient address in settings to claim v4 fees."
            : missingLockerAddress
              ? "Locker address unavailable for this token."
              : missingLpTokenId
                ? "Unable to determine the LP token for this deployment."
                : !connectedAddress
                  ? "Click \"Claim Fees\" to connect your wallet."
                  : "";

          const helperMessage = claimState.message ?? defaultHelperMessage;

          return (
            <div
              key={item.token.contract_address}
              className="flex flex-col gap-3 rounded-lg border border-neutral-200/70 bg-white/60 p-4 shadow-sm backdrop-blur"
              style={{
                borderColor: `${accent}20`,
              }}
            >
              <Link
                href={tokenSpaceHref}
                className="group flex flex-col gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  color: "inherit",
                  textDecoration: "none",
                  outlineColor: accent,
                }}
              >
                <div className="flex items-center gap-3">
                  {item.token.img_url ? (
                    <img
                      src={item.token.img_url}
                      alt={item.token.name}
                      className="size-12 rounded-md object-cover"
                    />
                  ) : (
                    <div
                      className="flex size-12 items-center justify-center rounded-md text-lg"
                      style={{
                        backgroundColor: `${accent}22`,
                        color: secondaryColor,
                        fontFamily: secondaryFont,
                      }}
                    >
                      {item.token.symbol.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span
                      className="text-base font-semibold transition-colors group-hover:underline"
                      style={{ fontFamily: secondaryFont, color: secondaryColor }}
                    >
                      {item.token.name || "Unnamed Token"}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-neutral-500">
                      {item.token.symbol || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                  <span>
                    Contract: {truncateMiddle(item.token.contract_address)}
                  </span>
                  {item.token.chain_id ? (
                    <span>Chain ID: {item.token.chain_id}</span>
                  ) : null}
                  {item.version !== "unknown" ? (
                    <span>Version: {item.version.toUpperCase()}</span>
                  ) : null}
                </div>
              </Link>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: secondaryColor, fontFamily: secondaryFont }}
                  >
                    Uncollected Fees
                  </span>
                  <div className="flex flex-col text-sm">
                    {token0Label || token1Label ? (
                      <>
                        {token0Label ? <span>{token0Label}</span> : null}
                        {token1Label ? <span>{token1Label}</span> : null}
                      </>
                    ) : (
                      <span className="text-neutral-500">None</span>
                    )}
                  </div>
                  {item.uncollectedFeesError ? (
                    <span className="text-xs text-neutral-500">
                      {item.uncollectedFeesError}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-neutral-500">{helperMessage}</div>
                <Button
                  variant="primary"
                  disabled={
                    claimState.status === "pending" ||
                    !hasClaimable ||
                    needsRewardRecipient ||
                    Boolean(item.uncollectedFeesError) ||
                    missingLockerAddress ||
                    missingLpTokenId
                  }
                  onClick={() => handleClaim(item)}
                  style={{
                    backgroundColor: accent,
                    color: "#ffffff",
                  }}
                >
                  {claimState.status === "pending"
                    ? "Claiming..."
                    : hasClaimable
                      ? "Claim Fees"
                      : "No Fees"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={mergeClasses(
        "size-full overflow-hidden rounded-xl border",
        "bg-white/70",
      )}
      style={{
        background: background || "var(--user-theme-fidget-background)",
        borderColor: fidgetBorderColor || "var(--user-theme-fidget-border-color)",
        borderWidth: fidgetBorderWidth || "var(--user-theme-fidget-border-width)",
        boxShadow: fidgetShadow || "var(--user-theme-fidget-shadow)",
        color: primaryColor,
        fontFamily: primaryFont,
      }}
    >
      <div className="flex h-full flex-col">
        <div
          className="border-b p-4"
          style={{
            borderColor: `${accent}33`,
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${accent}26`,
                  color: secondaryColor,
                  fontFamily: secondaryFont,
                }}
              >
                <RiRobot2Line />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-lg font-semibold"
                  style={{ fontFamily: secondaryFont, color: secondaryColor }}
                >
                  Clanker Manager
                </span>
                <span className="text-xs text-neutral-500">
                  {normalizedDeployerAddress
                    ? truncateMiddle(normalizedDeployerAddress)
                    : "Awaiting deployer address"}
                </span>
              </div>
            </div>
            <div className="text-xs text-neutral-500">
              {tokens.length > 0
                ? `${tokens.length} token${tokens.length === 1 ? "" : "s"} loaded`
                : "No tokens loaded yet"}
            </div>
          </div>
          {rewardRecipientAddress ? (
            <div className="mt-2 text-xs text-neutral-500">
              Reward recipient: {normalizedRewardRecipient ? truncateMiddle(normalizedRewardRecipient) : "Invalid address"}
            </div>
          ) : null}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            {renderContent()}
            {hasNextPage ? (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  style={{
                    backgroundColor: `${accent}1f`,
                    color: secondaryColor,
                  }}
                >
                  {isFetchingNextPage ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

const ClankerManager: FidgetModule<FidgetArgs<ClankerManagerSettings>> = {
  fidget: ClankerManagerFidget,
  properties: clankerManagerProperties,
};

export default ClankerManager;
