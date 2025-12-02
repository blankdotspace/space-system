import { SystemConfig } from '@/config';

/**
 * @deprecated This hook is deprecated. Use systemConfig prop instead.
 * 
 * In the new architecture, systemConfig is loaded server-side and passed as a prop
 * to client components. This hook cannot work because loadSystemConfig() is async
 * and server-only.
 * 
 * For client components, receive systemConfig as a prop from a parent Server Component.
 * 
 * Example:
 * ```tsx
 * // Server Component
 * export default async function MyServerComponent() {
 *   const systemConfig = await loadSystemConfig();
 *   return <MyClientComponent systemConfig={systemConfig} />;
 * }
 * 
 * // Client Component
 * "use client";
 * export function MyClientComponent({ systemConfig }: { systemConfig: SystemConfig }) {
 *   // Use systemConfig here
 * }
 * ```
 */
export const useSystemConfig = (systemConfig: SystemConfig): SystemConfig => {
  // Simply return the prop - this maintains backward compatibility
  // but enforces that systemConfig must be passed in
  return systemConfig;
};

// Export for direct usage (server-side only)
export { loadSystemConfig } from '@/config';
export type { SystemConfig };
