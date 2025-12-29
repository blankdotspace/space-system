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

    const options: AxiosRequestConfig = {
      method: "GET",
      url: "https://api.neynar.com/v2/farcaster/embeds",
      headers: {
        accept: "application/json",
        api_key: process.env.NEYNAR_API_KEY!,
      },
      params: { url: urls },
      paramsSerializer: {
        encode: (params) => {
          const searchParams = new URLSearchParams();
          (params.url as string[]).forEach((value) => {
            searchParams.append("url", value);
          });
          return searchParams.toString();
        },
      },
    };

    const { data } = await axios.request(options);
    res.status(200).json(data);
  } catch (e) {
    if (isAxiosError(e)) {
      res
        .status(e.response?.status || 500)
        .json(e.response?.data || "An unknown error occurred");
    } else {
      res.status(500).json("An unknown error occurred");
    }
  }
}

export default requestHandler({
  get: fetchEmbeds,
});
