import type { NextApiRequest, NextApiResponse } from "next";
import requestHandler from "@/common/data/api/requestHandler";
import { createPublicClient, http } from "viem";
import { optimism } from "viem/chains";

// Farcaster Id Registry on Optimism
const ID_REGISTRY_ADDRESS =
  "0x00000000Fc6c5F01Fc30151999387Bb99A9f489b" as const;

// Minimal ABI for the idOf function
const idOfAbi = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "idOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function getOptimismClient() {
  return createPublicClient({
    chain: optimism,
    transport: http(),
  });
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const address = req.query.address;
  if (typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({
      result: "error",
      error: { message: "Missing or invalid address query param" },
    });
  }

  try {
    const client = getOptimismClient();
    const fid = await client.readContract({
      address: ID_REGISTRY_ADDRESS,
      abi: idOfAbi,
      functionName: "idOf",
      args: [address as `0x${string}`],
    });

    return res.status(200).json({
      result: "success",
      value: { fid: fid ? Number(fid) : null },
    });
  } catch (e: any) {
    console.error("fid-for-address error", e);
    return res.status(500).json({
      result: "error",
      error: { message: e?.message || "Failed to look up FID" },
    });
  }
}

export default requestHandler({ get: handler });
