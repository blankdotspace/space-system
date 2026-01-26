/**
 * Explore page config builder
 * 
 * Creates NavPageConfig for explore pages with Directory fidgets
 */

import DEFAULT_THEME from '../../src/common/lib/theme/defaultTheme';
import type { NavPageConfig, TabConfig } from '../../src/config/systemConfig';
import type {
  DirectoryFidgetSettings,
  DirectoryNetwork,
  DirectoryChannelFilterOption,
  DirectoryAssetType,
} from '../../src/fidgets/token/Directory/types';

// ============================================================================
// Types
// ============================================================================

export type TokenInput = {
  address: string;
  symbol: string;
  network?: DirectoryNetwork | 'eth';
  assetType?: DirectoryAssetType;
};

export type ExplorePageOptions = {
  tokens?: TokenInput[];
  channel?: string | null;
  defaultTokenNetwork?: DirectoryNetwork;
  channelNetwork?: DirectoryNetwork;
};

// ============================================================================
// Constants
// ============================================================================

const FULL_WIDTH = 12;
const FULL_HEIGHT = 24;
const RESIZE_HANDLES = ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'] as const;

const BASE_DIRECTORY_SETTINGS: Pick<
  DirectoryFidgetSettings,
  | 'layoutStyle'
  | 'include'
  | 'mobileDisplayName'
  | 'primaryFontFamily'
  | 'primaryFontColor'
  | 'secondaryFontFamily'
  | 'secondaryFontColor'
> = {
  layoutStyle: 'cards',
  include: 'holdersWithFarcasterAccount',
  mobileDisplayName: undefined,
  primaryFontFamily: undefined,
  primaryFontColor: undefined,
  secondaryFontFamily: undefined,
  secondaryFontColor: undefined,
};

// ============================================================================
// Helper Functions
// ============================================================================

const sanitizeTabKey = (value: string, fallback: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const slugify = (value: string, fallback: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : fallback;
};

const createDirectoryFidgetId = (suffix: string): string => `Directory:${suffix}`;

const normalizeTokenNetwork = (
  network: DirectoryNetwork | 'eth' | undefined,
  defaultNetwork: DirectoryNetwork,
): DirectoryNetwork => {
  if (!network) return defaultNetwork;
  if (network === 'eth') return 'mainnet';
  return network;
};

// ============================================================================
// Config Builders
// ============================================================================

const buildTokenDirectorySettings = (
  token: TokenInput,
  defaultNetwork: DirectoryNetwork,
): DirectoryFidgetSettings => ({
  ...BASE_DIRECTORY_SETTINGS,
  source: 'tokenHolders',
  network: normalizeTokenNetwork(token.network, defaultNetwork),
  contractAddress: token.address,
  assetType: token.assetType ?? 'token',
  sortBy: 'tokenHoldings',
});

const buildChannelDirectorySettings = (
  channel: string,
  channelNetwork: DirectoryNetwork,
): DirectoryFidgetSettings => ({
  ...BASE_DIRECTORY_SETTINGS,
  source: 'farcasterChannel',
  network: channelNetwork,
  contractAddress: '',
  assetType: 'token',
  sortBy: 'followers',
  channelName: channel,
  channelFilter: 'members' as DirectoryChannelFilterOption,
});

const createTabTheme = (idSuffix: string) => ({
  id: `explore-${idSuffix}-theme`,
  name: `${DEFAULT_THEME.name} Explore`,
  properties: {
    ...DEFAULT_THEME.properties,
    fidgetBorderRadius: '0px',
    gridSpacing: '0',
  },
});

const buildTabConfig = (
  name: string,
  idSuffix: string,
  settings: DirectoryFidgetSettings,
): TabConfig => {
  const fidgetId = createDirectoryFidgetId(idSuffix);
  return {
    name,
    displayName: name,
    layoutID: `explore-${idSuffix}-layout`,
    layoutDetails: {
      layoutFidget: 'grid',
      layoutConfig: {
        layout: [
          {
            w: FULL_WIDTH,
            h: FULL_HEIGHT,
            x: 0,
            y: 0,
            i: fidgetId,
            minW: FULL_WIDTH,
            maxW: FULL_WIDTH,
            minH: 8,
            maxH: 36,
            moved: false,
            static: false,
            resizeHandles: [...RESIZE_HANDLES],
            isBounded: false,
          },
        ],
      },
    },
    theme: createTabTheme(idSuffix),
    fidgetInstanceDatums: {
      [fidgetId]: {
        config: {
          data: {}, // Directory fidget fetches data at runtime
          editable: false,
          settings,
        },
        fidgetType: 'Directory',
        id: fidgetId,
      },
    },
    fidgetTrayContents: [],
    isEditable: false,
    timestamp: new Date().toISOString(),
  };
};

// ============================================================================
// Main Export
// ============================================================================

/**
 * Creates an explore page config with Directory tabs for tokens and channels
 */
export function createExplorePageConfig({
  tokens = [],
  channel,
  defaultTokenNetwork = 'mainnet',
  channelNetwork = 'base',
}: ExplorePageOptions): NavPageConfig {
  const tabEntries: Array<{ key: string; config: TabConfig }> = [];
  const seenTabNames = new Set<string>();

  // Add token tabs
  tokens.forEach((token, index) => {
    if (!token?.address || !token.symbol) return;

    const tabName = sanitizeTabKey(token.symbol, `Token ${index + 1}`);
    if (seenTabNames.has(tabName)) return;

    seenTabNames.add(tabName);
    const idSuffix = slugify(tabName, `token-${index + 1}`);
    const settings = buildTokenDirectorySettings(token, defaultTokenNetwork);
    tabEntries.push({
      key: tabName,
      config: buildTabConfig(tabName, idSuffix, settings),
    });
  });

  // Add channel tab
  const normalizedChannel = channel?.trim().replace(/^\/+/, '');
  if (normalizedChannel) {
    const tabName = 'channel';
    const idSuffix = slugify(`channel-${normalizedChannel}`, `channel-${tabEntries.length + 1}`);
    const settings = buildChannelDirectorySettings(normalizedChannel, channelNetwork);
    tabEntries.push({
      key: tabName,
      config: buildTabConfig(tabName, idSuffix, settings),
    });
  }

  // Fallback if no tabs
  if (tabEntries.length === 0) {
    const fallbackName = 'Directory';
    const settings: DirectoryFidgetSettings = {
      ...BASE_DIRECTORY_SETTINGS,
      source: 'tokenHolders',
      network: defaultTokenNetwork,
      contractAddress: '',
      assetType: 'token',
      sortBy: 'tokenHoldings',
    };
    tabEntries.push({
      key: fallbackName,
      config: buildTabConfig(fallbackName, slugify(fallbackName, 'directory'), settings),
    });
  }

  const tabOrder = tabEntries.map((entry) => entry.key);
  const tabs = tabEntries.reduce<Record<string, TabConfig>>((acc, entry) => {
    acc[entry.key] = entry.config;
    return acc;
  }, {});

  return {
    defaultTab: tabOrder[0],
    tabOrder,
    tabs,
    layout: {
      defaultLayoutFidget: 'grid',
      gridSpacing: 0,
      theme: {
        background: DEFAULT_THEME.properties.background,
        fidgetBackground: DEFAULT_THEME.properties.fidgetBackground,
        font: DEFAULT_THEME.properties.font,
        fontColor: DEFAULT_THEME.properties.fontColor,
      },
    },
  };
}

