import React from "react";
import SpaceNotFound from "@/app/(spaces)/SpaceNotFound";
import ChannelSpace from "./ChannelSpace";
import { loadChannelSpaceData } from "./utils";
import { redirect } from "next/navigation";

interface ChannelSpacePageProps {
  params: Promise<{
    channelId: string;
    tabName?: string;
  }>;
}

const ChannelSpacePage = async ({ params }: ChannelSpacePageProps) => {
  const { channelId, tabName: tabNameParam } = await params;

  if (!channelId) {
    return <SpaceNotFound />;
  }

  const decodedTabName = tabNameParam ? decodeURIComponent(tabNameParam) : undefined;

  const channelSpaceData = await loadChannelSpaceData(channelId, decodedTabName);

  if (!channelSpaceData) {
    return <SpaceNotFound />;
  }

  // Handle redirect outside of try/catch to avoid catching redirect errors
  // This will throw NEXT_REDIRECT error which Next.js handles
  if (!decodedTabName) {
    redirect(
      `/c/${channelId}/${encodeURIComponent(channelSpaceData.defaultTab)}`
    );
  }

  return (
    <ChannelSpace
      spacePageData={channelSpaceData}
      tabName={decodedTabName || channelSpaceData.defaultTab}
    />
  );
};

export default ChannelSpacePage;
