import React, { useEffect, useMemo, useRef } from "react";
import TextInput from "@/common/components/molecules/TextInput";
import { useNeynarUser } from "@/common/lib/hooks/useNeynarUser";

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
  const normalized = (value || "").trim().replace(/^@/, "");
  const { user } = useNeynarUser(normalized ? normalized : undefined);
  const primaryAddress = useMemo(() => getPrimaryAddress(user), [user]);
  const lastAppliedRef = useRef<string>("");

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
