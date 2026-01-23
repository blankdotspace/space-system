import React, { useRef, useEffect, useCallback } from "react";
import {
  createCowSwapWidget,
  CowSwapWidgetParams,
  CowSwapWidgetPalette,
  TradeType,
} from "@cowprotocol/widget-lib";
import TextInput from "@/common/components/molecules/TextInput";
import SwitchButton from "@/common/components/molecules/SwitchButton";
import {
  FidgetArgs,
  FidgetFieldConfig,
  FidgetModule,
  FidgetProperties,
  type FidgetSettingsStyle,
} from "@/common/fidgets";
import { GiCow } from "react-icons/gi";
import { mobileStyleSettings, WithMargin } from "../helpers";
import ShadowSelector from "@/common/components/molecules/ShadowSelector";
import BorderSelector from "@/common/components/molecules/BorderSelector";
import ThemeColorSelector from "@/common/components/molecules/ThemeColorSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/common/components/atoms/select";

// CowSwap supported chains
const COWSWAP_CHAINS = [
  { id: 1, name: "Ethereum" },
  { id: 100, name: "Gnosis" },
  { id: 42161, name: "Arbitrum" },
  { id: 8453, name: "Base" },
  { id: 11155111, name: "Sepolia (Testnet)" },
] as const;

// Trade types available in CowSwap
const TRADE_TYPES = [
  { value: TradeType.SWAP, label: "Swap" },
  { value: TradeType.LIMIT, label: "Limit Order" },
  { value: TradeType.ADVANCED, label: "Advanced (TWAP)" },
  { value: TradeType.YIELD, label: "Yield" },
] as const;

// Base themes
const BASE_THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

type CowSwapFidgetSettings = {
  // Token settings
  sellToken: string;
  sellAmount: string;
  buyToken: string;
  buyAmount: string;
  // Chain
  chainId: number;
  // Trade type
  tradeType: TradeType;
  // Enabled trade types
  enableSwap: boolean;
  enableLimit: boolean;
  enableAdvanced: boolean;
  enableYield: boolean;
  // Theme - simple mode
  baseTheme: "light" | "dark";
  // Theme - advanced palette (all required for custom palette)
  paletteMode: boolean; // If true, use full palette colors
  palettePrimary: string;
  paletteBackground: string;
  palettePaper: string;
  paletteText: string;
  paletteDanger: string;
  paletteWarning: string;
  paletteAlert: string;
  paletteInfo: string;
  paletteSuccess: string;
  // UI options
  standaloneMode: boolean;
  disableToastMessages: boolean;
  disableProgressBar: boolean;
  hideBridgeInfo: boolean;
  hideOrdersTable: boolean;
} & FidgetSettingsStyle;

