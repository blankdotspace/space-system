import React, { useEffect, useMemo, useRef } from "react";
import TextInput from "@/common/components/molecules/TextInput";
import { useNeynarUser } from "@/common/lib/hooks/useNeynarUser";
import useCurrentFid from "@/common/lib/hooks/useCurrentFid";
import { useLoadFarcasterUser } from "@/common/data/queries/farcaster";
import { useFarcasterSigner } from "@/fidgets/farcaster";
import { useAppStore } from "@/common/data/stores/app";

type PortfolioInputProps = {
  id?: string;
  value: string;
  onChange?: (value: string) => void;
  updateSettings?: (partial: Record<string, unknown>) => void;
  className?: string;
};

const getPrimaryAddress = (user?: {
  verifications?: string[];
  verified_addresses?: { eth_addresses?: string[] };
  custody_address?: string;
} | null) => {
  const verifications = (user?.verifications || [])
    .map((addr) => (typeof addr === "string" ? addr.trim() : ""))
    .filter(Boolean);
  if (verifications.length > 0) return verifications[0]!;

  const verified = (user?.verified_addresses?.eth_addresses || [])
    .map((addr) => (typeof addr === "string" ? addr.trim() : ""))
    .filter(Boolean);
  if (verified.length > 0) return verified[0]!;

  const custody = user?.custody_address;
  return typeof custody === "string" ? custody.trim() : "";
};

const PortfolioUsernameInput: React.FC<PortfolioInputProps> = ({
  value,
  onChange,
  updateSettings,
  ...rest
}) => {
  const currentFid = useCurrentFid();
  const farcasterSigner = useFarcasterSigner("portfolio-settings");
  const associatedFid = useAppStore(
    (state) => state.account.getCurrentIdentity()?.associatedFids?.[0],
  );
  const effectiveFid = (currentFid ?? farcasterSigner.fid) ?? -1;
  const lookupFid = effectiveFid > 0 ? effectiveFid : associatedFid ?? -1;
  const { data: currentUserData } = useLoadFarcasterUser(
    lookupFid,
    lookupFid > 0 ? lookupFid : undefined,
  );
  const loggedInUsername = useMemo(() => {
    const username = currentUserData?.users?.[0]?.username;
    return typeof username === "string" ? username.trim() : "";
  }, [currentUserData]);
  const normalized = (value || "").trim().replace(/^@/, "");
  const { user } = useNeynarUser(normalized ? normalized : undefined);
  const primaryAddress = useMemo(() => getPrimaryAddress(user), [user]);
  const lastAppliedRef = useRef<string>("");
  const lastAutoUsernameRef = useRef<string>("");

  useEffect(() => {
    if (normalized || !loggedInUsername || !updateSettings) return;
    if (lastAutoUsernameRef.current === loggedInUsername) return;
    lastAutoUsernameRef.current = loggedInUsername;
    updateSettings({ farcasterUsername: loggedInUsername });
  }, [normalized, loggedInUsername, updateSettings]);

  useEffect(() => {
    if (!normalized || !primaryAddress || !updateSettings) return;
    if (lastAppliedRef.current === primaryAddress) return;
    lastAppliedRef.current = primaryAddress;
    updateSettings({
      farcasterUsername: normalized,
      walletAddresses: primaryAddress,
    });
  }, [normalized, primaryAddress, updateSettings]);

  return (
    <TextInput
      {...rest}
      value={value}
      onChange={(next) => {
        onChange?.(next);
      }}
    />
  );
};

export const getPortfolioPrimaryAddress = getPrimaryAddress;
export default PortfolioUsernameInput;
