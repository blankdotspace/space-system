import neynar from "@/common/data/api/neynar";
import requestHandler from "@/common/data/api/requestHandler";
import { isAxiosError } from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import {
  FARCASTER_EMBED_LIMIT,
  sanitizeFarcasterEmbeds,
  validateFarcasterEmbeds,
} from "@/fidgets/farcaster/utils/embedNormalization";


async function publishMessage(req: NextApiRequest, res: NextApiResponse) {
  try {
    const message = {
      ...req.body,
    };

    if (Array.isArray(message.embeds)) {
      const { normalized, invalid, overLimit } = validateFarcasterEmbeds(message.embeds);
      if (invalid.length || overLimit) {
        console.warn("Rejecting invalid Farcaster embeds", {
          invalidEmbeds: invalid,
          overLimit,
        });
        return res.status(400).json({
          message: "Invalid embeds",
          invalid: invalid.length,
          overLimit,
          limit: FARCASTER_EMBED_LIMIT,
        });
      }

      message.embeds = sanitizeFarcasterEmbeds(message.embeds);
    }

    const response = await neynar.publishMessageToFarcaster({body: message});
    res.status(200).json(response);
  } catch (e: any) {
    if (e.response?.data) {
      console.error("response.data")
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
  post: publishMessage,
});
