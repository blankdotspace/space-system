import { useAppStore } from "@/common/data/stores/app";

export const useCurrentFid = (): number | null => {
  return useAppStore((state) => {
    const currentIdentity = state.account.getCurrentIdentity?.();
    const inferredFid = currentIdentity?.associatedFids?.[0];
    if (typeof inferredFid === "number" && inferredFid > 0) return inferredFid;

    const fid = state.account.authenticatorConfig["farcaster:nounspace"]?.data
      ?.accountFid as number | null | undefined;
    return !fid || fid === 1 ? null : fid;
  });
};

export default useCurrentFid;
