/**
 * Approved Mini Apps
 * 
 * Mini-apps in this list have been verified to work well within Blankspace.
 * Apps not in this list will show a warning to users.
 * 
 * To add a new approved app, add its domain (e.g., "app.example.com")
 */

export const APPROVED_MINI_APP_DOMAINS: Set<string> = new Set([
  // Add approved mini-app domains here
  // Example: "frames.neynar.com",
  // Example: "warpcast.com",
]);

/**
 * Check if a mini-app domain is approved
 */
export function isMiniAppApproved(domain: string | undefined): boolean {
  if (!domain) return false;
  
  // Normalize domain (remove protocol, www, trailing slashes)
  const normalizedDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase();
  
  return APPROVED_MINI_APP_DOMAINS.has(normalizedDomain);
}

