import type { Address } from "viem";
import { isAddress } from "viem";
import { loadSystemConfig } from "@/config";

// Lazy-load config for module-level constant
// This is used in contexts where async isn't possible, so we cache after first load
let cachedAddress: Address | null = null;

async function getSpaceContractAddress(): Promise<Address> {
  if (cachedAddress) {
    return cachedAddress;
  }
  
  const config = await loadSystemConfig();
  const address = config.community.contracts.space;
  
  if (!isAddress(address)) {
    throw new Error(
      "Invalid space contract address configured. Expected a checksummed 0x-prefixed address.",
    );
  }
  
  cachedAddress = address;
  return address;
}

// Export as async function - callers must await
export async function getSpaceContractAddr(): Promise<Address> {
  return getSpaceContractAddress();
}

// Legacy export for backward compatibility (will be a Promise)
// Migrate to getSpaceContractAddr() instead
export const SPACE_CONTRACT_ADDR: Promise<Address> = getSpaceContractAddress();
