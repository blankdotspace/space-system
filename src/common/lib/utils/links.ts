import {
  EtherScanChainName,
  EtherScanChains,
} from "@/constants/etherscanChainIds";
import { Address } from "viem";
import { getGeckoNetwork } from "./networks";

export function getGeckoUrl(address: Address, network: EtherScanChainName) {
  return `https://www.geckoterminal.com/${getGeckoNetwork(network)}/pools/${address}`;
}

export function getGeckoIframe(address: Address, network: EtherScanChainName) {
  return `https://www.geckoterminal.com/${getGeckoNetwork(network)}/pools/${address}?embed=1&info=0&swaps=0&grayscale=0&light_chart=1`;
}

export function getMatchaUrl(address: Address, network: EtherScanChainName) {
  const ethAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const matchaRef = process.env.NEXT_PUBLIC_MATCHA_REF || "nounspace";
  return `https://matcha.xyz/trade?sellAddress=${ethAddress}&buyAddress=${address}&sellChain=${network}&buyChain=${EtherScanChains[network]}&ref=${matchaRef}`;
}

export function getDexScreenerUrl(
  address: Address,
  network: EtherScanChainName,
  theme: "light" | "dark" = "light",
) {
  return `https://dexscreener.com/${network}/${address}?embed=1&loadChartSettings=0&trades=0&tabs=1&info=0&chartLeftToolbar=0&chartDefaultOnMobile=1&chartTheme=${theme}&theme=${theme}&chartStyle=1&chartType=usd&interval=60`;
}
