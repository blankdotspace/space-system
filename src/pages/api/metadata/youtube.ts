import { BlankspaceResponse } from "@/common/data/api/requestHandler";
import { NextApiRequest, NextApiResponse } from "next/types";
import { getYouTubeMetadata } from "@/common/lib/utils/youtube";
import { youtube_v3 } from "@googleapis/youtube";

export type YouTubeMetadataResponse =
  BlankspaceResponse<youtube_v3.Schema$Video>;

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<YouTubeMetadataResponse>,
) {
  const url = req.query.url as string;

  if (!url) {
    return res.status(400).json({
      result: "error",
      error: {
        message: "URL parameter is required",
      },
    });
  }

  try {
    const metadata = await getYouTubeMetadata(url);

    if (!metadata) {
      return res.status(500).json({
        result: "error",
        error: {
          message: "Received empty metadata",
        },
      });
    }

    return res.status(200).json({
      result: "success",
      value: metadata,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      result: "error",
      error: {
        message: "Error fetching metadata",
      },
    });
  }
}
