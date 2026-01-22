import React from "react";
import { loadProposalSpaceData } from "./utils";
import SpaceNotFound from "@/app/(spaces)/SpaceNotFound";
import ProposalSpace from "./ProposalSpace";
import { ProposalProvider } from "@/common/providers/ProposalProvider";
import { redirect } from "next/navigation";

const ProposalSpacePage = async ({
  params,
}: {
  params: Promise<{ proposalId: string; tabname?: string }>
}) => {
  const { proposalId, tabname: tabNameParam } = await params;

  if (!proposalId) {
    return <SpaceNotFound />;
  }

  let decodedTabNameParam = tabNameParam;
  if (tabNameParam) {
    decodedTabNameParam = decodeURIComponent(tabNameParam);
  }

  const proposalSpaceData = await loadProposalSpaceData(proposalId, decodedTabNameParam);

  if (!proposalSpaceData) {
    return <SpaceNotFound />;
  }

  if (!decodedTabNameParam) {
    redirect(
      `/p/${proposalId}/${encodeURIComponent(proposalSpaceData.defaultTab)}`
    );
  }

  return (
    <ProposalProvider
      proposalId={proposalId}
      defaultProposalData={proposalSpaceData.proposalData}
    >
      <ProposalSpace
        spaceData={proposalSpaceData}
        tabName={decodedTabNameParam || proposalSpaceData.defaultTab}
      />
    </ProposalProvider>
  );
};

export default ProposalSpacePage;
