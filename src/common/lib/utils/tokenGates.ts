import { type SystemConfig, type CommunityErc20Token, type CommunityNftToken, type CommunityTokenNetwork } from "@/config";
import { base, mainnet, polygon } from "viem/chains";
import type { Chain, Address } from "viem";
import { formatUnits } from "viem";

type GateTokens = {
  erc20Tokens: CommunityErc20Token[];
  nftTokens: CommunityNftToken[];
};

/**
 * Extract gate tokens from SystemConfig.
 * Returns tokens configured in the community config.
 * If no tokens are configured, returns empty arrays.
 */
export function getGateTokensFromConfig(config: SystemConfig): GateTokens {
  return {
    erc20Tokens: config.community.tokens?.erc20Tokens ?? [],
    nftTokens: config.community.tokens?.nftTokens ?? [],
  };
}

/**
 * Extract the primary ERC20 token from SystemConfig.
 * Returns null if no token is configured.
 */
export function getPrimaryErc20Token(config?: SystemConfig): {
  address: Address;
  decimals: number;
  network?: CommunityTokenNetwork;
} | null {
  if (!config) return null;
  
  const tokens = getGateTokensFromConfig(config);
  const primaryErc20 = tokens.erc20Tokens[0];
  
  if (!primaryErc20) return null;
  
  return {
    address: primaryErc20.address as Address,
    decimals: primaryErc20.decimals ?? 18,
    network: primaryErc20.network,
  };
}

/**
 * Extract NFT tokens from SystemConfig.
 * Returns array of NFT token addresses and networks.
 */
export function getNftTokens(config?: SystemConfig): Array<{
  address: string;
  network?: CommunityTokenNetwork;
}> {
  if (!config) return [];
  
  const tokens = getGateTokensFromConfig(config);
  return (tokens.nftTokens || []).map((token) => ({
    address: token.address,
    network: token.network,
  }));
}

/**
 * Format token balance from wagmi balance data.
 * Returns the balance as a number.
 */
export function formatTokenBalance(
  balanceData: { value: bigint; decimals?: number } | undefined,
  tokenDecimals: number = 18
): number {
  if (!balanceData) return 0;
  
  return Number(
    formatUnits(
      balanceData.value,
      balanceData.decimals ?? tokenDecimals
    )
  );
}

export function getChainForNetwork(network?: CommunityTokenNetwork): Chain {
  if (network === "eth" || network === "mainnet") return mainnet;
  if (network === "polygon") return polygon;
  if (network === "base") return base;
  return base;
}

export function mapNetworkToAlchemy(network?: CommunityTokenNetwork): "base" | "eth" | "polygon" {
  if (network === "polygon") return "polygon";
  if (network === "eth" || network === "mainnet") return "eth";
  if (network === "base") return "base";
  return "base";
}
