import React, { useEffect, useMemo } from "react";
import TextInput from "@/common/components/molecules/TextInput";
import SettingsSelector from "@/common/components/molecules/SettingsSelector";
import {
  FidgetArgs,
  FidgetModule,
  FidgetProperties,
  type FidgetSettingsStyle,
} from "@/common/fidgets";
import { defaultStyleFields, WithMargin } from "@/fidgets/helpers";
import { GiTwoCoins } from "react-icons/gi";
import useCurrentFid from "@/common/lib/hooks/useCurrentFid";
import { useLoadFarcasterUser } from "@/common/data/queries/farcaster";
import { useNeynarUser } from "@/common/lib/hooks/useNeynarUser";
import { useFarcasterSigner } from "@/fidgets/farcaster";
import { useAppStore } from "@/common/data/stores/app";
import PortfolioUsernameInput, {
  getPortfolioPrimaryAddress,
} from "./PortfolioUsernameInput";


export type PortfolioFidgetSettings = {
  trackType: "farcaster" | "address";
  farcasterUsername: string;
  walletAddresses: string;
} & FidgetSettingsStyle;

const styleFields = defaultStyleFields.filter((field) =>
  ["fidgetBorderColor", "fidgetBorderWidth", "fidgetShadow"].includes(
    field.fieldName,
  ),
);

const portfolioProperties: FidgetProperties = {
  fidgetName: "Portfolio",
  icon: 0x1f4b0, // 💰
  mobileIcon: <GiTwoCoins size={20} />,
  fields: [
    {
      fieldName: "trackType",
      displayName: "Wallet(s) to track",
      default: "farcaster",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <SettingsSelector
            {...props}
            className="[&_label]:!normal-case"
            settings={[
              { name: "Farcaster username", value: "farcaster" },
              { name: "Wallet Address(es)", value: "address" },
            ]}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "farcasterUsername",
      displayName: "Username",
      required: false,
      disabledIf: (settings) => settings.trackType !== "farcaster",
      inputSelector: (props) => (
        <WithMargin>
          <PortfolioUsernameInput {...props} className="[&_label]:!normal-case" />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "walletAddresses",
      displayName: "Address(es)",
      required: false,
      disabledIf: (settings) => settings.trackType !== "address",
      inputSelector: (props) => (
        <WithMargin>
          <TextInput
            {...props}
            className="[&_label]:!normal-case"
          />
        </WithMargin>
      ),
      group: "settings",
    },
    ...styleFields,
  ],
  size: {
    minHeight: 3,
    maxHeight: 36,
    minWidth: 3,
    maxWidth: 36,
  },
};

const Portfolio: React.FC<FidgetArgs<PortfolioFidgetSettings>> = ({
  settings,
  data,
  saveData,
}) => {
  const {
    trackType,
    farcasterUsername,
    walletAddresses,
    fidgetBorderColor,
    fidgetBorderWidth,
    fidgetShadow,
  } = settings;

  const currentFid = useCurrentFid();
  const farcasterSigner = useFarcasterSigner("portfolio");
  const effectiveFid = (currentFid ?? farcasterSigner.fid) ?? -1;
  const associatedFid = useAppStore(
    (state) => state.account.getCurrentIdentity()?.associatedFids?.[0],
  );
  const lookupFid =
    effectiveFid > 0 ? effectiveFid : associatedFid ?? -1;
  const { data: currentUserData } = useLoadFarcasterUser(
    lookupFid,
    lookupFid > 0 ? lookupFid : undefined,
  );
  const loggedInUsername = useMemo(() => {
    const username = currentUserData?.users?.[0]?.username;
    return typeof username === "string" ? username.trim() : "";
  }, [currentUserData]);

  const normalizedUsername = useMemo(
    () => (farcasterUsername || "").trim().replace(/^@/, ""),
    [farcasterUsername],
  );

  const effectiveUsername = (normalizedUsername || loggedInUsername || "").toLowerCase();
  const { user: effectiveUser } = useNeynarUser(
    effectiveUsername ? effectiveUsername : undefined,
  );

  const derivedAddresses = useMemo(
    () => getPortfolioPrimaryAddress(effectiveUser),
    [effectiveUser],
  );

  const resolvedFarcasterUsername = useMemo(() => {
    const normalized = (farcasterUsername || "").trim().replace(/^@/, "");
    return normalized || loggedInUsername || "";
  }, [farcasterUsername, loggedInUsername]);

  const resolvedWalletAddresses = useMemo(() => {
    const normalized = (walletAddresses || "").trim();
    return normalized;
  }, [walletAddresses]);

  useEffect(() => {
    if (normalizedUsername || !loggedInUsername) return;

    const previous =
      (data as { lastFetchSettings?: { farcasterUsername?: string } } | undefined)
        ?.lastFetchSettings?.farcasterUsername;

    if (previous === loggedInUsername) return;

    void saveData({
      ...(data || {}),
      lastFetchSettings: {
        ...(data as { lastFetchSettings?: Record<string, unknown> } | undefined)
          ?.lastFetchSettings,
        farcasterUsername: loggedInUsername,
      },
    });
  }, [normalizedUsername, loggedInUsername, data, saveData]);

  useEffect(() => {
    if (!effectiveUsername || !derivedAddresses) return;

    const addressInput = (walletAddresses || "").trim();
    if (addressInput) return;

    const previous =
      (data as { lastFetchSettings?: { walletAddresses?: string } } | undefined)
        ?.lastFetchSettings?.walletAddresses;
    if (previous === derivedAddresses) return;

    void saveData({
      ...(data || {}),
      lastFetchSettings: {
        ...(data as { lastFetchSettings?: Record<string, unknown> } | undefined)
          ?.lastFetchSettings,
        walletAddresses: derivedAddresses,
      },
    });
  }, [effectiveUsername, derivedAddresses, walletAddresses, data, saveData]);

  const baseUrl = "https://balance-fidget.replit.app";
  const url =
    trackType === "address"
      ? resolvedWalletAddresses
        ? `${baseUrl}/portfolio/${encodeURIComponent(resolvedWalletAddresses)}`
        : baseUrl
      : trackType === "farcaster"
        ? resolvedFarcasterUsername
          ? `${baseUrl}/fc/${encodeURIComponent(resolvedFarcasterUsername)}`
          : baseUrl
        : baseUrl;

  return (
    <div
      style={{
        overflow: "hidden",
        width: "100%",
        borderColor: fidgetBorderColor,
        borderWidth: fidgetBorderWidth,
        boxShadow: fidgetShadow,
      }}
      className="h-[calc(100dvh-220px)] md:h-full"
    >
      <iframe src={url} className="size-full" frameBorder="0" />
    </div>
  );
};

export default {
  fidget: Portfolio,
  properties: portfolioProperties,
} as FidgetModule<FidgetArgs<PortfolioFidgetSettings>>;
