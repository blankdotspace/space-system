import { loadSystemConfig } from "@/config";
import { loadCommunityAdminProfiles } from "@/common/lib/utils/loadCommunityAdminProfiles";
import TermsContent from "./terms-content";

export default async function TermsPage() {
  const systemConfig = await loadSystemConfig();
  const adminProfiles = await loadCommunityAdminProfiles(
    systemConfig.adminIdentityPublicKeys ?? [],
  );

  return (
    <TermsContent communityId={systemConfig.communityId} adminProfiles={adminProfiles} />
  );
}
