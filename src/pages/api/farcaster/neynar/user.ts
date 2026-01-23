import neynar from "@/common/data/api/neynar";
import requestHandler from "@/common/data/api/requestHandler";
import { NextApiRequest, NextApiResponse } from "next/types";

const getAddresses = (query: NextApiRequest["query"]) => {
  const raw = query.addresses ?? query["addresses[]"];
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim());
  return [] as string[];
};

const getFids = (query: NextApiRequest["query"]) => {
  const raw = query.fids;
  if (Array.isArray(raw)) return raw.map((f) => Number(f)).filter((f) => !isNaN(f));
  if (typeof raw === "string") return raw.split(",").map((f) => Number(f.trim())).filter((f) => !isNaN(f));
  return [] as number[];
};

async function loadUsers(req: NextApiRequest, res: NextApiResponse) {
  try {
    const addresses = getAddresses(req.query).filter(Boolean);
    const fids = getFids(req.query);

    // Support both addresses and fids
    if (addresses.length > 0) {
      const response = await neynar.fetchBulkUsersByEthOrSolAddress({
        addresses,
      });
      // Transform the response to match the expected format
      // Neynar returns Record<address, User[]>, we need to flatten it
      const users = Object.values(response).flat();
      return res.status(200).json({ users });
    } else if (fids.length > 0) {
      const response = await neynar.fetchBulkUsers({
        fids,
        viewerFid: req.query.viewer_fid ? Number(req.query.viewer_fid) : undefined,
      });
      return res.status(200).json(response);
    } else {
      return res.status(400).json({
        result: "error",
        error: { message: "Missing addresses or fids parameter" },
      });
    }
    } catch (e: any) {
    console.error("Error fetching users from Neynar:", e);
    return res.status(500).json({
      result: "error",
      error: { message: e?.message || "Failed to fetch users" },
    });
  }
}

export default requestHandler({
  get: loadUsers,
});