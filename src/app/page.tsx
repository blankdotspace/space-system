import { redirect } from "next/navigation";
import { loadSystemConfig } from "@/config";
import type { SignedFile } from "@/common/lib/signedFiles";

// Force dynamic rendering - config loading requires request context
export const dynamic = 'force-dynamic';

export default async function RootRedirect() {
  const config = await loadSystemConfig();
  
  // Find the home navigation item and redirect to its default tab
  const navItems = config.navigation?.items || [];
  const homeNavItem = navItems.find(item => item.href === '/home');
  
  if (homeNavItem?.spaceId) {
    // Load default tab from space storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data: tabOrderData } = await supabase.storage
          .from('spaces')
          .download(`${homeNavItem.spaceId}/tabOrder`);
        
        if (tabOrderData) {
          const tabOrderFile = JSON.parse(await tabOrderData.text()) as SignedFile;
          const tabOrderObj = JSON.parse(tabOrderFile.fileData) as { tabOrder: string[] };
          const defaultTab = tabOrderObj.tabOrder?.[0];
          
          if (defaultTab) {
            redirect(`/home/${encodeURIComponent(defaultTab)}`);
            return null;
          }
        }
      } catch (error) {
        console.warn('Failed to load home space default tab:', error);
      }
    }
  }
  
  // Fallback: redirect to /home and let the navigation handler figure out the default tab
  redirect('/home');
  return null;
}


