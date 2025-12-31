import neynar from "@/common/data/api/neynar";
import requestHandler from "@/common/data/api/requestHandler";
import { isAxiosError } from "axios";
import { NextApiRequest, NextApiResponse } from "next";

const embedMetadata = async (req: NextApiRequest, res: NextApiResponse) => {
  const url = typeof req.query.url === "string" ? req.query.url : "";
  if (!url) {
    return res.status(400).json({ message: "Missing url" });
  }

  try {
    const response = await neynar.fetchEmbeddedUrlMetadata({ url });
    return res.status(200).json(response);
  } catch (error) {
    if (isAxiosError(error)) {
      return res
        .status(error.response?.status || 500)
        .json(error.response?.data || { message: "Failed to crawl url" });
    }

    return res.status(500).json({ message: "Failed to crawl url" });
  }
};

export default requestHandler({
  get: embedMetadata,
});
