/**
 * Configuration loader system
 * 
 * This module provides an interface for loading community configurations
 * from the database at runtime.
 * 
 * Usage:
 * ```typescript
 * import { loadSystemConfig } from '@/config';
 * const config = await loadSystemConfig();
 * ```
 * 
 * All communities use runtime loading from Supabase.
 */

export * from './types';
export * from './registry';
export * from './runtimeLoader';
export * from './factory';

