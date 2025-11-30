import React from "react";
import { notFound } from "next/navigation";
import NavPageSpace from "./NavPageSpace";
import { loadNavPageSpaceData } from "./utils";

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';

export default async function NavPage({
  params,
}: {
  params: Promise<{ navSlug: string; tabName?: string[] }>;
}) {
  const { navSlug, tabName } = await params;

  // Early rejection for known non-nav routes
  const reservedRoutes = ['api', 'notifications', 'privacy', 'terms', 'pwa', 'manifest', '.well-known'];
  if (reservedRoutes.includes(navSlug)) {
    notFound();
  }

  // Decode tab name if provided
  let decodedTabName: string | undefined;
  if (tabName && tabName.length > 0) {
    decodedTabName = decodeURIComponent(tabName[0]);
  }

  const spaceData = await loadNavPageSpaceData(navSlug, decodedTabName);

  // Load systemConfig to pass admin keys even if spaceData is null
  // (needed for client-side fallback to local stores)
  const { loadSystemConfig } = await import("@/config");
  const config = await loadSystemConfig();

  // If not found on server, pass null to let client check local stores
  // The client component will construct space data from local stores if found
  return (
    <NavPageSpace
      spacePageData={spaceData}
      tabName={decodedTabName}
      navSlug={navSlug}
      adminIdentityPublicKeys={config.adminIdentityPublicKeys || []}
    />
  );
}
