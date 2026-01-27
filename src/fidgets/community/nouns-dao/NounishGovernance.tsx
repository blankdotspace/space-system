import { CardContent } from "@/common/components/atoms/card";
import { DaoSelector } from "@/common/components/molecules/DaoSelector";
import FontSelector from "@/common/components/molecules/FontSelector";
import ThemeColorSelector from "@/common/components/molecules/ThemeColorSelector";
import { FidgetArgs, FidgetModule, FidgetProperties, FidgetSettingsStyle } from "@/common/fidgets";
import useGraphqlQuery from "@/common/lib/hooks/useGraphqlQuery";
import {
  NOUNS_PROPOSALS_QUERY,
  NOUNSBUILD_PROPOSALS_QUERY,
} from "@/common/lib/utils/queries";
import { wagmiConfig } from "@/common/providers/Wagmi";
import { NOUNS_DAO } from "@/constants/basedDaos";
import BuilderProposalDetailView from "@/fidgets/community/nouns-dao/components/BuilderProposalDetailView";
import NounsProposalDetailView from "@/fidgets/community/nouns-dao/components/NounsProposalDetailView";
import ProposalListView from "@/fidgets/community/nouns-dao/components/ProposalListView";
import { defaultStyleFields, WithMargin } from "@/fidgets/helpers";
import React, { useEffect, useMemo, useState } from "react";
import { getBlock } from "wagmi/actions";

export type NounishGovernanceSettings = {
  subgraphUrl: string;
  daoContractAddress: string;
  selectedDao: {
    name: string;
    contract: string;
    graphUrl: string;
    icon: string;
  };
  scale: number;
  headingsFontFamily?: string;
  fontFamily?: string;
} & FidgetSettingsStyle;

export const nounishGovernanceConfig: FidgetProperties = {
  fidgetName: "Nounish Governance",
  mobileFidgetName: "Gov",
  mobileIcon: <span className="text-base">⌐◨-◨</span>,
  icon: 0x1f3db,
  fields: [
    {
      fieldName: "selectedDao",
      displayName: "Select DAO",
      displayNameHint: "Choose from available Nounish communities and BuilderDAOs",
      default: {
        name: "Nouns DAO",
        contract: "", // nouns dao does not need a contract address
        graphUrl: NOUNS_DAO,
      },
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <DaoSelector {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "fontFamily",
      displayName: "font Family",
      displayNameHint: "Select the font for the fidget text",
      default: "var(--user-theme-font)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <FontSelector {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "fontColor",
      displayName: "Font Color",
      displayNameHint: "Color used for the text input (body text)",
      default: "var(--user-theme-font-color)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ThemeColorSelector
            {...props}
            themeVariable="var(--user-theme-font-color)"
            defaultColor="#000000"
            colorType="font color"
          />
        </WithMargin>
      ),
      group: "style",
    },
    ...defaultStyleFields,
  ],
  size: {
    minHeight: 2,
    maxHeight: 36,
    minWidth: 2,
    maxWidth: 36,
  },
};

export const NounishGovernance: React.FC<
  FidgetArgs<NounishGovernanceSettings>
> = ({ settings }) => {
  const [proposalId, setProposalId] = useState<string | null>(null);
  const selectedDao = settings.selectedDao;

  const isBuilderSubgraph = useMemo(
    () => selectedDao?.graphUrl.includes("nouns-builder-base-mainnet") || false,
    [selectedDao?.graphUrl],
  );

  const daoContractAddress =
    selectedDao?.contract || settings.daoContractAddress;
  const graphUrl =
    selectedDao?.graphUrl || "https://www.nouns.camp/subgraphs/nouns";

  const {
    data: proposalsData,
    loading: listLoading,
    error: listError,
  } = useGraphqlQuery({
    url: graphUrl,
    query: isBuilderSubgraph
      ? NOUNSBUILD_PROPOSALS_QUERY
      : NOUNS_PROPOSALS_QUERY,
    variables: {
      where: isBuilderSubgraph ? { dao: daoContractAddress } : undefined,
    },
  });

  const [currentBlock, setCurrentBlock] = useState<{
    number: number;
    timestamp: number;
  }>({ number: 0, timestamp: 0 });

  useEffect(() => {
    const fetchBlockNumber = async () => {
      try {
        const block = await getBlock(wagmiConfig);
        setCurrentBlock({
          number: Number(block.number),
          timestamp: Number(block.timestamp) * 1000,
        });
      } catch (error) {
        console.error("Error fetching block number:", error);
      }
    };

    fetchBlockNumber();
  }, []);

  if (listError) {
    return <div>Error loading data</div>;
  }

  const handleGoBack = () => {
    setProposalId(null);
  };

  const handleSetProposal = (proposalId: string) => {
    setProposalId(proposalId);
  };

  const selectedProposal = isBuilderSubgraph
    ? proposalsData?.proposals.find(
      (proposal) => proposal.proposalId === proposalId,
    )
    : proposalsData?.proposals.find((proposal) => proposal.id === proposalId);

  const bodyFontFamily = settings.fontFamily || "var(--user-theme-font)";
  let bodyFontColor = settings.fontColor || "var(--user-theme-font-color)";
  if (!bodyFontColor || bodyFontColor === "var(--user-theme-font-color)") {
    bodyFontColor = "#000000";
  }

  return (
    <div
      className="size-full"
      style={{
        fontFamily: bodyFontFamily,
        color: bodyFontColor,
      }}
    >
      <CardContent className="size-full overflow-scroll p-4" >
        {proposalId && selectedProposal ? (
          isBuilderSubgraph ? (
            <BuilderProposalDetailView
              proposal={selectedProposal}
              goBack={handleGoBack}
              currentBlock={currentBlock}
              loading={listLoading}
              versions={[]}

            />
          ) : (
            <NounsProposalDetailView
              proposal={selectedProposal}
              versions={selectedProposal}
              goBack={handleGoBack}
              currentBlock={currentBlock}
              loading={listLoading}

            />
          )
        ) : (
          <ProposalListView
            proposals={proposalsData?.proposals || []}
            currentBlock={currentBlock}
            setProposal={handleSetProposal}
            loading={listLoading}
            isBuilderSubgraph={isBuilderSubgraph}
            title={selectedDao.name}
            daoIcon={selectedDao.icon || "/brands/nouns_yellow_logo.jpg"}

          />
        )}
      </CardContent>
    </div>
  );
};

export default {
  fidget: NounishGovernance,
  properties: nounishGovernanceConfig,
} as FidgetModule<FidgetArgs<NounishGovernanceSettings>>;
