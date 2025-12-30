import requestHandler from "@/common/data/api/requestHandler";
import axios, { AxiosRequestConfig, isAxiosError } from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const querySchema = z.object({
  url: z.union([z.string().url(), z.array(z.string().url())]).optional(),
});

async function fetchEmbeds(req: NextApiRequest, res: NextApiResponse) {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success || !parsed.data.url) {
      res.status(400).json({ message: "url query param is required" });
      return;
    }

    const urls = Array.isArray(parsed.data.url)
      ? parsed.data.url
      : [parsed.data.url];

    const results = await Promise.all(
      urls.map(async (url) => {
        const options: AxiosRequestConfig = {
          method: "GET",
          url: "https://api.neynar.com/v2/farcaster/cast/embed/crawl",
          headers: {
            accept: "application/json",
            api_key: process.env.NEYNAR_API_KEY!,
          },
          params: { url },
        };
        try {
          const { data } = await axios.request(options);
          return { url, metadata: data?.metadata };
        } catch (err) {
          if (isAxiosError(err)) {
            console.warn("Failed to crawl embed", url, err.response?.data || err.message);
          } else {
            console.warn("Failed to crawl embed", url, err);
          }
          return { url, metadata: null };
        }
      }),
    );

    res.status(200).json({ embeds: results });
  } catch (e) {
    console.error("Unexpected error in fetchEmbeds", e);
    res.status(500).json("An unknown error occurred");
  }
}

export default requestHandler({
  get: fetchEmbeds,
});
