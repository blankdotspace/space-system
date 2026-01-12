import React, { useEffect, useState } from "react";
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
import { usePrivy } from "@privy-io/react-auth";
import { useLoadFarcasterUser } from "@/common/data/queries/farcaster";
import { useAppStore } from "@/common/data/stores/app";
import { getUsernameForFid } from "../farcaster/utils";

export type PortfolioFidgetSettings = {
  trackType: "farcaster" | "address";
  farcasterUsername: string;
  walletAddresses: string;
} & FidgetSettingsStyle;

const styleFields = defaultStyleFields.filter((field) =>
  ["fidgetBorderColor", "fidgetBorderWidth", "fidgetShadow"].includes(field.fieldName)
);

// Component that shows current user's username or input field
const FarcasterUsernameInput: React.FC<any> = (props) => {
  const currentFid = useAppStore((state) => {
    const authFid = state.account.authenticatorConfig["farcaster:nounspace"]?.data?.accountFid as
      | number
      | null
      | undefined;

    if (authFid && authFid !== 1) {
      return authFid;
    }

    const associatedFids = state.account.getCurrentIdentity()?.associatedFids || [];
    return associatedFids.length > 0 ? associatedFids[0] : null;
  });

  const { data: farcasterUser, isPending } = useLoadFarcasterUser(currentFid ? currentFid : -1);
  const [fetchedUsername, setFetchedUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!currentFid) return;

      if (farcasterUser?.users?.[0]?.username && !isPending) {
        setFetchedUsername(farcasterUser.users[0].username);
        return;
      }

      if (!isPending) {
        try {
          const username = await getUsernameForFid(currentFid);
          if (username) {
            setFetchedUsername(username);
          }
        } catch (error) {
          console.error("Failed to fetch username from fnames:", error);
        }
      }
    };

    fetchUsername();
  }, [currentFid, farcasterUser, isPending]);

  const displayValue = fetchedUsername || props.value;

  return (
    <WithMargin>
      <TextInput {...props} value={displayValue} className="[&_label]:!normal-case" />
    </WithMargin>
  );
};

// Component that shows current user's wallet or input field
const WalletAddressInput: React.FC<any> = (props) => {
  const { user } = usePrivy();
  const displayValue = user?.wallet?.address || props.value;

  return (
    <WithMargin>
      <TextInput {...props} value={displayValue} className="[&_label]:!normal-case" />
    </WithMargin>
  );
};

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
      default: "nounspacetom",
      required: false,
      disabledIf: (settings) => settings.trackType !== "farcaster",
      inputSelector: (props) => <FarcasterUsernameInput {...props} />,
      group: "settings",
    },
    {
      fieldName: "walletAddresses",
      displayName: "Address(es)",
      default: "0x06AE622bF2029Db79Bdebd38F723f1f33f95F6C5",
      required: false,
      disabledIf: (settings) => settings.trackType !== "address",
      inputSelector: (props) => <WalletAddressInput {...props} />,
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

const Portfolio: React.FC<FidgetArgs<PortfolioFidgetSettings>> = ({ settings }) => {
  const { trackType, farcasterUsername, walletAddresses, fidgetBorderColor, fidgetBorderWidth, fidgetShadow } =
    settings;

  const { user } = usePrivy();
  const [effectiveUsername, setEffectiveUsername] = useState(farcasterUsername);
  const [effectiveWalletAddress, setEffectiveWalletAddress] = useState(walletAddresses);

  // Get current user's FID - try both authenticatorConfig and associatedFids
  const currentFid = useAppStore((state) => {
    // First try to get from authenticatorConfig (with signer)
    const authFid = state.account.authenticatorConfig["farcaster:nounspace"]?.data?.accountFid as
      | number
      | null
      | undefined;

    if (authFid && authFid !== 1) {
      return authFid;
    }

    // Fallback to associatedFids (without signer, from PR #1616)
    const associatedFids = state.account.getCurrentIdentity()?.associatedFids || [];
    return associatedFids.length > 0 ? associatedFids[0] : null;
  });

  // Fetch current user's Farcaster profile if FID exists
  const { data: farcasterUser, isPending } = useLoadFarcasterUser(currentFid ? currentFid : -1);

  // Try to get username from Neynar first, fallback to fnames registry
  useEffect(() => {
    const fetchUsername = async () => {
      if (!currentFid) {
        setEffectiveUsername(farcasterUsername);
        return;
      }

      // Try Neynar data first
      if (farcasterUser?.users?.[0]?.username && !isPending) {
        setEffectiveUsername(farcasterUser.users[0].username);
        return;
      }

      // Fallback to fnames registry
      if (!isPending) {
        try {
          const username = await getUsernameForFid(currentFid);
          if (username) {
            setEffectiveUsername(username);
            return;
          }
        } catch (error) {
          console.error("Failed to fetch username from fnames:", error);
        }
      }

      setEffectiveUsername(farcasterUsername);
    };

    fetchUsername();
  }, [currentFid, farcasterUser, isPending, farcasterUsername]);

  useEffect(() => {
    if (user?.wallet?.address) {
      setEffectiveWalletAddress(user.wallet.address);
    } else {
      setEffectiveWalletAddress(walletAddresses);
    }
  }, [user?.wallet?.address, walletAddresses]);

  const baseUrl = "https://balance-fidget.replit.app";
  const url =
    trackType === "address"
      ? `${baseUrl}/portfolio/${encodeURIComponent(effectiveWalletAddress)}`
      : trackType === "farcaster"
        ? `${baseUrl}/fc/${encodeURIComponent(effectiveUsername)}`
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
