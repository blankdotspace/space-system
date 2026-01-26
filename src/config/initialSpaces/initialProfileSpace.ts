import { SpaceConfig } from "@/app/(spaces)/Space";
import { FeedType, FilterType } from "@neynar/nodejs-sdk/build/api";
import { getLayoutConfig } from "@/common/utils/layoutFormatUtils";
import { INITIAL_SPACE_CONFIG_EMPTY } from "./initialSpaceConfig";
import { deepClone } from "@/common/lib/utils/deepClone";

// Set default tabNames for profile spaces
const INITIAL_PROFILE_SPACE_CONFIG = deepClone(INITIAL_SPACE_CONFIG_EMPTY);
INITIAL_PROFILE_SPACE_CONFIG.tabNames = ["Profile"];

const createInitialProfileSpaceConfigForFid = (
  fid: number,
  username?: string,
): Omit<SpaceConfig, "isEditable"> => {
  const config = deepClone(INITIAL_PROFILE_SPACE_CONFIG);
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
    "BuilderScore:profile": {
      config: {
        editable: false,
        settings: {
          fid: String(fid),
        },
        data: {},
      },
      fidgetType: "BuilderScore",
      id: "BuilderScore:profile",
    },
    "Top8:profile": {
      config: {
        editable: false,
        settings: {
          username: username ?? "",
        },
        data: {},
      },
      fidgetType: "Top8",
      id: "Top8:profile",
    },
  };
  const layoutItems = [
    {
      w: 4,
      h: 8,
      x: 0,
      y: 0,
      i: "feed:profile",
      minW: 4,
      maxW: 36,
      minH: 2,
      maxH: 36,
      moved: false,
      static: false,
    },
    {
      w: 4,
      h: 8,
      x: 4,
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
      w: 4,
      h: 3,
      x: 8,
      y: 0,
      i: "BuilderScore:profile",
      minW: 3,
      maxW: 36,
      minH: 2,
      maxH: 36,
      moved: false,
      static: false,
    },
    {
      w: 4,
      h: 5,
      x: 8,
      y: 3,
      i: "Top8:profile",
      minW: 4,
      maxW: 36,
      minH: 5,
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
