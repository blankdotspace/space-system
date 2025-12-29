import { Metadata } from "next/types";
import React from "react";
import { WEBSITE_URL } from "@/constants/app";
import { loadProposalData, calculateTimeRemaining } from "./utils";
import { getDefaultFrame } from "@/constants/metadata";

const buildDefaultMetadata = async () => {
  const defaultFrame = await getDefaultFrame();
  return {
    other: {
      'fc:frame': JSON.stringify(defaultFrame),
    },
  };
};

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ proposalId: string }> 
}): Promise<Metadata> {
  const { proposalId } = await params;
  const defaultMetadata = await buildDefaultMetadata();
  
  if (!proposalId) {
    return defaultMetadata;
  }

  try {
    // Add timeout to prevent hanging during metadata generation
    const proposalAbort = new AbortController();
    const proposalData = await Promise.race([
      loadProposalData(proposalId, proposalAbort.signal),
      new Promise<null>((_, reject) => 
        setTimeout(() => {
          proposalAbort.abort();
          reject(new Error('Proposal data fetch timeout'));
        }, 8000)
      )
    ]);

    if (!proposalData || proposalData.title === "Error loading proposal") {
      return defaultMetadata;
    }

    const frameUrl = `${WEBSITE_URL}/p/${proposalId}`;
    
    // Generate beautiful thumbnail URL with all voting data
    const thumbnailParams = new URLSearchParams({
      id: proposalData.id,
      title: proposalData.title,
      proposer: proposalData.proposer.id,
      forVotes: proposalData.forVotes || '0',
      againstVotes: proposalData.againstVotes || '0',
      abstainVotes: proposalData.abstainVotes || '0',
      quorumVotes: proposalData.quorumVotes || '0',
    });
    
    if (proposalData.signers && proposalData.signers.length > 0) {
      thumbnailParams.set("signers", proposalData.signers.map(s => s.id).join(","));
    }
    
    if (proposalData.endBlock) {
      const timeRemaining = await calculateTimeRemaining(proposalData.endBlock);
      thumbnailParams.set("timeRemaining", timeRemaining);
    } else {
      thumbnailParams.set("timeRemaining", "Voting ended");
    }
    
    const dynamicThumbnailUrl = `${WEBSITE_URL}/api/metadata/proposal-thumbnail?${thumbnailParams.toString()}`;

  const proposalFrame = {
    version: "next",
    imageUrl: dynamicThumbnailUrl,
    button: {
      title: `View Proposal ${proposalData.id}`,
      action: {
        type: "launch_frame",
        url: frameUrl,
        name: `Proposal ${proposalData.id} on Nounspace`,
        splashImageUrl: dynamicThumbnailUrl,
        splashBackgroundColor: "#FFFFFF",
      },
    },
  };

  const getProposerDisplay = () => {
    if (proposalData.signers && proposalData.signers.length > 0) {
      // De-duplicate addresses in case proposer is also in signers
      const allSigners = Array.from(
        new Set([proposalData.proposer.id, ...proposalData.signers.map(s => s.id)])
      );
      if (allSigners.length <= 2) {
        return allSigners.join(" & ");
      } else {
        return `${allSigners[0]} & ${allSigners.length - 1} others`;
      }
    }
    return proposalData.proposer.id;
  };

  const metadataWithFrame = {
    title: `Proposal: ${proposalData.title} | Nounspace`,
    description: `Proposal by ${getProposerDisplay()} on Nounspace. Explore the details and discussions around this proposal.`,
    openGraph: {
      title: `Prop ${proposalData.id}: ${proposalData.title}`,
      description: `Proposal by ${getProposerDisplay()} on Nounspace. View voting details and participate in the discussion.`,
      images: [
        {
          url: dynamicThumbnailUrl,
          width: 1200,
          height: 630,
          alt: `Proposal ${proposalData.id} voting details`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Prop ${proposalData.id}: ${proposalData.title}`,
      description: `Proposal by ${getProposerDisplay()} on Nounspace. View voting details and participate in the discussion.`,
      images: [dynamicThumbnailUrl],
    },
    other: {
      "fc:frame": JSON.stringify(proposalFrame),
    },
  };

  return metadataWithFrame;
  
  } catch (error) {
    console.error("Error generating proposal metadata:", error);
    return defaultMetadata;
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
