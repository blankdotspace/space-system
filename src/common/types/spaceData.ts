import { SpaceConfig } from '@/app/(spaces)/Space';
import { Address } from 'viem';
import { MasterToken } from '@/common/providers/TokenProvider';
import { ProposalData } from '@/app/(spaces)/p/[proposalId]/utils';

// Space type definitions - the single source of truth for space types
export const SPACE_TYPES = {
  PROFILE: 'profile',
  TOKEN: 'token',
  PROPOSAL: 'proposal',
  CHANNEL: 'channel',
  NAV_PAGE: 'navPage',
} as const;

// TypeScript type derived from the constants (for type checking)
export type SpaceTypeValue = typeof SPACE_TYPES[keyof typeof SPACE_TYPES];

// Base space interface with common properties
export interface SpacePageData {
  // Metadata
  spaceId: string | undefined;
  spaceName: string;
  spaceType: SpaceTypeValue;
  updatedAt: string;
  defaultTab: string;
  currentTab: string;
  spaceOwnerFid: number | undefined;
  
  // URL generation function for this space
  spacePageUrl: (tabName: string) => string;
  
  // Each space type implements its own logic for editability
  isEditable: (currentUserFid: number | undefined, wallets?: { address: Address }[]) => boolean;
  
  // Configuration - using Omit<SpaceConfig, "isEditable"> since isEditable is determined at runtime
  config: Omit<SpaceConfig, "isEditable">;
}

// Type-specific space interfaces
export interface ProfileSpacePageData extends SpacePageData {
  spaceType: typeof SPACE_TYPES.PROFILE;
  defaultTab: 'Profile';
  identityPublicKey?: string;
}

export interface TokenSpacePageData extends SpacePageData {
  spaceType: typeof SPACE_TYPES.TOKEN;
  defaultTab: string;
  contractAddress: string;
  network: string;
  spaceOwnerAddress: Address;
  tokenData?: MasterToken; // Optional to allow for loading states
  identityPublicKey?: string;
}

export interface ProposalSpacePageData extends SpacePageData {
  spaceType: typeof SPACE_TYPES.PROPOSAL;
  defaultTab: 'Overview';
  proposalId: string;
  spaceOwnerAddress: Address;
  proposalData?: ProposalData;
  identityPublicKey?: string;
}

export interface ChannelSpacePageData extends SpacePageData {
  spaceType: typeof SPACE_TYPES.CHANNEL;
  defaultTab: 'Channel';
  channelId: string;
  channelDisplayName?: string;
  channelDescription?: string;
  channelImageUrl?: string;
  channelFollowerCount?: number;
  moderatorFids: number[];
  identityPublicKey?: string;
}

export interface NavPageSpacePageData extends SpacePageData {
  spaceType: typeof SPACE_TYPES.NAV_PAGE;
  // navSlug is the URL path segment (e.g., 'home', 'explore')
  navSlug: string;
  // Admin identity public keys that can edit this space
  adminIdentityPublicKeys: string[];
}

// Union type for all spaces
export type Space =
  | ProfileSpacePageData
  | TokenSpacePageData
  | ProposalSpacePageData
  | ChannelSpacePageData
  | NavPageSpacePageData;

// Type guards (actual TypeScript type guards that narrow types)
export function isProfileSpace(space: SpacePageData): space is ProfileSpacePageData {
  return space.spaceType === SPACE_TYPES.PROFILE;
}

export function isTokenSpace(space: SpacePageData): space is TokenSpacePageData {
  return space.spaceType === SPACE_TYPES.TOKEN;
}

export function isProposalSpace(space: SpacePageData): space is ProposalSpacePageData {
  return space.spaceType === SPACE_TYPES.PROPOSAL;
}

export function isChannelSpace(space: SpacePageData): space is ChannelSpacePageData {
  return space.spaceType === SPACE_TYPES.CHANNEL;
}

export function isNavPageSpace(space: SpacePageData): space is NavPageSpacePageData {
  return space.spaceType === SPACE_TYPES.NAV_PAGE;
}
