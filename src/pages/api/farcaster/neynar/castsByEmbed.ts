import requestHandler from "@/common/data/api/requestHandler";
import axios, { AxiosRequestConfig, isAxiosError } from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const querySchema = z.object({
  url: z.string().url(),
  limit: z.string().optional(),
});

async function fetchCastsByEmbed(req: NextApiRequest, res: NextApiResponse) {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: "url query param is required" });
      return;
    }

    const { url, limit } = parsed.data;

    const options: AxiosRequestConfig = {
      method: "GET",
      // NOTE: Neynar's casts endpoint currently expects specific filters; use
      // the embed filter and fall back gracefully if the API shape changes.
      url: "https://api.neynar.com/v2/farcaster/casts",
      headers: {
        accept: "application/json",
        api_key: process.env.NEYNAR_API_KEY!,
      },
      params: {
        "embeds[]": url,
        limit: limit ? Number(limit) : undefined,
      },
    };

    const { data } = await axios.request(options);
    res.status(200).json(data);
  } catch (e: unknown) {
    if (isAxiosError(e)) {
      console.warn("Failed to fetch casts by embed", e.response?.data || e.message);
    } else {
      console.warn("Failed to fetch casts by embed", e);
    }
    res.status(200).json({ casts: [] });
  }
}

export default requestHandler({
  get: fetchCastsByEmbed,
});
