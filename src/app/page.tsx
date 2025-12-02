import { redirect } from "next/navigation";
import { loadSystemConfig } from "@/config";

// Force dynamic rendering - config loading requires request context
export const dynamic = 'force-dynamic';

// Force dynamic rendering - config loading requires request context
export const dynamic = 'force-dynamic';

export default async function RootRedirect() {
  const config = await loadSystemConfig();
  
  // Find the first navigation item and redirect to it
  // The space loading will automatically figure out the default tab
  const navItems = config.navigation?.items || [];
  const firstNavItem = navItems[0];
  
  if (firstNavItem?.href) {
    // Remove leading slash if present and redirect
    const href = firstNavItem.href.startsWith('/') 
      ? firstNavItem.href 
      : `/${firstNavItem.href}`;
    redirect(href);
  }
  
  // Fallback: redirect to /home if no navigation items found
  redirect('/home');
  return null;
}