// Custom chain selector for CowSwap
const CowSwapChainSelector: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const selectedChain = COWSWAP_CHAINS.find((chain) => chain.id === value);

  return (
    <Select
      value={String(value)}
      onValueChange={(selectedId) => onChange(Number(selectedId))}
    >
      <SelectTrigger aria-label="Select blockchain network">
        <span>{selectedChain?.name || "Select a chain"}</span>
      </SelectTrigger>
      <SelectContent>
        {COWSWAP_CHAINS.map((chain) => (
          <SelectItem value={String(chain.id)} key={chain.id}>
            {chain.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Trade type selector
const TradeTypeSelector: React.FC<{
  value: TradeType;
  onChange: (value: TradeType) => void;
}> = ({ value, onChange }) => {
  const selectedType = TRADE_TYPES.find((t) => t.value === value);

  return (
    <Select
      value={value}
      onValueChange={(selectedValue) => onChange(selectedValue as TradeType)}
    >
      <SelectTrigger aria-label="Select trade type">
        <span>{selectedType?.label || "Select trade type"}</span>
      </SelectTrigger>
      <SelectContent>
        {TRADE_TYPES.map((type) => (
          <SelectItem value={type.value} key={type.value}>
            {type.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Base theme selector
const BaseThemeSelector: React.FC<{
  value: "light" | "dark";
  onChange: (value: "light" | "dark") => void;
}> = ({ value, onChange }) => {
  return (
    <Select
      value={value}
      onValueChange={(selectedValue) =>
        onChange(selectedValue as "light" | "dark")
      }
    >
      <SelectTrigger aria-label="Select base theme">
        <span>{value === "light" ? "Light" : "Dark"}</span>
      </SelectTrigger>
      <SelectContent>
        {BASE_THEMES.map((theme) => (
          <SelectItem value={theme.value} key={theme.value}>
            {theme.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const cowSwapProperties: FidgetProperties = {
  fidgetName: "CowSwap",
  icon: 0x1f404, // Cow emoji
  mobileIcon: <GiCow size={22} />,
  fields: [
    ...mobileStyleSettings,
    // Token settings
    {
      fieldName: "sellToken",
      displayName: "Sell Token",
      displayNameHint:
        "Token symbol or address to sell (e.g., USDC, ETH, or contract address)",
      default: "USDC",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "sellAmount",
      displayName: "Sell Amount",
      displayNameHint: "Default amount to sell (in token units)",
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
      fieldName: "buyToken",
      displayName: "Buy Token",
      displayNameHint:
        "Token symbol or address to buy (e.g., COW, WETH, or contract address)",
      default: "COW",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "buyAmount",
      displayName: "Buy Amount",
      displayNameHint: "Default amount to buy (for limit orders)",
      default: "",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    // Chain selector
    {
      fieldName: "chainId",
      displayName: "Chain",
      displayNameHint:
        "Blockchain network for swapping. CowSwap supports Ethereum, Gnosis, Arbitrum, Base, and Sepolia testnet.",
      default: 1,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <CowSwapChainSelector {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    // Trade type
    {
      fieldName: "tradeType",
      displayName: "Default Trade Type",
      displayNameHint:
        "Initial trade type to display. Swap for instant trades, Limit for price-based orders, Advanced for TWAP orders.",
      default: TradeType.SWAP,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TradeTypeSelector {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    // Enabled trade types
    {
      fieldName: "enableSwap",
      displayName: "Enable Swap",
      displayNameHint: "Allow users to make instant swap trades",
      default: true,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "enableLimit",
      displayName: "Enable Limit Orders",
      displayNameHint: "Allow users to place limit orders",
      default: true,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "enableAdvanced",
      displayName: "Enable Advanced (TWAP)",
      displayNameHint:
        "Allow users to create TWAP (Time-Weighted Average Price) orders",
      default: true,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "enableYield",
      displayName: "Enable Yield",
      displayNameHint: "Allow users to access yield features",
      default: true,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    // Theme settings
    {
      fieldName: "baseTheme",
      displayName: "Base Theme",
      displayNameHint: "Light or dark theme for the widget",
      default: "dark",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <BaseThemeSelector {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "paletteMode",
      displayName: "Custom Colors",
      displayNameHint:
        "Enable to customize all theme colors. When disabled, only base theme is used.",
      default: false,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "palettePrimary",
      displayName: "Primary Color",
      displayNameHint: "Primary accent color (hex, e.g., #9861c4)",
      default: "#65D9E9",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "paletteBackground",
      displayName: "Background Color",
      displayNameHint: "Main background color (hex)",
      default: "#131B29",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "palettePaper",
      displayName: "Paper Color",
      displayNameHint: "Card/panel background color (hex)",
      default: "#1E2C3F",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "paletteText",
      displayName: "Text Color",
      displayNameHint: "Main text color (hex)",
      default: "#DEE5ED",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "paletteDanger",
      displayName: "Danger Color",
      displayNameHint: "Error/danger color (hex)",
      default: "#f44336",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "paletteWarning",
      displayName: "Warning Color",
      displayNameHint: "Warning color (hex)",
      default: "#ff9800",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "paletteAlert",
      displayName: "Alert Color",
      displayNameHint: "Alert color (hex)",
      default: "#ff9800",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "paletteInfo",
      displayName: "Info Color",
      displayNameHint: "Info color (hex)",
      default: "#2196f3",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "paletteSuccess",
      displayName: "Success Color",
      displayNameHint: "Success color (hex)",
      default: "#4caf50",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    // UI options
    {
      fieldName: "standaloneMode",
      displayName: "Standalone Mode",
      displayNameHint:
        "Run widget in standalone mode (recommended for embedded use)",
      default: true,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "disableToastMessages",
      displayName: "Disable Toast Messages",
      displayNameHint: "Hide notification toast messages",
      default: false,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "disableProgressBar",
      displayName: "Disable Progress Bar",
      displayNameHint: "Hide the transaction progress bar",
      default: false,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "hideBridgeInfo",
      displayName: "Hide Bridge Info",
      displayNameHint: "Hide cross-chain bridge information",
      default: false,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "hideOrdersTable",
      displayName: "Hide Orders Table",
      displayNameHint: "Hide the orders history table",
      default: false,
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <SwitchButton {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    // Fidget style settings
    {
      fieldName: "background",
      displayName: "Background",
      displayNameHint: "Color used for the background of the Fidget.",
      default: "transparent",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ThemeColorSelector
            {...props}
            themeVariable="var(--user-theme-fidget-background)"
            defaultColor="transparent"
            colorType="background"
          />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "fidgetBorderWidth",
      displayName: "Fidget Border Width",
      displayNameHint:
        "Width of the Fidget's border. Set to Theme Border to inherit from the Theme. Set to None to remove the border.",
      default: "0",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <BorderSelector {...props} hideGlobalSettings={false} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "fidgetBorderColor",
      displayName: "Fidget Border Color",
      displayNameHint: "Color of the Fidget's border.",
      default: "var(--user-theme-fidget-border-color)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ThemeColorSelector
            {...props}
            themeVariable="var(--user-theme-fidget-border-color)"
            defaultColor="#000000"
            colorType="border color"
          />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "fidgetShadow",
      displayName: "Fidget Shadow",
      displayNameHint:
        "Shadow for the Fidget. Set to Theme Shadow to inherit from the Theme. Set to None to remove the shadow.",
      default: "none",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ShadowSelector {...props} hideGlobalSettings={false} />
        </WithMargin>
      ),
      group: "style",
    },
  ] as FidgetFieldConfig[],
  size: {
    minHeight: 3,
    maxHeight: 36,
    minWidth: 2,
    maxWidth: 36,
  },
};

const CowSwap: React.FC<FidgetArgs<CowSwapFidgetSettings>> = ({
  settings: {
    sellToken = "USDC",
    sellAmount = "",
    buyToken = "COW",
    buyAmount = "",
    chainId = 1,
    tradeType = TradeType.SWAP,
    enableSwap = true,
    enableLimit = true,
    enableAdvanced = true,
    enableYield = true,
    baseTheme = "dark",
    paletteMode = false,
    palettePrimary = "#65D9E9",
    paletteBackground = "#131B29",
    palettePaper = "#1E2C3F",
    paletteText = "#DEE5ED",
    paletteDanger = "#f44336",
    paletteWarning = "#ff9800",
    paletteAlert = "#ff9800",
    paletteInfo = "#2196f3",
    paletteSuccess = "#4caf50",
    standaloneMode = true,
    disableToastMessages = false,
    disableProgressBar = false,
    hideBridgeInfo = false,
    hideOrdersTable = false,
  },
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const updateParamsRef = useRef<((params: CowSwapWidgetParams) => void) | null>(
    null
  );

  // Build the enabled trade types array
  const getEnabledTradeTypes = useCallback(() => {
    const types: TradeType[] = [];
    if (enableSwap) types.push(TradeType.SWAP);
    if (enableLimit) types.push(TradeType.LIMIT);
    if (enableAdvanced) types.push(TradeType.ADVANCED);
    if (enableYield) types.push(TradeType.YIELD);
    return types.length > 0 ? types : [TradeType.SWAP]; // Default to swap if none selected
  }, [enableSwap, enableLimit, enableAdvanced, enableYield]);

  // Build theme configuration
  const buildTheme = useCallback(():
    | "light"
    | "dark"
    | CowSwapWidgetPalette => {
    if (!paletteMode) {
      // Simple theme mode - just return the base theme string
      return baseTheme;
    }

    // Full palette mode - return complete palette object
    return {
      baseTheme,
      primary: palettePrimary,
      background: paletteBackground,
      paper: palettePaper,
      text: paletteText,
      danger: paletteDanger,
      warning: paletteWarning,
      alert: paletteAlert,
      info: paletteInfo,
      success: paletteSuccess,
    };
  }, [
    paletteMode,
    baseTheme,
    palettePrimary,
    paletteBackground,
    palettePaper,
    paletteText,
    paletteDanger,
    paletteWarning,
    paletteAlert,
    paletteInfo,
    paletteSuccess,
  ]);

  // Build widget params
  const buildParams = useCallback((): CowSwapWidgetParams => {
    const params: CowSwapWidgetParams = {
      appCode: "Nounspace",
      width: "100%",
      height: "100%",
      chainId,
      tradeType,
      enabledTradeTypes: getEnabledTradeTypes(),
      theme: buildTheme(),
      standaloneMode,
      disableToastMessages,
      disableProgressBar,
      hideBridgeInfo,
      hideOrdersTable,
      images: {},
      sounds: {},
      customTokens: [],
    };

    // Add sell token config
    if (sellToken) {
      params.sell = {
        asset: sellToken,
        ...(sellAmount && { amount: sellAmount }),
      };
    }

    // Add buy token config
    if (buyToken) {
      params.buy = {
        asset: buyToken,
        ...(buyAmount && { amount: buyAmount }),
      };
    }

    return params;
  }, [
    chainId,
    tradeType,
    getEnabledTradeTypes,
    buildTheme,
    standaloneMode,
    disableToastMessages,
    disableProgressBar,
    hideBridgeInfo,
    hideOrdersTable,
    sellToken,
    sellAmount,
    buyToken,
    buyAmount,
  ]);

  // Initialize widget
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear container before creating widget
    containerRef.current.innerHTML = "";

    const params = buildParams();

    // Get provider from window.ethereum if available
    const provider =
      typeof window !== "undefined" ? (window as any).ethereum : undefined;

    try {
      const widget = createCowSwapWidget(containerRef.current, {
        params,
        provider,
      });
      updateParamsRef.current = widget.updateParams;
    } catch (error) {
      console.error("Failed to initialize CowSwap widget:", error);
    }

    return () => {
      // Cleanup: clear container on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      updateParamsRef.current = null;
    };
  }, []); // Only run on mount

  // Update params when settings change
  useEffect(() => {
    if (updateParamsRef.current) {
      const params = buildParams();
      updateParamsRef.current(params);
    }
  }, [buildParams]);

  // Prevent scroll propagation when scrolling inside the widget container
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isScrollingDown = e.deltaY > 0;
    const isScrollingUp = e.deltaY < 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
    const isAtTop = scrollTop <= 0;

    // Prevent scroll propagation when at boundaries
    if ((isScrollingDown && isAtBottom) || (isScrollingUp && isAtTop)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="h-[calc(100dvh-220px)] md:h-full w-full"
      style={{
        overflow: "auto",
        overscrollBehavior: "contain",
      }}
    />
  );
};

export default {
  fidget: CowSwap,
  properties: cowSwapProperties,
} as FidgetModule<FidgetArgs<CowSwapFidgetSettings>>;
