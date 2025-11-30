// This file contains only the SystemConfig interface
// Individual configurations are imported from their respective folders

import { Address } from "viem";

export type CommunityTokenNetwork = "mainnet" | "base" | "polygon" | "eth";

export interface CommunityErc20Token {
  address: string;
  symbol: string;
  decimals: number;
  network?: CommunityTokenNetwork;
}

export interface CommunityNftToken {
  address: string;
  symbol: string;
  type: "erc721" | "erc1155" | string;
  network?: CommunityTokenNetwork;
}

export interface CommunityTokensConfig {
  erc20Tokens?: CommunityErc20Token[];
  nftTokens?: CommunityNftToken[];
}

export interface SystemConfig {
  brand: BrandConfig;
  assets: AssetConfig;
  theme: ThemeConfig;
  community: CommunityConfig;
  fidgets: FidgetConfig;
  homePage: HomePageConfig | null; // Nullable for navigation-space approach
  explorePage: ExplorePageConfig | null; // Nullable for navigation-space approach
  navigation?: NavigationConfig;
  ui?: UIConfig;
  pages?: {
    [key: string]: HomePageConfig | ExplorePageConfig;
  }; // For database config structure
}

export interface UIConfig {
  primaryColor: string;
  primaryHoverColor: string;
  primaryActiveColor: string;
  castButton: {
    backgroundColor: string;
    hoverColor: string;
    activeColor: string;
  };
}

export interface BrandConfig {
  name: string;
  displayName: string;
  tagline: string;
  description: string;
  miniAppTags: string[];
}

export interface AssetConfig {
  logos: {
    main: string;
    icon: string;
    favicon: string;
    appleTouch: string;
    og: string;
    splash: string;
  };
}

export interface ThemeConfig {
  default: ThemeProperties;
  nounish: ThemeProperties;
  gradientAndWave: ThemeProperties;
  colorBlobs: ThemeProperties;
  floatingShapes: ThemeProperties;
  imageParallax: ThemeProperties;
  shootingStar: ThemeProperties;
  squareGrid: ThemeProperties;
  tesseractPattern: ThemeProperties;
  retro: ThemeProperties;
}

export interface ThemeProperties {
  id: string;
  name: string;
  properties: {
    font: string;
    fontColor: string;
    headingsFont: string;
    headingsFontColor: string;
    background: string;
    backgroundHTML: string;
    musicURL: string;
    fidgetBackground: string;
    fidgetBorderWidth: string;
    fidgetBorderColor: string;
    fidgetShadow: string;
    fidgetBorderRadius: string;
    gridSpacing: string;
  };
}


export type CommunityContractsConfig = {
  nouns: Address;
  auctionHouse: Address;
  space: Address;
  nogs: Address;
} & Record<string, Address>;

export interface CommunityConfig {
  type: string;
  urls: {
    website: string;
    discord: string;
    twitter: string;
    github: string;
    forum: string;
  };
  social: {
    farcaster: string;
    discord: string;
    twitter: string;
  };
  governance: {
    proposals: string;
    delegates: string;
    treasury: string;
  };
  tokens: CommunityTokensConfig;
  contracts: CommunityContractsConfig;
}

export interface FidgetConfig {
  enabled: string[];
  disabled: string[];
}

export interface HomePageConfig {
  defaultTab: string;
  tabOrder: string[];
  tabs: {
    [key: string]: TabConfig;
  };
  layout: {
    defaultLayoutFidget: string;
    gridSpacing: number;
    theme: {
      background: string;
      fidgetBackground: string;
      font: string;
      fontColor: string;
    };
  };
}

export type ExplorePageConfig = HomePageConfig;

export interface NavigationConfig {
  items: NavigationItem[];
  logoTooltip?: LogoTooltipConfig;
  showMusicPlayer?: boolean;
  showSocials?: boolean;
}

export interface LogoTooltipConfig {
  text: string;
  href?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: 'home' | 'explore' | 'notifications' | 'search' | 'space' | 'robot' | 'custom';
  openInNewTab?: boolean;
  requiresAuth?: boolean;
  spaceId?: string; // Optional reference to Space for page content (navPage type)
}

export interface TabConfig {
  name: string;
  displayName: string;
  layoutID: string;
  layoutDetails: LayoutFidgetDetails;
  theme: ThemeProperties;
  fidgetInstanceDatums: Record<string, FidgetInstanceData>;
  fidgetTrayContents: any[];
  isEditable: boolean;
  timestamp: string;
}

export interface LayoutFidgetDetails {
  layoutConfig: {
    layout: GridItem[];
  };
  layoutFidget: string;
}

export interface FidgetInstanceData {
  config: {
    data: any;
    editable: boolean;
    settings: Record<string, any>;
  };
  fidgetType: string;
  id: string;
}

export interface GridItem {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  moved?: boolean;
  static?: boolean;
  resizeHandles?: string[];
  isBounded?: boolean;
}


// SystemConfig interface is exported from this file
// Individual configurations are defined in their respective folders
