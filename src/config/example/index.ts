// Export individual config pieces (used by seed scripts and page configs)
export { exampleBrand } from './example.brand';
export { exampleAssets } from './example.assets';
export { exampleTheme } from './example.theme';
export { exampleCommunity } from './example.community';
export { exampleFidgets } from './example.fidgets';
export { exampleHomePage } from './example.home';
export { exampleExplorePage } from './example.explore';
export { exampleUI } from './example.ui';

// Export the initial space creators (used at runtime)
export { default as createInitialProfileSpaceConfigForFid } from './initialSpaces/profile';
export { default as createInitialChannelSpaceConfig } from './initialSpaces/channel';
export { default as createInitialTokenSpaceConfigForAddress } from './initialSpaces/token';
export { default as createInitalProposalSpaceConfigForProposalId } from './initialSpaces/proposal';
export { default as INITIAL_HOMEBASE_CONFIG } from './initialSpaces/homebase';
