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
import { BsArrowLeftRight } from "react-icons/bs";
import { mobileStyleSettings, WithMargin } from "../helpers";
import ShadowSelector from "@/common/components/molecules/ShadowSelector";

type UniswapFidgetSettings = {
  inputCurrency: string;
  outputCurrency: string;
  chain: { id: string; name: string } | null;
  size: number;
} & FidgetSettingsStyle;

const uniswapProperties: FidgetProperties = {
  fidgetName: "Uniswap",
  icon: 0x1f984, // Unicorn emoji
  mobileIcon: <BsArrowLeftRight size={22} />,
  fields: [
    ...mobileStyleSettings,
    {
      fieldName: "inputCurrency",
      displayName: "Input Currency",
      displayNameHint: "Enter 'NATIVE' for the native token (ETH) or a token contract address",
      default: "NATIVE",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "outputCurrency",
      displayName: "Output Currency",
      displayNameHint: "Enter the token contract address you want to swap to",
      default: "",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "chain",
      displayName: "Chain",
      default: { id: "8453", name: "base" },
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ChainSelector {...props} />
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
          <ShadowSelector {...props} hideGlobalSettings={false} />
        </WithMargin>
      ),
      group: "style",
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

const UniswapSwap: React.FC<FidgetArgs<UniswapFidgetSettings>> = ({
  settings: {
    inputCurrency = "NATIVE",
    outputCurrency,
    chain = { id: "8453", name: "base" },
    size = 1,
  },
}) => {
  const uniswapBaseUrl = "https://app.uniswap.org/swap";
  const [url, setUrl] = React.useState("");

  const buildUniswapUrl = () => {
    const params = new URLSearchParams();
    if (chain && chain.name) {
      params.append("chain", chain.name.toLowerCase());
    }
    if (inputCurrency) {
      params.append("inputCurrency", inputCurrency);
    }
    if (outputCurrency) {
      params.append("outputCurrency", outputCurrency);
    }
    return `${uniswapBaseUrl}?${params.toString()}`;
  };

  React.useEffect(() => {
    setUrl(buildUniswapUrl());
  }, [inputCurrency, outputCurrency, chain]);

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

  if (!url || url.trim() === "") {
    return (
      <div className="h-[calc(100dvh-220px)] md:h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading Uniswap...</p>
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
  fidget: UniswapSwap,
  properties: uniswapProperties,
} as FidgetModule<FidgetArgs<UniswapFidgetSettings>>;
