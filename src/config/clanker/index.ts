// Export individual config pieces (used by seed scripts and page configs)
export { clankerBrand } from './clanker.brand';
export { clankerAssets } from './clanker.assets';
export { clankerTheme } from './clanker.theme';
export { clankerCommunity } from './clanker.community';
export { clankerFidgets } from './clanker.fidgets';
export { clankerHomePage } from './clanker.home';
export { clankerExplorePage } from './clanker.explore';
export { clankerNavigation } from './clanker.navigation';
export { clankerUI } from './clanker.ui';

// Export the initial space creators (used at runtime)
export { default as createInitialProfileSpaceConfigForFid } from './initialSpaces/initialProfileSpace';
export { default as createInitialChannelSpaceConfig } from './initialSpaces/initialChannelSpace';
export { default as createInitialTokenSpaceConfigForAddress } from './initialSpaces/initialTokenSpace';
export { default as createInitialProposalSpaceConfigForProposalId } from './initialSpaces/initialProposalSpace';
export { default as INITIAL_HOMEBASE_CONFIG, createInitialHomebaseConfig } from './initialSpaces/initialHomebase';
