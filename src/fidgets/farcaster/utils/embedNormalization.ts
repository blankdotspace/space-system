import { isWebUrl } from "@/common/lib/utils/urls";
import type { EmbedUrlMetadata } from "@neynar/nodejs-sdk/build/api/models/embed-url-metadata";
import type { HtmlMetadata } from "@neynar/nodejs-sdk/build/api/models/html-metadata";
import { hexToBytes } from "viem";

import { type FarcasterEmbed, isFarcasterUrlEmbed } from "./embedTypes";

export const FARCASTER_EMBED_LIMIT = 2;

const normalizeCastId = (maybeCastId: unknown) => {
  if (
    !maybeCastId ||
    typeof maybeCastId !== "object" ||
    !("fid" in maybeCastId) ||
    !("hash" in maybeCastId)
  ) {
    return null;
  }

  const fid = Number((maybeCastId as { fid: unknown }).fid);
  const hashValue = (maybeCastId as { hash: unknown }).hash;

  if (!Number.isFinite(fid) || fid < 0) {
    return null;
  }

  if (hashValue instanceof Uint8Array) {
    return hashValue.length === 20 ? { fid, hash: hashValue } : null;
  }

  if (typeof hashValue === "string") {
    const hexHash = hashValue.startsWith("0x") ? hashValue : `0x${hashValue}`;
    try {
      const bytes = hexToBytes(hexHash as `0x${string}`);
      return bytes.length === 20 ? { fid, hash: bytes } : null;
    } catch (error) {
      return null;
    }
  }

  return null;
};

const normalizeEmbed = (embed: unknown): FarcasterEmbed | null => {
  if (!embed || typeof embed !== "object") return null;

  const castId = (embed as { castId?: unknown; cast_id?: unknown }).castId ??
    (embed as { cast_id?: unknown }).cast_id;

  if (castId) {
    const normalizedCastId = normalizeCastId(castId);
    if (normalizedCastId) {
      return { castId: normalizedCastId };
    }
  }

  const urlValue = (embed as { url?: unknown }).url ?? (embed as { uri?: unknown }).uri;
  if (typeof urlValue === "string" && isWebUrl(urlValue)) {
    try {
      return { url: new URL(urlValue).toString() };
    } catch (error) {
      return { url: urlValue };
    }
  }

  return null;
};

const toHexString = (hash: Uint8Array) =>
  Array.from(hash)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const createEmbedKey = (embed: FarcasterEmbed): string => {
  if (isFarcasterUrlEmbed(embed)) {
    try {
      return `url:${new URL(embed.url).toString()}`;
    } catch (error) {
      return `url:${embed.url}`;
    }
  }

  const hashString = toHexString(embed.castId.hash);
  return `cast:${embed.castId.fid}:${hashString}`;
};

export const validateFarcasterEmbeds = (embeds: unknown[]) => {
  const normalized: FarcasterEmbed[] = [];
  const invalid: { index: number; value: unknown }[] = [];

  embeds.forEach((embed, index) => {
    const normalizedEmbed = normalizeEmbed(embed);
    if (normalizedEmbed) {
      normalized.push(normalizedEmbed);
    } else {
      invalid.push({ index, value: embed });
    }
  });

  return {
    normalized,
    invalid,
    overLimit: normalized.length > FARCASTER_EMBED_LIMIT,
  };
};

export const sanitizeFarcasterEmbeds = (
  embeds: unknown[],
  options?: { removedKeys?: Set<string>; limit?: number },
) => {
  const { normalized } = validateFarcasterEmbeds(embeds);
  const limit = options?.limit ?? FARCASTER_EMBED_LIMIT;
  const removedKeys = options?.removedKeys ?? new Set<string>();

  const uniqueEmbeds: FarcasterEmbed[] = [];
  const seen = new Set<string>();

  for (const embed of normalized) {
    if (uniqueEmbeds.length >= limit) break;

    const key = createEmbedKey(embed);

    if (removedKeys.has(key) || seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueEmbeds.push(embed);
  }

  return uniqueEmbeds;
};

export const resolveEmbedUrlFromMetadata = (
  sourceUrl: string,
  metadata?: EmbedUrlMetadata,
) => {
  const candidates = [
    metadata?.frame?.frames_url,
    metadata?.html?.ogUrl,
    metadata?.html?.oembed && "url" in metadata.html.oembed
      ? (metadata.html.oembed as { url?: string }).url
      : undefined,
    sourceUrl,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (candidate && isWebUrl(candidate)) {
      try {
        return new URL(candidate).toString();
      } catch (error) {
        return candidate;
      }
    }
  }

  return null;
};

const pickOgImage = (metadata?: HtmlMetadata) => {
  const ogImage = metadata?.ogImage && metadata.ogImage[0];
  if (!ogImage?.url) return undefined;

  const width = ogImage.width ? Number(ogImage.width) : undefined;
  const height = ogImage.height ? Number(ogImage.height) : undefined;

  return {
    url: ogImage.url,
    width: Number.isFinite(width) ? width : undefined,
    height: Number.isFinite(height) ? height : undefined,
  };
};

export const mapEmbedMetadataToUrlMetadata = (metadata?: EmbedUrlMetadata) => {
  if (!metadata) return {};

  const image = pickOgImage(metadata.html);

  return {
    title: metadata.html?.ogTitle || undefined,
    description: metadata.html?.ogDescription || undefined,
    publisher: metadata.html?.ogSiteName || undefined,
    mimeType: metadata.content_type || undefined,
    image,
    logo: metadata.html?.favicon ? { url: metadata.html.favicon } : undefined,
  };
};
