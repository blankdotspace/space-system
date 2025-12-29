import neynar from "@/common/data/api/neynar";
import requestHandler from "@/common/data/api/requestHandler";
import { validateEmbedPayload } from "@/fidgets/farcaster/embedNormalization";
import { isAxiosError } from "axios";
import { NextApiRequest, NextApiResponse } from "next";

export async function publishMessageHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const body = { ...req.body };
    const { embeds } = body || {};

    if (!validateEmbedPayload(embeds)) {
      console.error("Invalid embed payload", embeds);
      res.status(400).json({ message: "Invalid embed payload" });
      return;
    }

    const response = await neynar.publishMessageToFarcaster({ body });
    res.status(200).json(response);
  } catch (e: any) {
    if (e.response?.data) {
      console.error("response.data");
      console.dir(e.response.data, { depth: null });
    }
    if (isAxiosError(e)) {
      res.status(e.status || 500).json(e.response?.data);
    } else {
      res.status(500).json("Unknown error occurred");
    }
  }
}

export default requestHandler({
  post: publishMessageHandler,
});
