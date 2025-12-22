import { loadSystemConfig, type CommunityErc20Token, type CommunityNftToken, type CommunityTokenNetwork } from "@/config";
import { getNogsContractAddr } from "@/constants/nogs";
import { getSpaceContractAddr } from "@/constants/spaceToken";
import { base, mainnet, polygon } from "viem/chains";
import type { Chain } from "viem";

type GateTokens = {
  erc20Tokens: CommunityErc20Token[];
  nftTokens: CommunityNftToken[];
};

export async function getGateTokens(): Promise<GateTokens> {
  const config = await loadSystemConfig();
  const erc20Tokens = config.community.tokens?.erc20Tokens ?? [];
  const nftTokens = config.community.tokens?.nftTokens ?? [];
  const hasConfigTokens = erc20Tokens.length > 0 || nftTokens.length > 0;

  if (hasConfigTokens) {
    return { erc20Tokens, nftTokens };
  }

  // Fallback to legacy SPACE + nOGs addresses
  const [spaceAddress, nogsAddress] = await Promise.all([
    getSpaceContractAddr(),
    getNogsContractAddr(),
  ]);

  return {
    erc20Tokens: [
      {
        address: spaceAddress,
        symbol: "SPACE",
        decimals: 18,
        network: "base",
      },
    ],
    nftTokens: nogsAddress
      ? [
          {
            address: nogsAddress,
            symbol: "NOGS",
            type: "erc721",
            network: "base",
          },
        ]
      : [],
  };
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
