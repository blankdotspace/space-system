import { SpaceConfig } from "@/app/(spaces)/Space";
import { getLayoutConfig } from "@/common/utils/layoutFormatUtils";
import { INITIAL_SPACE_CONFIG_EMPTY } from "./initialSpaceConfig";
import { deepClone } from "@/common/lib/utils/deepClone";

// Use string literals instead of importing from Neynar SDK to avoid Edge Runtime issues
// These match the enum values from @neynar/nodejs-sdk
const FeedType = {
  Filter: "filter",
} as const;

const FilterType = {
  ChannelId: "channel_id",
} as const;

const INITIAL_CHANNEL_SPACE_CONFIG = deepClone(INITIAL_SPACE_CONFIG_EMPTY);
INITIAL_CHANNEL_SPACE_CONFIG.tabNames = ["Channel"];

const createInitialChannelSpaceConfig = (
  channelId: string,
): Omit<SpaceConfig, "isEditable"> => {
  const config = deepClone(INITIAL_CHANNEL_SPACE_CONFIG);

  config.fidgetInstanceDatums = {
    "feed:channel": {
      config: {
        editable: false,
        settings: {
          feedType: FeedType.Filter,
          filterType: FilterType.ChannelId,
          channel: channelId,
        },
        data: {},
      },
      fidgetType: "feed",
      id: "feed:channel",
    },
  };

  const layoutItems = [
    {
      w: 6,
      h: 8,
      x: 0,
      y: 0,
      i: "feed:channel",
      minW: 4,
      maxW: 20,
      minH: 6,
      maxH: 12,
      moved: false,
      static: false,
    },
  ];

  const layoutConfig = getLayoutConfig(config.layoutDetails);
  layoutConfig.layout = layoutItems;

  config.tabNames = ["Channel"];

  return config;
};

export default createInitialChannelSpaceConfig;
