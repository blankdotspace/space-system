import type { Metadata } from "next/types";
import type { SystemConfig } from "@/config";
import { getDefaultFrame } from "@/constants/metadata";

export type DefaultFrameAssets = {
  defaultFrame: Awaited<ReturnType<typeof getDefaultFrame>>;
  defaultImage: string;
  splashImageUrl: string;
};

export const getDefaultFrameAssets = async (
  systemConfig: SystemConfig,
  baseUrl: string,
): Promise<DefaultFrameAssets> => {
  const defaultFrame = await getDefaultFrame({ systemConfig, baseUrl });
  return {
    defaultFrame,
    defaultImage: defaultFrame.imageUrl,
    splashImageUrl: defaultFrame.button.action.splashImageUrl,
  };
};

export const buildDefaultFrameMetadata = async (
  systemConfig: SystemConfig,
  baseUrl: string,
): Promise<Metadata> => {
  const { defaultFrame } = await getDefaultFrameAssets(systemConfig, baseUrl);
  return {
    other: {
      "fc:frame": JSON.stringify(defaultFrame),
    },
  };
};
