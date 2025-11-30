import React from "react";
import { notFound, redirect } from "next/navigation";
import { loadSystemConfig } from "@/config";
import NavPageClient from "./NavPageClient";
import { createClient } from '@supabase/supabase-js';
import { SignedFile } from "@/common/lib/signedFiles";
import type { HomePageConfig, ExplorePageConfig } from "@/config/systemConfig";

type PageConfig = HomePageConfig | ExplorePageConfig;

/**
 * Convert a Space stored in storage to a PageConfig
 * Returns null if Supabase credentials are not available or if the space can't be loaded
 */
async function loadSpaceAsPageConfig(spaceId: string): Promise<PageConfig | null> {
  // Check if Supabase credentials are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    // Skip during build if credentials aren't available - will render at runtime
    return null;
  }
  
  // Double-check that both are strings (not undefined/null)
  if (typeof supabaseUrl !== 'string' || typeof supabaseKey !== 'string') {
    return null;
  }
  
  try {
    // Create Supabase client with checked credentials
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch tab order
    const { data: tabOrderData, error: tabOrderError } = await supabase.storage
      .from('spaces')
      .download(`${spaceId}/tabOrder`);
    
    if (tabOrderError || !tabOrderData) {
      console.warn(`Failed to load tabOrder for space ${spaceId}:`, tabOrderError);
      return null;
    }
    
    const tabOrderFile = JSON.parse(await tabOrderData.text()) as SignedFile;
    const tabOrderObj = JSON.parse(tabOrderFile.fileData) as { tabOrder: string[] };
    const tabOrder = tabOrderObj.tabOrder || [];
    
    // Fetch each tab config
    const tabs: Record<string, any> = {};
    for (const tabName of tabOrder) {
      try {
        const { data: tabData, error: tabError } = await supabase.storage
          .from('spaces')
          .download(`${spaceId}/tabs/${tabName}`);
        
        if (tabError || !tabData) {
          console.warn(`Failed to load tab ${tabName} for space ${spaceId}:`, tabError);
          continue;
        }
        
        const tabFile = JSON.parse(await tabData.text()) as SignedFile;
        const tabConfig = JSON.parse(tabFile.fileData);
        tabs[tabName] = tabConfig;
      } catch (error) {
        console.warn(`Error parsing tab ${tabName} for space ${spaceId}:`, error);
      }
    }
    
    if (Object.keys(tabs).length === 0) {
      return null;
    }
    
    // Reconstruct PageConfig format
    return {
      defaultTab: tabOrder[0] || 'Home',
      tabOrder,
      tabs,
      layout: {
        defaultLayoutFidget: 'grid',
        gridSpacing: 16,
        theme: {
          background: '#ffffff',
          fidgetBackground: '#ffffff',
          font: 'Inter',
          fontColor: '#000000',
        },
      },
    } as PageConfig;
  } catch (error) {
    console.error(`Error loading space ${spaceId} as page config:`, error);
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const config = loadSystemConfig();
    const navItems = config.navigation?.items || [];
    const params: Array<{ navSlug: string; tabName?: string[] }> = [];
    
    // Check if Supabase credentials are available for space loading
    const hasSupabaseCredentials = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    );
    
    // For each navigation item, generate params for all its tabs
    // Note: We don't generate params for base path (no tabName) - it will redirect at runtime
    // Note: If Supabase credentials aren't available, we skip spaces and only generate for legacy configs
    for (const item of navItems) {
      if (!item.href?.startsWith('/')) continue;
      
      const navSlug = item.href.slice(1); // Remove leading '/'
      
      // If nav item has a spaceId and we have credentials, try to load from storage
      if (item.spaceId && hasSupabaseCredentials) {
        try {
          const pageConfig = await loadSpaceAsPageConfig(item.spaceId);
          if (pageConfig) {
            // Generate params for each tab
            for (const tabName of pageConfig.tabOrder) {
              params.push({ navSlug, tabName: [tabName] });
            }
          }
          // If loadSpaceAsPageConfig returns null (error loading), skip static generation
          // The page will render at runtime instead
        } catch (error) {
          // Skip this space if there's an error - will render at runtime
          console.warn(`Skipping static generation for ${navSlug} (space ${item.spaceId}):`, error);
        }
      } else if (!item.spaceId) {
        // Fallback: check legacy configs for tabs (when no spaceId)
        if (navSlug === 'home' && config.homePage) {
          for (const tabName of config.homePage.tabOrder) {
            params.push({ navSlug, tabName: [tabName] });
          }
        } else if (navSlug === 'explore' && config.explorePage) {
          for (const tabName of config.explorePage.tabOrder) {
            params.push({ navSlug, tabName: [tabName] });
          }
        }
      }
      // If item has spaceId but no credentials, skip static generation - will render at runtime
    }
    
    return params;
  } catch (error) {
    // If anything fails in generateStaticParams, return empty array
    // Pages will render at runtime instead
    console.warn('Error in generateStaticParams, skipping static generation:', error);
    return [];
  }
}

