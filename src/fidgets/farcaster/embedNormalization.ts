import { isNil } from "lodash";
import { CastIdEmbed, EmbedInspection, FarcasterEmbed, UrlEmbed } from "./types";

const toUint8Array = (
  value: string | Uint8Array | number[] | { type?: string; data?: number[] },
): Uint8Array | null => {
  if (!value) return null;

  if (value instanceof Uint8Array) return value;

  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }

  if (typeof value === "string") {
    const normalized = value.startsWith("0x") ? value.slice(2) : value;
    if (!normalized || normalized.length % 2 !== 0) return null;
    const pairs = normalized.match(/.{1,2}/g);
    if (!pairs) return null;
    const bytes = pairs.map((pair) => parseInt(pair, 16));
    return Uint8Array.from(bytes);
  }

  if (typeof value === "object" && Array.isArray(value.data)) {
    return new Uint8Array(value.data);
  }

  return null;
};

const isValidCastId = (embed: CastIdEmbed): boolean => {
  const fidValid = typeof embed.castId?.fid === "number";
  const hashValid =
    embed.castId?.hash instanceof Uint8Array ||
    typeof embed.castId?.hash === "string" ||
    Array.isArray(embed.castId?.hash) ||
    (!!embed.castId?.hash && typeof embed.castId?.hash === "object");

  return fidValid && hashValid;
};

const normaliseCastId = (
  castId?: CastIdEmbed["castId"],
): CastIdEmbed | null => {
  if (!castId || typeof castId.fid !== "number") return null;
  const hash = toUint8Array(castId.hash);
  if (!hash) return null;

  return {
    castId: {
      fid: castId.fid,
      hash,
    },
  };
};

const findInspectionForUrl = (
  url: string,
  inspections?: EmbedInspection[],
): EmbedInspection | undefined => {
  if (!inspections) return undefined;
  return inspections.find((inspection) => inspection.url === url);
};

/**
 * Normalize the editor's embed output into Farcaster-compliant embed objects.
 */
export const normalizeToFarcasterEmbeds = (
  rawEmbeds: unknown[],
  inspections?: EmbedInspection[],
): FarcasterEmbed[] => {
  if (!Array.isArray(rawEmbeds)) return [];

  const normalized: FarcasterEmbed[] = [];

  rawEmbeds.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const candidate = raw as Record<string, unknown>;

    // Highest priority: explicit castId
    if (candidate.castId) {
      const castEmbed = normaliseCastId(candidate.castId as any);
      if (castEmbed) {
        normalized.push(castEmbed);
        return;
      }
    }

    // URL embeds
    if (typeof candidate.url === "string") {
      const inspection = findInspectionForUrl(candidate.url, inspections);
      if (inspection?.castId) {
        const hash = toUint8Array(inspection.castId.hash);
        const castEmbed = normaliseCastId(
          hash
            ? {
                fid: inspection.castId.fid,
                hash,
              }
            : undefined,
        );
        if (castEmbed) {
          normalized.push(castEmbed);
          return;
        }
      }

      normalized.push({ url: candidate.url });
      return;
    }
  });

  return normalized;
};

export const isValidEmbed = (embed: unknown): embed is FarcasterEmbed => {
  if (!embed || typeof embed !== "object") return false;

  if ("url" in (embed as UrlEmbed)) {
    return typeof (embed as UrlEmbed).url === "string";
  }

  if ("castId" in (embed as CastIdEmbed)) {
    return isValidCastId(embed as CastIdEmbed);
  }

  return false;
};

export const validateEmbedPayload = (
  embeds: unknown,
): embeds is FarcasterEmbed[] => {
  if (isNil(embeds)) return true;
  if (!Array.isArray(embeds)) return false;
  return embeds.every((embed) => isValidEmbed(embed));
};
