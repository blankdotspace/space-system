import { SpaceConfig } from "@/app/(spaces)/Space";
import { FeedType, FilterType } from "@neynar/nodejs-sdk/build/api";
import { cloneDeep } from "lodash";
import { getLayoutConfig } from "@/common/utils/layoutFormatUtils";
import { INITIAL_SPACE_CONFIG_EMPTY } from "../../initialSpaceConfig";

// Set default tabNames for profile spaces
const INITIAL_PROFILE_SPACE_CONFIG = cloneDeep(INITIAL_SPACE_CONFIG_EMPTY);
INITIAL_PROFILE_SPACE_CONFIG.tabNames = ["Profile"];

const createInitialProfileSpaceConfigForFid = (
  fid: number,
  username?: string,
  walletAddress?: string,
): Omit<SpaceConfig, "isEditable"> => {
  const config = cloneDeep(INITIAL_PROFILE_SPACE_CONFIG);
  config.fidgetInstanceDatums = {
    "feed:profile": {
      config: {
        editable: false,
        settings: {
          feedType: FeedType.Filter,
          users: fid,
          filterType: FilterType.Fids,
        },
        data: {},
      },
      fidgetType: "feed",
      id: "feed:profile",
    },
    "Portfolio:cd627e89-d661-4255-8c4c-2242a950e93e": {
      config: {
        editable: false,
        settings: {
          trackType: "farcaster",
          farcasterUsername: username ?? "",
          walletAddresses: "",
        },
        data: {},
      },
      fidgetType: "Portfolio",
      id: "Portfolio:cd627e89-d661-4255-8c4c-2242a950e93e",
    },
    "BuilderScore:builder-score": {
      config: {
        editable: false,
        settings: {
          fid: fid.toString(),
          darkMode: false,
        },
        data: {},
      },
      fidgetType: "BuilderScore",
      id: "BuilderScore:builder-score",
    },
    "ClankerManager:clanker-manager": {
      config: {
        editable: false,
        settings: {
          deployerAddress: walletAddress || "",
          rewardRecipientAddress: "",
          accentColor: "#2563eb",
          primaryFontFamily: "var(--user-theme-font)",
          primaryFontColor: "var(--user-theme-font-color)",
          secondaryFontFamily: "var(--user-theme-headings-font)",
          secondaryFontColor: "var(--user-theme-headings-font-color)",
          background: "var(--user-theme-fidget-background)",
          fidgetBorderColor: "var(--user-theme-fidget-border-color)",
          fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
          fidgetShadow: "var(--user-theme-fidget-shadow)",
        },
        data: {},
      },
      fidgetType: "ClankerManager",
      id: "ClankerManager:clanker-manager",
    },
  };
  const layoutItems = [
    {
      w: 6,
      h: 8,
      x: 0,
      y: 0,
      i: "feed:profile",
      minW: 4,
      maxW: 36,
      minH: 6,
      maxH: 36,
      moved: false,
      static: false,
    },
    {
      w: 6,
      h: 4,
      x: 6,
      y: 0,
      i: "Portfolio:cd627e89-d661-4255-8c4c-2242a950e93e",
      minW: 3,
      maxW: 36,
      minH: 3,
      maxH: 36,
      moved: false,
      static: false,
    },
    {
      w: 6,
      h: 2,
      x: 6,
      y: 4,
      i: "BuilderScore:builder-score",
      minW: 3,
      maxW: 36,
      minH: 2,
      maxH: 36,
      moved: false,
      static: false,
    },
    {
      w: 6,
      h: 4,
      x: 6,
      y: 6,
      i: "ClankerManager:clanker-manager",
      minW: 3,
      maxW: 36,
      minH: 3,
      maxH: 36,
      moved: false,
      static: false,
    },
  ];

  // Set the layout configuration
  const layoutConfig = getLayoutConfig(config.layoutDetails);
  layoutConfig.layout = layoutItems;
  
  // Set default tab names
  config.tabNames = ["Profile"];
  
  return config;
};

export default createInitialProfileSpaceConfigForFid;
