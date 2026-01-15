import type { Address } from "viem";
import { isAddress } from "viem";

const DEFAULT_SPACE_CONTRACT_ADDR =
  (process.env.NEXT_PUBLIC_SPACE_CONTRACT_ADDR ||
    process.env.SPACE_CONTRACT_ADDR ||
    "0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab") as Address;

// Export as async function - callers must await
export async function getSpaceContractAddr(): Promise<Address> {
  if (!isAddress(DEFAULT_SPACE_CONTRACT_ADDR)) {
    throw new Error(
      "Invalid default SPACE contract address configured. Expected a checksummed 0x-prefixed address.",
    );
  }

  return DEFAULT_SPACE_CONTRACT_ADDR;
}

// Legacy export for backward compatibility (will be a Promise)
// Migrate to getSpaceContractAddr() instead
export const SPACE_CONTRACT_ADDR: Promise<Address> = getSpaceContractAddr();
