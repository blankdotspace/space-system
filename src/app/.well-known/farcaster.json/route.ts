import { loadSystemConfig, type MiniAppConfig, type MiniAppAccountAssociation, type MiniAppManifestOverrides } from "@/config";
import { resolveBaseUrl } from "@/common/lib/utils/resolveBaseUrl";
import { buildMiniAppManifest } from "@/common/lib/utils/miniAppManifest";
import { resolveMiniAppDomain } from "@/common/lib/utils/miniAppDomain";

function withValidProperties<T extends Record<string, unknown>>(properties: T): Partial<T> {
  return Object.entries(properties).reduce<Partial<T>>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }
    if (Array.isArray(value) && value.length === 0) {
      return acc;
    }
    if (typeof value === "string" && value.trim().length === 0) {
      return acc;
    }
    acc[key as keyof T] = value as T[keyof T];
    return acc;
  }, {});
}

const resolveEnvAccountAssociation = (): MiniAppAccountAssociation | undefined => {
  const header = process.env.FARCASTER_HEADER;
  const payload = process.env.FARCASTER_PAYLOAD;
  const signature = process.env.FARCASTER_SIGNATURE;
  if (!header || !payload || !signature) {
    return undefined;
  }
  return { header, payload, signature };
};

const isAccountAssociationComplete = (association?: MiniAppAccountAssociation) =>
  Boolean(association?.header && association?.payload && association?.signature);

const resolveAccountAssociation = (
  miniappConfig: MiniAppConfig | undefined,
  domain: string,
): MiniAppAccountAssociation | undefined => {
  if (!miniappConfig) {
    return undefined;
  }
  const normalizedDomain = domain.trim().toLowerCase();
  const associations = miniappConfig.accountAssociations;
  if (associations && normalizedDomain) {
    const directMatch = associations[normalizedDomain] ?? associations[domain];
    if (isAccountAssociationComplete(directMatch)) {
      return directMatch;
    }
    const withoutWww = normalizedDomain.replace(/^www\./, "");
    const fallbackMatch = associations[withoutWww];
    if (isAccountAssociationComplete(fallbackMatch)) {
      return fallbackMatch;
    }
  }
  if (isAccountAssociationComplete(miniappConfig.accountAssociation)) {
    return miniappConfig.accountAssociation;
  }
  return undefined;
};

export async function GET() {
  const systemConfig = await loadSystemConfig();
  const baseUrl = await resolveBaseUrl({ systemConfig });
  const miniAppDomain = resolveMiniAppDomain(baseUrl);
  const envTags = process.env.NEXT_PUBLIC_APP_TAGS
    ?.split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const manifestOverrides: MiniAppManifestOverrides = {
    ...(systemConfig.community.miniapp?.manifest ?? {}),
  };

  if ((!manifestOverrides.tags || manifestOverrides.tags.length === 0) && envTags) {
    manifestOverrides.tags = envTags;
  }

  const miniapp = buildMiniAppManifest({
    systemConfig,
    baseUrl,
    overrides: manifestOverrides,
  });

  const accountAssociation =
    resolveAccountAssociation(systemConfig.community.miniapp, miniAppDomain) ??
    resolveEnvAccountAssociation();

  return Response.json({
    ...(accountAssociation ? { accountAssociation } : {}),
    miniapp: withValidProperties(miniapp),
    baseBuilder: {
      allowedAddresses: ["0x857Ba87e094BF962D0B933bBf2C706893e14d3bE"],
    },
  });
}
