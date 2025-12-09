import { redirect } from "next/navigation";
import { loadSystemConfig } from "@/config";
import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";

// Force dynamic rendering - config loading requires request context
export const dynamic = 'force-dynamic';

export default async function RootRedirect() {
  const config = await loadSystemConfig();
  
  // Find the home navigation item and redirect to its default tab
  const navItems = config.navigation?.items || [];
  const homeNavItem = navItems.find(item => item.href === '/home');
  
  if (homeNavItem?.spaceId) {
    try {
      // Tab order is stored directly (not wrapped in SignedFile)
      const { data: tabOrderData } = await createSupabaseServerClient()
        .storage
        .from('spaces')
        .download(`${homeNavItem.spaceId}/tabOrder`);
      
      if (tabOrderData) {
        const tabOrderJson = JSON.parse(await tabOrderData.text());
        const defaultTab = tabOrderJson.tabOrder?.[0];
        
        if (defaultTab) {
          redirect(`/home/${encodeURIComponent(defaultTab)}`);
          return null;
        }
      }
    } catch (error) {
      console.warn('Failed to load home space default tab:', error);
    }
  }
  
  // Fallback: redirect to /home and let the navigation handler figure out the default tab
  redirect('/home');
  return null;
}
