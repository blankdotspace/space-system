// Export theme (used by shared/themes.ts)
export { nounsTheme } from './nouns.theme';

// Export the initial space creators (used at runtime)
export { default as createInitialProfileSpaceConfigForFid } from './initialSpaces/initialProfileSpace';
export { default as createInitialChannelSpaceConfig } from './initialSpaces/initialChannelSpace';
export { default as createInitialTokenSpaceConfigForAddress } from './initialSpaces/initialTokenSpace';
export { default as createInitalProposalSpaceConfigForProposalId } from './initialSpaces/initialProposalSpace';
export { default as INITIAL_HOMEBASE_CONFIG } from './initialSpaces/initialHomebase';
