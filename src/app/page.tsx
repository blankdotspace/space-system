import { notFound, redirect } from "next/navigation";
import { loadSystemConfig } from "@/config";

export const dynamic = 'force-dynamic';

export default async function RootRedirect() {
  try {
    const config = await loadSystemConfig();
    
    // Handle missing config
    if (!config) {
      console.error('System config not loaded');
      notFound();
    }
    
    // Find the first navigation item and redirect to it
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
  } catch (error) {
    console.error('Root redirect error:', error);
    // Graceful fallback
    redirect('/home');
  }
  
  return null;
}
