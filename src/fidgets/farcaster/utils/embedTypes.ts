export type FarcasterUrlEmbed = {
  url: string;
};

export type FarcasterCastIdEmbed = {
  castId: {
    fid: number;
    hash: Uint8Array;
  };
};

export type FarcasterEmbed = FarcasterCastIdEmbed | FarcasterUrlEmbed;

export const isFarcasterUrlEmbed = (
  embed: FarcasterEmbed,
): embed is FarcasterUrlEmbed => {
  return (embed as FarcasterUrlEmbed).url !== undefined;
};
