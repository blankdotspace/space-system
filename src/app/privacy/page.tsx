import React from "react";
import { loadSystemConfig } from "@/config";
import { loadCommunityAdminProfiles } from "@/common/lib/utils/loadCommunityAdminProfiles";
import PrivacyContent from "./privacy-content";

export default async function PrivacyPage() {
  const systemConfig = await loadSystemConfig();
  const adminProfiles = await loadCommunityAdminProfiles(
    systemConfig.adminIdentityPublicKeys ?? [],
  );

  return (
    <PrivacyContent communityId={systemConfig.communityId} adminProfiles={adminProfiles} />
  );
}
