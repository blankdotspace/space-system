/**
 * Seed data exports for database seeding scripts
 * 
 * This file re-exports only the config pieces needed for seeding.
 * This keeps seed scripts separate from runtime configs.
 */

// Re-export page configs needed for navPage space seeding
export { nounsHomePage } from '../src/config/nouns/nouns.home';
export { nounsExplorePage } from '../src/config/nouns/nouns.explore';
export { clankerHomePage } from '../src/config/clanker/clanker.home';

