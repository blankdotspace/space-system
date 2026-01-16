// Export individual config pieces (used by seed scripts and page configs)
export { nounsBrand } from './nouns.brand';
export { nounsAssets } from './nouns.assets';
export { nounsTheme } from './nouns.theme';
export { nounsCommunity } from './nouns.community';
export { nounsFidgets } from './nouns.fidgets';
export { nounsHomePage } from './nouns.home';
export { nounsExplorePage } from './nouns.explore';
export { nounsNavigation } from './nouns.navigation';
export { nounsUI } from './nouns.ui';

// Export the initial space creators (used at runtime)
export { default as createInitialProfileSpaceConfigForFid } from './initialSpaces/initialProfileSpace';
export { default as createInitialChannelSpaceConfig } from './initialSpaces/initialChannelSpace';
export { default as createInitialTokenSpaceConfigForAddress } from './initialSpaces/initialTokenSpace';
export { default as createInitalProposalSpaceConfigForProposalId } from './initialSpaces/initialProposalSpace';
export { default as INITIAL_HOMEBASE_CONFIG } from './initialSpaces/initialHomebase';
