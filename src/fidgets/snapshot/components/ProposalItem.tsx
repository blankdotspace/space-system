import React, { memo, useState, useCallback, useMemo, useReducer } from "react";
import { useProposalStatus } from "../hooks/useProposalStatus";
import { useSpaceQuorum } from "../hooks/useSpaceQuorum";
import { useToastStore } from "@/common/data/stores/toastStore";
import Badge from "./Badge";
import CardButton from "./CardButton";
import VotingResults from "./VotingResults";
import ProposalPreview from "./ProposalPreview";
import {
  renderApprovalVotingUI,
  renderRankedChoiceVotingUI,
  renderSingleChoiceVotingUI,
  renderWeightedVotingUI,
} from "../utils/renderVotingUI";
import { Action, initialState, reducer, State } from "../utils/stateManagement";
import voteOnProposal, { ProposalType } from "../utils/voteOnProposal";

import { resolveIpfsUrl } from "@/common/lib/utils/url";

interface Proposal {
  id: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  state: string;
  type: string;
  scores: number[];
  scores_total?: number;
  space: {
    id: string;
  };
}

interface ProposalItemProps {
  proposal: Proposal;
  space: string;
  headingsFont: string;
  headingsColor: string;
  bodyFont: string;
  bodyColor: string;
}

const ProposalItem: React.FC<ProposalItemProps> = memo(
  ({ proposal, space, headingsFont, headingsColor, bodyFont, bodyColor }) => {
    const [visibleSection, setVisibleSection] = useState<string | undefined>();

    const [state, dispatch] = useReducer<React.Reducer<State, Action>>(
      reducer,
      initialState
    );

    // Get space quorum settings
    const spaceQuorum = useSpaceQuorum(space);

    // Get proposal status with quorum consideration
    const status = useProposalStatus({ proposal, spaceQuorum });

    // Memoize avatar URL extraction
    const avatarUrl = useMemo(() => {
      const extractImageUrl = (markdown: string): string | null => {
        const imageRegex = /!\[.*?\]\((.*?)\)/;
        const match = imageRegex.exec(markdown);
        return match ? match[1] : null;
      };

      return (
        resolveIpfsUrl(extractImageUrl(proposal.body) ||
        `https://cdn.stamp.fyi/space/${proposal.space.id.toString()}?s=96&cb=80b2fc0910dab4fa`)
      );
    }, [proposal.body, proposal.space.id]);

    const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>(avatarUrl);

    const handleError = useCallback(() => {
      setCurrentAvatarUrl("/images/noggles.svg");
    }, []);

    const handleVote = useCallback(
      async (
        choiceId: number | number[] | { [key: string]: number },
        reason: string
      ) => {
        const now = Date.now() / 1000;
        if (now < proposal.start || now > proposal.end) {
          useToastStore
            .getState()
            .showToast("Voting is not open for this proposal.", 5000);
          return;
        }

        try {
          await voteOnProposal(
            proposal.id,
            choiceId,
            reason,
            space,
            proposal.type as ProposalType
          );
          useToastStore
            .getState()
            .showToast("Vote submitted successfully!", 5000);
        } catch (error) {
          console.error("Error submitting vote:", error);

          // More specific error messages based on error type
          let errorMessage =
            "An error occurred while submitting your vote. Please try again.";

          if (error instanceof Error) {
            if (
              error.message.includes("User denied") ||
              error.message.includes("user rejected")
            ) {
              errorMessage = "Transaction was cancelled by user.";
            } else if (error.message.includes("insufficient funds")) {
              errorMessage = "Insufficient funds to complete the transaction.";
            } else if (
              error.message.includes("Please install") ||
              error.message.includes("wallet")
            ) {
              errorMessage = "Please connect your Web3 wallet to vote.";
            } else if (
              error.message.includes("network") ||
              error.message.includes("connection")
            ) {
              errorMessage =
                "Network error. Please check your connection and try again.";
            } else if (error.message) {
              errorMessage = `Vote failed: ${error.message}`;
            }
          }

          useToastStore.getState().showToast(errorMessage, 7000);
        }
      },
      [proposal.id, proposal.start, proposal.end, proposal.type, space]
    );

    const handleSectionChange = useCallback((section: string) => {
      setVisibleSection((prevSection) =>
        prevSection === section ? undefined : section
      );
    }, []);

    const renderVotingButtons = useCallback(() => {
      switch (proposal.type) {
        case "single-choice":
          return renderSingleChoiceVotingUI(proposal, handleVote);
        case "approval":
          return renderApprovalVotingUI(proposal, state, dispatch, handleVote);
        case "quadratic":
          return renderWeightedVotingUI(proposal, state, dispatch, handleVote);
        case "ranked-choice":
          return renderRankedChoiceVotingUI(
            proposal,
            state,
            dispatch,
            handleVote
          );
        case "weighted":
          return renderWeightedVotingUI(proposal, state, dispatch, handleVote);
        case "basic":
          return renderSingleChoiceVotingUI(proposal, handleVote);
        default:
          return renderSingleChoiceVotingUI(proposal, handleVote);
      }
    }, [proposal, state, handleVote]);

    const headingStyle = useMemo(
      () => ({
        fontFamily: headingsFont,
        color: headingsColor,
      }),
      [headingsFont, headingsColor]
    );

    const bodyStyle = useMemo(
      () => ({
        fontFamily: bodyFont,
        color: bodyColor,
      }),
      [bodyFont, bodyColor]
    );

    return (
      <div
        className="p-4 border border-gray-200 bg-white rounded-lg"
        style={bodyStyle}
      >
        <div className="grid grid-cols-1 sm:grid-cols-[4rem_1fr_auto] gap-2 sm:gap-4 items-start">
          <div className="sm:col-start-2 sm:row-start-1">
            <Badge status={status} />
          </div>
          <img
            src={currentAvatarUrl}
            alt="Avatar"
            width={64}
            height={64}
            className="w-16 h-16 rounded-md object-cover sm:col-start-1 sm:row-start-1 sm:row-span-2"
            onError={handleError}
          />
          <h4
            className="font-bold break-words sm:col-start-2 sm:row-start-2"
            style={headingStyle}
          >
            {proposal.title}
          </h4>
          <div className="grid grid-cols-3 gap-2 mt-2 col-span-2 sm:col-span-3 sm:row-start-3">
            <CardButton
              label="Preview"
              onClick={handleSectionChange}
              isActive={visibleSection === "preview"}
              section="preview"
            />
            <CardButton
              label="Results"
              onClick={handleSectionChange}
              isActive={visibleSection === "results"}
              section="results"
            />
            <CardButton
              label="Voting"
              onClick={handleSectionChange}
              isActive={visibleSection === "voting"}
              section="voting"
            />
          </div>
        </div>

        {visibleSection && (
          <div className="border-t mt-4 pt-4">
            {visibleSection === "preview" && (
              <ProposalPreview body={proposal.body} />
            )}
            {visibleSection === "results" && (
              <VotingResults
                choices={proposal.choices}
                scores={proposal.scores}
                scores_total={proposal.scores_total}
                bodyFont={bodyFont}
                quorumInfo={spaceQuorum}
              />
            )}
            {visibleSection === "voting" &&
              (status === "Active" ? (
                renderVotingButtons()
              ) : (
                <div>
                  <center>Proposal is not active</center>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }
);

ProposalItem.displayName = "ProposalItem";

export default ProposalItem;
