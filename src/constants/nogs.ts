import { loadSystemConfig } from "@/config";

// Lazy-load config for module-level constant
// This is used in contexts where async isn't possible, so we cache after first load
let cachedAddress: string | null = null;

async function getNogsContractAddress(): Promise<string> {
  if (cachedAddress) {
    return cachedAddress;
  }
  
  const config = await loadSystemConfig();
  cachedAddress = config.community.contracts.nogs;
  return cachedAddress;
}

// Export as async function - callers must await
export async function getNogsContractAddr(): Promise<string> {
  return getNogsContractAddress();
}

// Legacy export for backward compatibility (will be a Promise)
// Migrate to getNogsContractAddr() instead
export const NOGS_CONTRACT_ADDR: Promise<string> = getNogsContractAddress();
