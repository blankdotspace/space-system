import React from "react";
import ChainSelector from "@/common/components/molecules/ChainSelector";
import IFrameWidthSlider from "@/common/components/molecules/IframeScaleSlider";
import TextInput from "@/common/components/molecules/TextInput";
import {
  FidgetArgs,
  FidgetModule,
  FidgetProperties,
  type FidgetSettingsStyle,
} from "@/common/fidgets";
import { BsArrowRepeat } from "react-icons/bs";
import { mobileStyleSettings, WithMargin } from "../helpers";
import ShadowSelector from "@/common/components/molecules/ShadowSelector";
import { useSystemConfig } from "@/common/providers/SystemConfigProvider";

type MatchaFidgetSettings = {
  defaultSellToken: string;
  defaultBuyToken: string;
  fromChain: { id: string; name: string } | null;
  toChain: { id: string; name: string } | null;
  background: string;
  fontFamily: string;
  fontColor: string;
  swapScale: number;
  optionalFeeRecipient?: string;
  size: number;
} & FidgetSettingsStyle;

const matchaProperties: FidgetProperties = {
  fidgetName: "Swap",
  icon: 0x1f501,
  mobileIcon: <BsArrowRepeat size={22} />,
  fields: [
    ...mobileStyleSettings,
    {
      fieldName: "defaultSellToken",
      displayName: "Default Sell Token",
      default: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput
            {...props}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "defaultBuyToken",
      displayName: "Default Buy Token",
      default: "0x48c6740bcf807d6c47c864faeea15ed4da3910ab",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput
            {...props}

          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "fromChain",
      displayName: "Sell Chain",
      default: { id: "8453", name: "Base" },
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ChainSelector
            {...props}

          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "fidgetShadow",
      displayName: "Fidget Shadow",
      displayNameHint: "Shadow for the Fidget. Set to Theme Shadow to inherit the Fidget Shadow Settings from the Theme. Set to None to remove the shadow.",
      default: "var(--user-theme-fidget-shadow)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ShadowSelector
            {...props}
            hideGlobalSettings={false}
          />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "toChain",
      displayName: "Buy Chain",
      default: { id: "8453", name: "Base" },
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ChainSelector
            {...props}

          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "size",
      required: false,
      inputSelector: IFrameWidthSlider,
      group: "style",
    },
  ],
  size: {
    minHeight: 3,
    maxHeight: 36,
    minWidth: 2,
    maxWidth: 36,
  },
};

const Swap: React.FC<FidgetArgs<MatchaFidgetSettings>> = ({
  settings: {
    defaultSellToken,
    defaultBuyToken,
    fromChain = { id: "8453", name: "Base" },
    toChain = { id: "8453", name: "Base" },
    optionalFeeRecipient,
    size = 0.8,
  },
}) => {
  const systemConfig = useSystemConfig();
  const matchaRef = systemConfig.brand.displayName;
  const matchaBaseUrl = "https://matcha.xyz/trade";
  const [url, setUrl] = React.useState("");

  const buildMatchaUrl = React.useCallback(() => {
    const params = new URLSearchParams();
    if (defaultSellToken) params.append("sellAddress", defaultSellToken);
    if (defaultBuyToken) params.append("buyAddress", defaultBuyToken);
    if (fromChain && fromChain.id) {
      params.append("sellChain", fromChain.id);
    }
    if (toChain && toChain.id) {
      params.append("buyChain", toChain.id);
    }
    if (optionalFeeRecipient)
      params.append("feeRecipient", optionalFeeRecipient);
    params.append("ref", matchaRef);
    return `${matchaBaseUrl}?${params.toString()}`;
  }, [defaultSellToken, defaultBuyToken, fromChain, toChain, optionalFeeRecipient, matchaRef]);

  React.useEffect(() => {
    setUrl(buildMatchaUrl());
  }, [buildMatchaUrl]);

  const scaleValue = size;

  React.useEffect(() => {
    let currentScrollY = window.scrollY;
    let preventScroll = false;

    const handleScroll = () => {
      if (preventScroll && window.scrollY !== currentScrollY) {
        window.scrollTo(0, currentScrollY);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data.action === "connectWallet") {
        preventScroll = true;
        currentScrollY = window.scrollY;
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Don't render iframe with empty URL
  if (!url || url.trim() === "") {
    return (
      <div className="h-[calc(100dvh-220px)] md:h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading swap interface...</p>
      </div>
    );
  }

  return (
    <div style={{ overflow: "hidden", width: "100%" }} className="h-[calc(100dvh-220px)] md:h-full">
      <iframe
        src={url}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{
          transform: `scale(${scaleValue})`,
          transformOrigin: "0 0",
          width: `${100 / scaleValue}%`,
          height: `${100 / scaleValue}%`,
          overflow: "hidden",
        }}
        className="size-full"
      />
    </div>
  );
};

export default {
  fidget: Swap,
  properties: matchaProperties,
} as FidgetModule<FidgetArgs<MatchaFidgetSettings>>;
