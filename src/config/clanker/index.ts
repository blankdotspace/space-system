import { clankerBrand } from './clanker.brand';
import { clankerAssets } from './clanker.assets';
import { clankerTheme } from './clanker.theme';
import { clankerCommunity } from './clanker.community';
import { clankerFidgets } from './clanker.fidgets';
import { clankerHomePage } from './clanker.home';
import { clankerNavigation } from './clanker.navigation';
import { clankerExplorePage } from './clanker.explore';

export const clankerSystemConfig = {
  brand: clankerBrand,
  assets: clankerAssets,
  theme: clankerTheme,
  community: clankerCommunity,
  fidgets: clankerFidgets,
  homePage: clankerHomePage,
  explorePage: clankerExplorePage,
  navigation: clankerNavigation,
};

export { clankerBrand } from './clanker.brand';
export { clankerAssets } from './clanker.assets';
export { clankerTheme } from './clanker.theme';
export { clankerCommunity } from './clanker.community';
export { clankerFidgets } from './clanker.fidgets';
export { clankerHomePage } from './clanker.home';
export { clankerExplorePage } from './clanker.explore';

// Export the initial space creators from config
export { default as createInitialProfileSpaceConfigForFid } from './initialSpaces/initialProfileSpace';
export { default as createInitialChannelSpaceConfig } from './initialSpaces/initialChannelSpace';
export { default as createInitialTokenSpaceConfigForAddress } from './initialSpaces/initialTokenSpace';
export { default as createInitialProposalSpaceConfigForProposalId } from './initialSpaces/initialProposalSpace';
export { default as INITIAL_HOMEBASE_CONFIG } from './initialSpaces/initialHomebase';
