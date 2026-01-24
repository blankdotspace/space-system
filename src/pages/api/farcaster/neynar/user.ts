import neynar from "@/common/data/api/neynar";
import requestHandler from "@/common/data/api/requestHandler";
import axios, { AxiosRequestConfig, isAxiosError } from "axios";
import { NextApiRequest, NextApiResponse } from "next/types";


export interface NeynarUser {
  object: string;
  fid: number;
  username: string;
  display_name: string;
  custody_address: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
      mentioned_profiles: string[];
    };
    location: {
      latitude: number;
      longitude: number;
      address: {
        city: string;
        state: string;
        state_code: string;
        country: string;
        country_code: string;
      };
    };
  };
  follower_count: number;
  following_count: number;
  verifications: string[];
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
  verified_accounts: {
    platform: string;
    username: string;
  }[];
  power_badge: boolean;
  viewer_context: {
    following: boolean;
    followed_by: boolean;
    blocking: boolean;
    blocked_by: boolean;
  };
}

type NeynarUserByUsernameResponse = { user: NeynarUser };

const getUsername = (query: NextApiRequest["query"]) => {
  const raw = query.username;
  if (Array.isArray(raw)) return raw[0];
  if (typeof raw === "string") return raw.trim();
  return undefined;
};

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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const username = getUsername(req.query);
    if (username) {
      const options: AxiosRequestConfig = {
        method: "GET",
        url: "https://api.neynar.com/v2/farcaster/user/by_username",
        headers: {
          accept: "application/json",
          api_key: process.env.NEYNAR_API_KEY!,
        },
        params: req.query,
      };

      const { data } = await axios.request<NeynarUserByUsernameResponse>(options);
      return res.status(200).json(data);
    }

    const addresses = getAddresses(req.query).filter(Boolean);
    const fids = getFids(req.query);

    if (addresses.length > 0) {
      const response = await neynar.fetchBulkUsersByEthOrSolAddress({ addresses });
      const users = Object.values(response).flat();
      return res.status(200).json({ users });
    }

    if (fids.length > 0) {
      const response = await neynar.fetchBulkUsers({
        fids,
        viewerFid: req.query.viewer_fid ? Number(req.query.viewer_fid) : undefined,
      });
      return res.status(200).json(response);
    }

    return res.status(400).json({
      result: "error",
      error: { message: "Missing username, addresses or fids parameter" },
    });
  } catch (e) {
    if (isAxiosError(e)) {
      return res
        .status((e.response?.data as any)?.status || 500)
        .json(e.response?.data || "An unknown error occurred");
    }

    console.error("Error fetching users from Neynar:", e);
    return res.status(500).json({
      result: "error",
      error: { message: "Failed to fetch users" },
    });
  }
}

export default requestHandler({
  get: handler,
});
