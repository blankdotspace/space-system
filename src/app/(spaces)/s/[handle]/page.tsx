import React from "react";
import { loadUserSpaceData } from "./utils";
import SpaceNotFound from "@/app/(spaces)/SpaceNotFound";
import ProfileSpace from "./ProfileSpace";
import { redirect } from "next/navigation";
// ProfileSpaceData imported but not used
// import { ProfileSpaceData } from "@/common/types/spaceData";

interface ProfileSpacePageProps {
  params: Promise<{
    handle: string;
    tabName?: string;
  }>;
}

const ProfileSpacePage = async ({ params }: ProfileSpacePageProps) => {
  const { handle, tabName: tabNameParam } = await params;

  if (!handle) {
    return <SpaceNotFound />;
  }

  let decodedTabNameParam = tabNameParam;
  if (tabNameParam) {
    decodedTabNameParam = decodeURIComponent(tabNameParam);
  }

  let profileSpacePageData;
  try {
    profileSpacePageData = await loadUserSpaceData(handle, decodedTabNameParam);
  } catch (err) {
    console.error("Error loading profile space data:", err);
    return <SpaceNotFound />;
  }

  if (!profileSpacePageData) {
    return <SpaceNotFound />;
  }

  // Handle redirect outside of try/catch to avoid catching redirect errors
  // This will throw NEXT_REDIRECT error which Next.js handles
  if (!decodedTabNameParam) {
    redirect(
      `/s/${handle}/${encodeURIComponent(profileSpacePageData.defaultTab)}`
    );
  }

  return (
    <ProfileSpace
      spacePageData={profileSpacePageData}
      tabName={decodedTabNameParam || profileSpacePageData.defaultTab}
    />
  );
};

export default ProfileSpacePage;
