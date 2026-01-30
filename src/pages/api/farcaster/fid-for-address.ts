import type { NextApiRequest, NextApiResponse } from "next";
import requestHandler from "@/common/data/api/requestHandler";
import { getFidForAddress } from "@/fidgets/farcaster/utils";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const address = req.query.address;
  if (typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({
      result: "error",
      error: { message: "Missing or invalid address query param" },
    });
  }

  try {
    const fid = await getFidForAddress(address as `0x${string}`);
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
