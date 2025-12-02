/**
 * Resolve community ID from domain
 * 
 * The domain is used to infer the community ID.
 * Supports both production domains and localhost subdomains for local testing.
 * 
 * @param domain The domain/hostname
 * @returns The community ID inferred from domain, or null if cannot be determined
 */
export function resolveCommunityFromDomain(
  domain: string
): string | null {
  if (!domain) return null;
  
  // Support localhost subdomains for local testing
  // e.g., example.localhost:3000 -> example
  if (domain.includes('localhost')) {
    const parts = domain.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      // Has subdomain before localhost
      return parts[0];
    }
    // Just localhost - can't determine community
    return null;
  }
  
  // Production domain: extract subdomain or use domain as community ID
  // Example: subdomain.nounspace.com -> subdomain
  if (domain.includes('.')) {
    const parts = domain.split('.');
    if (parts.length > 2) {
      // Has subdomain (e.g., example.nounspace.com)
      return parts[0];
    }
    // Use domain name without TLD as community ID (e.g., example.com -> example)
    return parts[0];
  }
  
  // Single word domain - use as community ID
  return domain;
}


