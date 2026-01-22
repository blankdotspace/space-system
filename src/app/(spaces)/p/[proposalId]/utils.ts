import { Address } from "viem";
import createSupabaseServerClient from "@/common/data/database/supabase/clients/server";
import { unstable_noStore as noStore } from 'next/cache';
import { WEBSITE_URL } from "@/constants/app";
import { ProposalSpacePageData, SPACE_TYPES } from "@/common/types/spaceData";
import { createInitalProposalSpaceConfigForProposalId } from "@/config";
import { loadSpaceDefaultTab } from "@/common/utils/tabUtils";

export interface ProposalData {
  id: string;
  title: string;
  proposer: {
    id: Address; // API returns string addresses but we cast to Address for type-safety
  };
  signers?: {
    id: Address; // API returns string addresses but we cast to Address for type-safety
  }[];
  createdTimestamp?: string;
  forVotes?: string;
  againstVotes?: string;
  abstainVotes?: string;
  quorumVotes?: string;
  endBlock?: string;
  status?: string;
}

interface ProposalSpaceRow {
  spaceId: string;
}

// Helper function to create timeout signal compatible with Edge runtime
function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export async function loadProposalData(proposalId: string, signal?: AbortSignal): Promise<ProposalData> {
  try {
    const response = await fetch("https://www.nouns.camp/subgraphs/nouns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: signal || createTimeoutSignal(10000), // 10 second timeout
      body: JSON.stringify({
        query: `query Proposal($proposalId: ID!) {
            proposal(id: $proposalId) {
              id
              title
              createdTimestamp
              forVotes
              againstVotes
              abstainVotes
              quorumVotes
              endBlock
              status
              proposer {
                id
              }
              signers {
                id
              }
            }
          }`,
        variables: {
          proposalId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch proposal data: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Check if GraphQL returned errors
    if (data.errors && data.errors.length > 0) {
      throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
    }

    // Check if proposal data exists
    if (!data.data || !data.data.proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    return {
      ...data.data.proposal,
    };
  } catch (error) {
    console.error("Error loading proposal data:", error);
    // Return a minimal valid object to prevent rendering errors
    return {
      id: proposalId,
      title: "Error loading proposal",
      proposer: {
        id: "0x0",
      },
      signers: [],
      createdTimestamp: "",
    };
  }
}

export async function calculateTimeRemaining(endBlock: string, signal?: AbortSignal): Promise<string> {
  if (!endBlock) return "";
  
  try {
    // Fetch current block number from the same GraphQL endpoint
    const response = await fetch("https://www.nouns.camp/subgraphs/nouns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: signal || createTimeoutSignal(5000), // 5 second timeout for metadata
      body: JSON.stringify({
        query: `query {
          _meta {
            block {
              number
              timestamp
            }
          }
        }`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch block data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check if GraphQL returned errors
    if (data.errors && data.errors.length > 0) {
      throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
    }

    // Check if block data exists
    if (!data.data || !data.data._meta || !data.data._meta.block) {
      throw new Error('Block data not found');
    }
    const currentBlock = parseInt(data.data._meta.block.number);
    const endBlockNumber = parseInt(endBlock);
    
    if (endBlockNumber <= currentBlock) {
      return "Voting ended";
    }
    
    // Assuming ~12 seconds per block (Ethereum average)
    const SECONDS_PER_BLOCK = 12;
    const remainingBlocks = endBlockNumber - currentBlock;
    const remainingSeconds = remainingBlocks * SECONDS_PER_BLOCK;
    
    const days = Math.floor(remainingSeconds / (24 * 60 * 60));
    const hours = Math.floor((remainingSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remainingSeconds % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  } catch (error) {
    console.error("Error calculating time remaining:", error);
    return "Time remaining unknown";
  }
}

export async function generateProposalThumbnailUrl(proposalData: ProposalData, signal?: AbortSignal): Promise<string> {
  const params = new URLSearchParams({
    id: proposalData.id,
    title: proposalData.title,
    proposer: proposalData.proposer.id,
    forVotes: proposalData.forVotes || "0",
    againstVotes: proposalData.againstVotes || "0",
    abstainVotes: proposalData.abstainVotes || "0",
    quorumVotes: proposalData.quorumVotes || "0",
  });
  
  if (proposalData.signers && proposalData.signers.length > 0) {
    params.set("signers", proposalData.signers.map(s => s.id).join(","));
  }
  
  if (proposalData.endBlock) {
    const timeRemaining = await calculateTimeRemaining(proposalData.endBlock, signal);
    params.set("timeRemaining", timeRemaining);
  }
  
  // Fix WEBSITE_URL fallback for deployment
  const base = WEBSITE_URL ?? 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  
  const url = `${base}/api/metadata/proposal-thumbnail?${params.toString()}`;
  
  // Log for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.log("Generated proposal thumbnail URL:", url);
  }
  
  return url;
}

export async function loadProposalSpaceId(proposalId: string): Promise<string | null> {
  noStore();
  try {
    const { data, error } = await createSupabaseServerClient()
      .from("spaceRegistrations")
      .select("spaceId")
      .eq("proposalId", proposalId)
      .order("timestamp", { ascending: true })
      .limit(1);
    if (error) {
      console.error("Error fetching proposal space id:", error);
      return null;
    }
    return data && data.length > 0 ? (data as ProposalSpaceRow[])[0].spaceId : null;
  } catch (e) {
    console.error("Exception in loadProposalSpaceId:", e);
    return null;
  }
}

export async function loadProposalSpaceRegistration(proposalId: string): Promise<{
  spaceId?: string;
  identityPublicKey?: string;
} | null> {
  noStore();
  try {
    const { data, error } = await createSupabaseServerClient()
      .from("spaceRegistrations")
      .select("spaceId, identityPublicKey")
      .eq("proposalId", proposalId)
      .order("timestamp", { ascending: true })
      .limit(1);
    if (error) {
      console.error("Error fetching proposal space registration:", error);
      return null;
    }
    return data && data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error("Exception in loadProposalSpaceRegistration:", e);
    return null;
  }
}

// Proposal space specific creator
export const createProposalSpaceData = async (
  spaceId: string | undefined,
  spaceName: string,
  proposalId: string,
  ownerAddress: Address,
  tabName: string,
  proposalData?: ProposalData,
  identityPublicKey?: string
): Promise<Omit<ProposalSpacePageData, 'isEditable' | 'spacePageUrl'>> => {
  
  const config = {
    ...createInitalProposalSpaceConfigForProposalId(
      proposalId,
      ownerAddress
    ),
    timestamp: new Date().toISOString(),
  };

  // Load dynamic default tab from storage, fallback to "Overview"
  const defaultTab = await loadSpaceDefaultTab(spaceId, "Overview");

  return {
    // Base SpaceData properties
    spaceId: spaceId,
    spaceName,
    spaceType: SPACE_TYPES.PROPOSAL,
    updatedAt: new Date().toISOString(),
    defaultTab,
    currentTab: tabName,
    spaceOwnerFid: undefined, // FID not available for proposal spaces
    config,
    // ProposalSpaceData specific properties
    proposalId,
    spaceOwnerAddress: ownerAddress,
    proposalData,
    identityPublicKey,
  };
};

export const loadProposalSpaceData = async (
  proposalId: string,
  tabNameParam?: string
): Promise<Omit<ProposalSpacePageData, 'isEditable' | 'spacePageUrl'> | null> => {
  const proposalData = await loadProposalData(proposalId || "0");
  
  // Check if proposal data is valid (not the fallback with 0x0 address)
  if (!proposalData?.proposer?.id || proposalData.proposer.id === "0x0" || proposalData.proposer.id === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  const tabName = tabNameParam || "Overview";
  const spaceName = `Proposal ${proposalId}`;
  const ownerAddress = proposalData.proposer.id as Address;

  // Check if space already exists in database and get registration data
  const registrationData = await loadProposalSpaceRegistration(proposalId);
  const spaceId = registrationData?.spaceId;
  const identityPublicKey = registrationData?.identityPublicKey;

  return await createProposalSpaceData(
    spaceId, // Use existing spaceId if found, otherwise undefined for claiming
    spaceName,
    proposalId,
    ownerAddress,
    tabName,
    proposalData,
    identityPublicKey
  );
};