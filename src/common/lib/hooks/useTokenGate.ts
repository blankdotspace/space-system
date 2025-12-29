import { usePrivy } from "@privy-io/react-auth";
import { useBalance } from "wagmi";
import { zeroAddress, type Address } from "viem";
import { useAppStore } from "@/common/data/stores/app";
import { getPrimaryErc20Token, getChainForNetwork, formatTokenBalance } from "@/common/lib/utils/tokenGates";
import { MIN_SPACE_TOKENS_FOR_UNLOCK } from "@/common/constants/gates";
import type { SystemConfig } from "@/config";

/**
 * Custom hook for token gating logic.
 * Handles ERC20 token balance checking and nOGs gating.
 * 
 * @param systemConfig - Optional SystemConfig to extract tokens from
 * @returns Token gating state and utilities
 */
export function useTokenGate(systemConfig?: SystemConfig) {
  const { user } = usePrivy();
  const erc20Token = getPrimaryErc20Token(systemConfig);
  const walletAddress = user?.wallet?.address as Address | undefined;
  
  const { data: balanceData, isLoading, isFetching } = useBalance({
    address: walletAddress ?? zeroAddress,
    token: (erc20Token?.address || zeroAddress) as Address,
    chainId: erc20Token ? getChainForNetwork(erc20Token.network).id : undefined,
    query: { enabled: Boolean(walletAddress) && !!erc20Token },
  });
  
  const balanceAmount = formatTokenBalance(balanceData, erc20Token?.decimals);
  const hasEnoughTokens = balanceAmount >= MIN_SPACE_TOKENS_FOR_UNLOCK;
  
  const { hasNogs } = useAppStore((state) => ({
    hasNogs: state.account.hasNogs,
  }));
  
  const gatingSatisfied = hasNogs || hasEnoughTokens;
  
  return {
    erc20Token,
    balanceAmount,
    hasEnoughTokens,
    gatingSatisfied,
    isLoading: isLoading || isFetching,
    walletAddress,
    hasNogs,
  };
}

