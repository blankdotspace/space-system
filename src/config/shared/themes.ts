// Shared theme definitions used across all communities
// Themes are stored here instead of in individual community configs or the database

import { ThemeConfig } from '../systemConfig';
import { nounsTheme } from '../nouns/nouns.theme';

// Export themes - all communities use the same theme definitions
export const themes: ThemeConfig = nounsTheme;

// Also export as default for convenience
export default themes;

