import axiosBackend from "@/common/data/api/backend";

export type EmbedLookupResult = {
  casts: any[];
};

export const fetchCastsByEmbed = async (
  url: string,
): Promise<EmbedLookupResult | null> => {
  try {
    const { data } = await axiosBackend.get(
      `/api/farcaster/neynar/castsByEmbed?url=${encodeURIComponent(url)}`,
    );
    return data as EmbedLookupResult;
  } catch (error) {
    console.warn("Failed to fetch casts by embed", error);
    return null;
  }
};
