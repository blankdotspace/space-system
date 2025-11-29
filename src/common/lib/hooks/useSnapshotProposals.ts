// src/hooks/useSnapshotProposals.ts

import { useEffect, useState } from "react";

interface FetchProposalsParams {
  ens: string;
  skip: number;
  first: number;
  apiUrl?: string;
}

const proposalsQuery = (ens: string, skip: number, first: number) => `
    {
        proposals (
            first: ${first},
            skip: ${skip},
            where: {
                space_in: ["${ens}"],
            },
            orderBy: "created",
            orderDirection: desc
        ) {
            id
            title
            body
            choices
            start
            end
            snapshot
            state
            author
            created 
            scores
            space {
                id
                name
            }
            type
        }
    }
`;

export const useSnapshotProposals = ({
  ens,
  skip,
  first,
  apiUrl = "https://hub.snapshot.org/graphql",
}: FetchProposalsParams) => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: proposalsQuery(ens?.toLowerCase(), skip, first) }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.errors) {
            setError("GraphQL Proposals Error");
            console.error("GraphQL Proposals Error:", data.errors);
            return;
          }
          const processedProposals = data.data?.proposals?.map((proposal: any) => {
            const safeScores = Array.isArray(proposal.scores) ? proposal.scores : [];
            return {
              ...proposal,
              scores: safeScores,
              scores_total: safeScores.reduce((a: number, b: number) => a + b, 0),
            };
          }) || [];
          setProposals(processedProposals);
        }
      } catch (error) {
        setError("GraphQL Proposals Error");
        console.error("GraphQL Proposals Error:", error);
      }
    };

    fetchProposals();
  }, [ens, skip, first]);

  return { proposals, error };
};