export default async function NavPage({
  params,
}: {
  params: Promise<{ navSlug: string; tabName?: string[] }>;
}) {
  const { navSlug, tabName } = await params;
  
  // Early rejection for known non-nav routes (Next.js will match more specific routes first,
  // but this adds an extra safety check)
  const reservedRoutes = ['api', 'notifications', 'privacy', 'terms', 'pwa', 'manifest', '.well-known'];
  if (reservedRoutes.includes(navSlug)) {
    notFound();
  }
  
  const config = loadSystemConfig();
  
  // Find navigation item by href
  const navItems = config.navigation?.items || [];
  const navItem = navItems.find(item => item.href === `/${navSlug}`);
  
  if (!navItem) {
    notFound();
  }
  
  // If no tab name provided, redirect to default tab
  if (!tabName || tabName.length === 0) {
    let defaultTab: string;
    
    // If nav item has a spaceId, load default tab from storage
    if (navItem.spaceId) {
      const pageConfig = await loadSpaceAsPageConfig(navItem.spaceId);
      if (pageConfig) {
        defaultTab = encodeURIComponent(pageConfig.defaultTab);
        redirect(`/${navSlug}/${defaultTab}`);
        return null;
      }
    }
    
    // Fallback: check legacy configs
    if (navSlug === 'home' && config.homePage) {
      defaultTab = encodeURIComponent(config.homePage.defaultTab);
      redirect(`/${navSlug}/${defaultTab}`);
      return null;
    }
    
    if (navSlug === 'explore' && config.explorePage) {
      defaultTab = encodeURIComponent(config.explorePage.defaultTab);
      redirect(`/${navSlug}/${defaultTab}`);
      return null;
    }
    
    notFound();
  }
  
  // Tab name provided, render the page
  const activeTabName = decodeURIComponent(tabName[0]);
  
  // If nav item has a spaceId, load from storage
  if (navItem.spaceId) {
    const pageConfig = await loadSpaceAsPageConfig(navItem.spaceId);
    if (!pageConfig) {
      notFound();
    }
    
    // Validate tab exists
    if (!pageConfig.tabs[activeTabName]) {
      notFound();
    }
    
    return (
      <NavPageClient
        pageConfig={pageConfig}
        activeTabName={activeTabName}
        navSlug={navSlug}
      />
    );
  }
  
  // Fallback: check if it's a legacy homePage/explorePage
  // (for backward compatibility during transition)
  if (navSlug === 'home' && config.homePage) {
    if (!config.homePage.tabs[activeTabName]) {
      notFound();
    }
    
    return (
      <NavPageClient
        pageConfig={config.homePage}
        activeTabName={activeTabName}
        navSlug={navSlug}
      />
    );
  }
  
  if (navSlug === 'explore' && config.explorePage) {
    if (!config.explorePage.tabs[activeTabName]) {
      notFound();
    }
    
    return (
      <NavPageClient
        pageConfig={config.explorePage}
        activeTabName={activeTabName}
        navSlug={navSlug}
      />
    );
  }
  
  notFound();
}

