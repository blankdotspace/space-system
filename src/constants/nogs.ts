const DEFAULT_NOGS_CONTRACT_ADDR =
  process.env.NEXT_PUBLIC_NOGS_CONTRACT_ADDR ||
  process.env.NOGS_CONTRACT_ADDR ||
  "0xD094D5D45c06c1581f5f429462eE7cCe72215616";

// Export as async function - callers must await
export async function getNogsContractAddr(): Promise<string> {
  return DEFAULT_NOGS_CONTRACT_ADDR;
}

// Legacy export for backward compatibility (will be a Promise)
// Migrate to getNogsContractAddr() instead
export const NOGS_CONTRACT_ADDR: Promise<string> = Promise.resolve(DEFAULT_NOGS_CONTRACT_ADDR);
