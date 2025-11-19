import { createSupabaseServerClient } from "@/common/data/database/supabase/clients/server";
import { UserMetadata } from "@/common/lib/utils/userMetadata";
import neynar from "@/common/data/api/neynar";
import { unstable_noStore as noStore } from "next/cache";
import { ProfileSpacePageData, SPACE_TYPES } from "@/common/types/spaceData";
import { createInitialProfileSpaceConfigForFid } from "@/config";

export type Tab = {
  spaceId: string;
  spaceName: string;
};

export const getUserMetadata = async (
  handle: string,
): Promise<UserMetadata | null> => {
  const normalizedHandle = handle?.trim().toLowerCase();

  if (!normalizedHandle) {
    return null;
  }

  try {
    // Check if response is valid before destructuring
    const response = await neynar.lookupUserByUsername({ username: normalizedHandle });
    
    // Validate response has expected structure
    if (!response || typeof response !== 'object' || !('user' in response)) {
      console.error('Invalid response from Neynar API:', response);
      return null;
    }
    
    const { user } = response;
    
    // Extract primary wallet address from user's verified addresses
    let walletAddress: string | undefined = undefined;
    if (user.verified_addresses?.primary?.eth_address) {
      walletAddress = user.verified_addresses.primary.eth_address;
    } else if (user.verified_addresses?.eth_addresses && user.verified_addresses.eth_addresses.length > 0) {
      walletAddress = user.verified_addresses.eth_addresses[0];
    } else if (user.verifications && user.verifications.length > 0) {
      walletAddress = user.verifications[0];
    }
    
    return {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      bio: user.profile?.bio?.text || "",
      walletAddress,
    };
  } catch (e) {
    console.error('Error fetching user metadata:', e);
    return null;
  }
};

export const getTabList = async (fid: number): Promise<Tab[]> => {

  try {
    // Add timestamp to bust cache
    const { data: registrations, error: regError } = await createSupabaseServerClient()
      .from("spaceRegistrations")
      .select('spaceId, spaceName, fid')
      .eq('fid', fid)
      .limit(1)
    
    if (regError) {
      console.error("Error fetching space registration:", regError);
      return [];
    }
    
    if (!registrations || registrations.length === 0) {
      return [];
    }

    // Get the first registration (there should only be one per fid)
    const registration = registrations[0];

    try {
      // Get the tab order file directly from storage
      const { data: tabOrderData, error: storageError } = await createSupabaseServerClient()
        .storage
        .from("spaces")
        .download(`${registration.spaceId}/tabOrder`);

      if (storageError || !tabOrderData) {
        console.warn(`No tab order found for space ${registration.spaceId}:`, storageError);
        return [registration];
      }

      // Convert the blob to text and parse as JSON
      const tabOrderText = await tabOrderData.text();
      const tabOrderJson = JSON.parse(tabOrderText);
      
      const enhancedTab = {
        ...registration,
        order: tabOrderJson.tabOrder || [],
        updatedAt: tabOrderJson.timestamp || new Date().toISOString(),
      };

      return [enhancedTab];
    } catch (e) {
      console.warn(`Error fetching tab order for space ${registration.spaceId}:`, e);
      return [registration];
    }
  } catch (e) {
    console.error("Exception in getTabList:", e);
    return [];
  }
};

// Profile space specific creator
export const createProfileSpaceData = (
  spaceId: string | undefined,
  spaceName: string,
  fid: number,
  tabName: string,
  identityPublicKey?: string,
  walletAddress?: string
): Omit<ProfileSpacePageData, 'isEditable' | 'spacePageUrl'> => {
  const config = {
    ...createInitialProfileSpaceConfigForFid(fid, spaceName, walletAddress),
    timestamp: new Date().toISOString(),
  };

  return {
    // Base SpaceData properties
    spaceId: spaceId,
    spaceName,
    spaceType: SPACE_TYPES.PROFILE,
    updatedAt: new Date().toISOString(),
    defaultTab: "Profile",
    currentTab: tabName,
    config,
    spaceOwnerFid: fid,
    identityPublicKey,
  };
};

export async function loadProfileSpaceRegistration(fid: number): Promise<{
  spaceId?: string;
  identityPublicKey?: string;
} | null> {
  noStore();
  try {
    const { data, error } = await createSupabaseServerClient()
      .from("spaceRegistrations")
      .select("spaceId, identityPublicKey")
      .eq("fid", fid)
      .order("timestamp", { ascending: true })
      .limit(1);
    if (error) {
      console.error("Error fetching profile space registration:", error);
      return null;
    }
    return data && data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error("Exception in loadProfileSpaceRegistration:", e);
    return null;
  }
}

export const loadUserSpaceData = async (
  handle: string,
  tabNameParam?: string
): Promise<Omit<ProfileSpacePageData, 'isEditable' | 'spacePageUrl'> | null> => {
  noStore(); 

  const userMetadata = await getUserMetadata(handle);
  const spaceOwnerFid = userMetadata?.fid || undefined;
  const spaceOwnerUsername = userMetadata?.username || undefined;
  const walletAddress = userMetadata?.walletAddress || undefined;

  if (!spaceOwnerFid) {
    return null;
  }

  // Check if space already exists in database and get registration data
  const registrationData = await loadProfileSpaceRegistration(spaceOwnerFid);
  const spaceId = registrationData?.spaceId;
  const identityPublicKey = registrationData?.identityPublicKey;

  const tabName = tabNameParam || spaceOwnerUsername || "Profile";

  return createProfileSpaceData(
    spaceId, // This can be undefined if space doesn't exist yet
    spaceOwnerUsername || "Profile",
    spaceOwnerFid,
    tabName,
    identityPublicKey,
    walletAddress
  );
};
