import { useAppStore } from "@/common/data/stores/app";

/**
 * Get the current FID for the authenticated user.
 *
 * Prioritizes inferred FIDs (from associatedFids array) over authenticator FID.
 * If a user has multiple FIDs, this always returns the first one in associatedFids.
 *
 * NOTE: If multiple FID selection is needed in the future, callers should implement
 * that logic separately. This hook intentionally uses a single "current" FID.
 */
export const useCurrentFid = (): number | null => {
  return useAppStore((state) => {
    const currentIdentity = state.account.getCurrentIdentity?.();
    const inferredFid = currentIdentity?.associatedFids?.[0];
    if (typeof inferredFid === "number" && inferredFid > 0) return inferredFid;

    const fid = state.account.authenticatorConfig["farcaster:nounspace"]?.data?.accountFid as number | null | undefined;
    return !fid || fid === 1 ? null : fid;
  });
};

export default useCurrentFid;
