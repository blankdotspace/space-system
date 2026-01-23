import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import neynar from "@/common/data/api/neynar";

export type CommunityAdminProfile = {
  identityPublicKey: string;
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
};

const normalizeAdminProfiles = (
  adminIdentityPublicKeys: string[],
  fidMap: Map<string, number>,
  userMap: Map<number, { username?: string; display_name?: string; pfp_url?: string }>,
): CommunityAdminProfile[] =>
  adminIdentityPublicKeys.map((identityPublicKey) => {
    const fid = fidMap.get(identityPublicKey);
    const user = fid ? userMap.get(fid) : undefined;

    return {
      identityPublicKey,
      fid,
      username: user?.username,
      displayName: user?.display_name,
      pfpUrl: user?.pfp_url,
    };
  });

export async function loadCommunityAdminProfiles(
  adminIdentityPublicKeys: string[],
): Promise<CommunityAdminProfile[]> {
  if (adminIdentityPublicKeys.length === 0) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fidRegistrations")
    .select("fid, identityPublicKey")
    .in("identityPublicKey", adminIdentityPublicKeys);

  if (error || !data) {
    if (error) {
      console.error("Error loading community admin fids:", error);
    }
    return adminIdentityPublicKeys.map((identityPublicKey) => ({ identityPublicKey }));
  }

  const fidMap = new Map<string, number>();
  const fids: number[] = [];
  data.forEach((row) => {
    if (!row?.identityPublicKey || typeof row.fid !== "number") return;
    fidMap.set(row.identityPublicKey, row.fid);
    fids.push(row.fid);
  });

  if (fids.length === 0) {
    return adminIdentityPublicKeys.map((identityPublicKey) => ({ identityPublicKey }));
  }

  try {
    const response = await neynar.fetchBulkUsers({ fids });
    const userMap = new Map(
      response.users.map((user) => [
        user.fid,
        {
          username: user.username,
          display_name: user.display_name,
          pfp_url: user.pfp_url,
        },
      ]),
    );

    return normalizeAdminProfiles(adminIdentityPublicKeys, fidMap, userMap);
  } catch (error) {
    console.error("Error loading community admin profiles from Neynar:", error);
    return adminIdentityPublicKeys.map((identityPublicKey) => ({
      identityPublicKey,
      fid: fidMap.get(identityPublicKey),
    }));
  }
}
