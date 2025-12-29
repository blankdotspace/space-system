export type CastIdEmbed = {
  castId: {
    fid: number;
    hash: Uint8Array | string | { type?: string; data?: number[] } | number[];
  };
};

export type UrlEmbed = {
  url: string;
};

export type FarcasterEmbed = CastIdEmbed | UrlEmbed;

export type EmbedMetadata = {
  content_type?: string | null;
  image?: { url?: string } | null;
  video?: { url?: string } | null;
  frame?: {
    url?: string | null;
    version?: string | null;
    title?: string | null;
    image?: string | null;
  } | null;
  html?: {
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogUrl?: string | null;
    ogImage?: Array<{ url?: string | null }>;
    ogSiteName?: string | null;
    title?: string | null;
    description?: string | null;
    url?: string | null;
  } | null;
};

export type EmbedInspection = {
  url: string;
  type?: string;
  castId?: {
    fid: number;
    hash: string | Uint8Array | { type?: string; data?: number[] } | number[];
  };
  metadata?: EmbedMetadata | null;
  error?: string;
};

export const isUrlEmbed = (embed: FarcasterEmbed): embed is UrlEmbed =>
  "url" in embed && typeof (embed as UrlEmbed).url === "string";

export const isCastIdEmbed = (embed: FarcasterEmbed): embed is CastIdEmbed =>
  "castId" in embed && typeof (embed as CastIdEmbed).castId === "object";
