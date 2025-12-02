import React from "react";
import { notFound, redirect } from "next/navigation";
import { loadSystemConfig } from "@/config";
import NavPageClient from "./NavPageClient";
import { createClient } from '@supabase/supabase-js';
import { SignedFile } from "@/common/lib/signedFiles";
import type { NavPageConfig } from "@/config/systemConfig";

/**
 * Convert a Space stored in storage to a PageConfig
 * Returns null if Supabase credentials are not available or if the space can't be loaded
 */
async function loadSpaceAsPageConfig(spaceId: string): Promise<NavPageConfig | null> {
  // Check if Supabase credentials are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
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
    
    // Reconstruct NavPageConfig format
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
    } as NavPageConfig;
  } catch (error) {
    console.error(`Error loading space ${spaceId} as page config:`, error);
    return null;
  }
}

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';

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
  
  const config = await loadSystemConfig();
  
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
    
    // No spaceId and no page config found
    notFound();
  }
  
  // Tab name provided, render the page
  const activeTabName = decodeURIComponent(tabName[0]);
  
  // Nav item must have a spaceId to load page config
  if (!navItem.spaceId) {
    notFound();
  }
  
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

