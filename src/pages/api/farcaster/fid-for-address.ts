import type { NextApiRequest, NextApiResponse } from "next";
import requestHandler from "@/common/data/api/requestHandler";
import { createPublicClient, http, fallback } from "viem";
import { optimism } from "viem/chains";
import { ID_REGISTRY_ADDRESS, idRegistryABI } from "@farcaster/hub-web";

const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
  ? `https://opt-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
  : undefined;

const optimismClient = createPublicClient({
  chain: optimism,
  transport: fallback(
    [
      alchemyUrl ? http(alchemyUrl) : undefined,
      http("https://mainnet.optimism.io"),
    ].filter(Boolean) as ReturnType<typeof http>[],
  ),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const address = req.query.address;
  if (typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({
      result: "error",
      error: { message: "Missing or invalid address query param" },
    });
  }

  try {
    const fid = await optimismClient.readContract({
      address: ID_REGISTRY_ADDRESS,
      abi: idRegistryABI,
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
