import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IdentityRequest {
  type: "Create" | "Revoke";
  identityPublicKey: string;
  walletAddress: string;
  nonce: string;
  timestamp: string;
  signature: string;
}

interface SignedFile {
  publicKey: string;
  fileData: string;
  fileType: string;
  isEncrypted: boolean;
  timestamp: string;
  signature: string;
}

interface DeployRequest {
  walletAddress: string;
  communityId: string;
  walletSignature: string;
  nonce: string;
  isNewUser: boolean;
  identityRequest?: IdentityRequest;
  signedKeyFile?: SignedFile;
  brandConfig: Record<string, unknown>;
  assetsConfig: Record<string, unknown>;
  communityConfig: Record<string, unknown>;
  fidgetsConfig: Record<string, unknown>;
  navigationConfig: Record<string, unknown>;
  uiConfig: Record<string, unknown>;
}

type JsonRecord = Record<string, unknown>;

const DEFAULT_THEME = {
  id: "default",
  name: "Default",
  properties: {
    font: "Inter",
    fontColor: "#000000",
    headingsFont: "Inter",
    headingsFontColor: "#000000",
    background: "#ffffff",
    backgroundHTML: "",
    musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
    fidgetBackground: "#ffffff",
    fidgetBorderWidth: "1px",
    fidgetBorderColor: "#eeeeee",
    fidgetShadow: "none",
    fidgetBorderRadius: "12px",
    gridSpacing: "16",
  },
};

const X_AVATAR_DATA =
  "data:image/webp;base64,UklGRjwDAABXRUJQVlA4IDADAAAwEwCdASozADMAPjEOjEYiEREJgCADBLSACvAP4B1T+gX7tewH7b7oB5Bfpx86/Hf8rtYJ/gv8+/KjJh/5b8t+FX/gPUh/Mf7zxg0d3nBfyH9O/Lv2R/PP+t9wD+Nf0P/O/2f94P8T8kHrM/aL2Lv1OTvFCx/7T977b/Lxb0GppIsSCShxNPS4ejN2Tn2Gpsha3mMHbq7Qs5OMbf/HXssqIPwA/v+r8lxFe+i8+zEOmpnbq/gZJ9n/r/gyvizFRxlqP83vEb2tMrQvF7HQPwRbHqDnQ7/waPUr+H6qkSp88nrrBnY8Rn9a+VTSJyR1ZeqwigXOSIguFtM78A3xJRz9VXOw2YgJtm7V9YTW92mv3Hg9mhimC3F0bEih9tQcZsbkJWOORQ4YejsAENCRdVcV7VrALnmzdwMSsfLfadMuf9Bp+S0KsKfCmCJvqWNTwGn2Vs8L7szaXFxMe+qLL708+z6/vx3Hyz23wF0LZhLVT3R2hB9KnLAmnxiFfh9KIr3hgLPEapK7qAtT5Q+GQTbPXo34M7SDx8tXrJ7PNF89N4ITkuMKvE8RWoyL3g6ep/5j1Y+wiIteNZe/D6f5UUyE5q/6GJevQ+AqIrO7abTGIO5Td2xsjIRuV/jV5A36uRO/3PH6v/8cOlr8ZE4uzHNak98aet9a+7iP/6p3u6HvENLHt1y13LZ34IE+ImLfFf+zFJsAiafcSOUgc2GtRpxJP+vJK+3pr/VEnNk4qMaL3hSyYZTJ6ND++XiV5vMrdm72LcJzYaNIZZpsF5vxR2/lPW/R57fvlJszqeK4gmQ/lqM6WX22ypXI7OPAMihJygPEvWbI/5CW0uMO8Ah2hiPwM/i0fiB/R+HLGoDa19/vOlnbedr+0U79UhB9VKvoCB3FVr4lpU8t8fE+8LOWWg8KN4IA4jRDOHBm59LX1IzhYZWeRSBrp8UHanycHuqqFa8JUSbJp6pYuD9KsfQR+en+P+kjg7eYFwQ8X6055LrJLTr4Metf8JGluIXMfgg0zBLor1XQwO73rj3+7164syNPA0zWJycUZ0jX2DSoE1os8KWbqlVdC4Y6sFWKEoEAAAA=";
const FARCASTER_AVATAR = "/images/farcaster.jpeg";
const DISCORD_AVATAR =
  "https://play-lh.googleusercontent.com/0oO5sAneb9lJP6l8c6DH4aj6f85qNpplQVHmPmbbBxAukDnlO7DarDW0b-kEIHa8SQ=w240-h480-rw";

function rootKeyPath(identityPublicKey: string, walletAddress: string): string {
  return `identities/${identityPublicKey}/${walletAddress}/root.json`;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHandle(handle: string | null): string | null {
  if (!handle) {
    return null;
  }
  const trimmed = handle.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const path = url.pathname.replace(/^\/+/, "");
      return path.length > 0 ? path : null;
    } catch {
      return trimmed;
    }
  }
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeUuid(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return isUuid(trimmed) ? trimmed : null;
}

function createSignedFile(
  publicKey: string,
  fileData: JsonRecord,
  timestamp: string,
): SignedFile {
  return {
    publicKey,
    fileData: JSON.stringify(fileData),
    fileType: "json",
    isEncrypted: false,
    timestamp,
    signature: "not applicable, machine generated file",
  };
}

function createTabOrderPayload(
  spaceId: string,
  tabOrder: string[],
  publicKey: string,
  timestamp: string,
): JsonRecord {
  return {
    spaceId,
    timestamp,
    tabOrder,
    publicKey,
    signature: "not applicable, machine generated file",
  };
}

function buildHomeTabConfig(website: string | null, timestamp: string): JsonRecord {
  const hasWebsite = !!website;
  const theme = {
    ...DEFAULT_THEME,
    properties: {
      ...DEFAULT_THEME.properties,
      ...(hasWebsite
        ? {
            fidgetBorderRadius: "0px",
            gridSpacing: "0",
          }
        : {}),
    },
  };

  const fidgetInstanceDatums = hasWebsite
    ? {
        "web-embed-home": {
          config: {
            data: {},
            editable: true,
            settings: {
              background: "var(--user-theme-fidget-background)",
              cropOffsetX: 0,
              cropOffsetY: 0,
              fidgetBorderColor: "#000000",
              fidgetBorderWidth: "0",
              fidgetShadow: "var(--user-theme-fidget-shadow)",
              isScrollable: false,
              showOnMobile: true,
              url: website,
            },
          },
          fidgetType: "iframe",
          id: "web-embed-home",
        },
      }
    : {};

  const layout = hasWebsite
    ? [
        {
          h: 10,
          i: "web-embed-home",
          isBounded: false,
          maxH: 36,
          maxW: 36,
          minH: 2,
          minW: 2,
          moved: false,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
          static: false,
          w: 12,
          x: 0,
          y: 0,
        },
      ]
    : [];

  return {
    fidgetInstanceDatums,
    layoutID: "home-layout",
    layoutDetails: {
      layoutConfig: { layout },
      layoutFidget: "grid",
    },
    isEditable: false,
    fidgetTrayContents: [],
    theme,
    timestamp,
  };
}

function buildSocialLinks(
  xHandle: string | null,
  farcaster: string,
  discordUrl: string | null,
): Array<JsonRecord> {
  const links: Array<JsonRecord> = [];

  if (xHandle) {
    const xUrl = xHandle.startsWith("http") ? xHandle : `https://x.com/${xHandle}`;
    links.push({
      avatar: X_AVATAR_DATA,
      description: "",
      text: "X",
      url: xUrl,
    });
  }

  links.push({
    avatar: FARCASTER_AVATAR,
    description: "",
    text: "Farcaster",
    url: `https://farcaster.xyz/~/channel/${farcaster}`,
  });

  if (discordUrl) {
    links.push({
      avatar: DISCORD_AVATAR,
      description: "",
      text: "Discord",
      url: discordUrl,
    });
  }

  return links;
}

function buildSocialTabConfig(
  farcaster: string,
  displayName: string,
  xHandle: string | null,
  discordUrl: string | null,
  uiConfig: JsonRecord,
  timestamp: string,
): JsonRecord {
  const castButton = isRecord(uiConfig.castButton) ? uiConfig.castButton : {};
  const background = getString(castButton.backgroundColor) ?? DEFAULT_THEME.properties.background;
  const uiFont = getString(uiConfig.url) ?? DEFAULT_THEME.properties.font;

  const theme = {
    id: "Social-Theme",
    name: "Social-Theme",
    properties: {
      background,
      backgroundHTML: "",
      fidgetBackground: DEFAULT_THEME.properties.fidgetBackground,
      fidgetBorderColor: DEFAULT_THEME.properties.fidgetBorderColor,
      fidgetBorderRadius: DEFAULT_THEME.properties.fidgetBorderRadius,
      fidgetBorderWidth: "0px",
      fidgetShadow: DEFAULT_THEME.properties.fidgetShadow,
      font: uiFont,
      fontColor: DEFAULT_THEME.properties.fontColor,
      gridSpacing: DEFAULT_THEME.properties.gridSpacing,
      headingsFont: uiFont,
      headingsFontColor: DEFAULT_THEME.properties.headingsFontColor,
      musicURL: DEFAULT_THEME.properties.musicURL,
    },
  };

  const links = buildSocialLinks(xHandle, farcaster, discordUrl);

  return {
    fidgetInstanceDatums: {
      "feed:channel-feed": {
        config: {
          data: {},
          editable: true,
          settings: {
            Xhandle: xHandle ?? "",
            background: "var(--user-theme-fidget-background)",
            channel: farcaster,
            feedType: "filter",
            fidgetBorderColor: "var(--user-theme-fidget-border-color)",
            fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
            fidgetShadow: "var(--user-theme-fidget-shadow)",
            filterType: "channel_id",
            fontColor: "var(--user-theme-font-color)",
            fontFamily: "var(--user-theme-font)",
            keyword: "",
            selectPlatform: {
              icon: FARCASTER_AVATAR,
              name: "Farcaster",
            },
            showOnMobile: true,
            style: "light",
            username: "",
            users: "",
          },
        },
        fidgetType: "feed",
        id: "feed:channel-feed",
      },
      "feed:mention-feed": {
        config: {
          data: {},
          editable: true,
          settings: {
            Xhandle: "",
            background: "var(--user-theme-fidget-background)",
            channel: "",
            feedType: "filter",
            fidgetBorderColor: "var(--user-theme-fidget-border-color)",
            fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
            fidgetShadow: "var(--user-theme-fidget-shadow)",
            filterType: "keyword",
            fontColor: "var(--user-theme-font-color)",
            fontFamily: "var(--user-theme-font)",
            keyword: displayName,
            selectPlatform: {
              icon: FARCASTER_AVATAR,
              name: "Farcaster",
            },
            showOnMobile: true,
            style: "light",
            username: "",
            users: "",
          },
        },
        fidgetType: "feed",
        id: "feed:mention-feed",
      },
      "social-links": {
        config: {
          data: {},
          editable: true,
          settings: {
            DescriptionColor: "var(--user-theme-font-color)",
            HeaderColor: "var(--user-theme-headings-font-color)",
            background: "var(--user-theme-fidget-background)",
            css: "",
            fidgetBorderColor: "var(--user-theme-fidget-border-color)",
            fidgetBorderWidth: "var(--user-theme-fidget-border-width)",
            fidgetShadow: "var(--user-theme-fidget-shadow)",
            fontFamily: "Theme Font",
            headingsFontFamily: "Theme Font",
            itemBackground: "var(--user-theme-fidget-background)",
            links,
            showOnMobile: true,
            title: "Social",
            viewMode: "list",
          },
        },
        fidgetType: "links",
        id: "social-links",
      },
    },
    fidgetTrayContents: [],
    isEditable: false,
    layoutDetails: {
      layoutConfig: {
        layout: [
          {
            h: 10,
            i: "feed:channel-feed",
            isBounded: false,
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 4,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 8,
            x: 0,
            y: 0,
          },
          {
            h: 4,
            i: "social-links",
            isBounded: false,
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 2,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 8,
            y: 6,
          },
          {
            h: 6,
            i: "feed:mention-feed",
            isBounded: false,
            maxH: 36,
            maxW: 36,
            minH: 2,
            minW: 2,
            moved: false,
            resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
            static: false,
            w: 4,
            x: 8,
            y: 0,
          },
        ],
      },
      layoutFidget: "grid",
    },
    layoutID: "social-layout",
    theme,
    timestamp,
  };
}

function findHomeItemIndex(items: unknown[]): number {
  return items.findIndex((item) => {
    if (!isRecord(item)) {
      return false;
    }
    const id = getString(item.id);
    const href = getString(item.href);
    const label = getString(item.label)?.toLowerCase();
    return id === "home" || href === "/home" || label === "home";
  });
}

function getHomeNavSpaceId(navigationConfig: unknown): string | null {
  if (!isRecord(navigationConfig) || !Array.isArray(navigationConfig.items)) {
    return null;
  }
  const homeIndex = findHomeItemIndex(navigationConfig.items);
  if (homeIndex === -1) {
    return null;
  }
  const item = navigationConfig.items[homeIndex];
  if (!isRecord(item)) {
    return null;
  }
  return normalizeUuid(getString(item.spaceId));
}

function ensureHomeNavItem(
  navigationConfig: unknown,
  spaceId: string,
): JsonRecord {
  const base = isRecord(navigationConfig) ? { ...navigationConfig } : {};
  const items = Array.isArray(base.items) ? [...base.items] : [];
  const homeIndex = findHomeItemIndex(items);

  if (homeIndex >= 0 && isRecord(items[homeIndex])) {
    items[homeIndex] = {
      ...items[homeIndex],
      spaceId,
    };
  } else {
    items.unshift({
      id: "home",
      label: "Home",
      href: "/home",
      icon: "home",
      spaceId,
    });
  }

  return {
    ...base,
    items,
  };
}

async function spaceIdExists(
  supabase: ReturnType<typeof createClient>,
  spaceId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("spaceRegistrations")
    .select("spaceId")
    .eq("spaceId", spaceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data?.spaceId;
}

async function findHomeSpaceByName(
  supabase: ReturnType<typeof createClient>,
  spaceName: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("spaceRegistrations")
    .select("spaceId")
    .eq("spaceName", spaceName)
    .eq("spaceType", "navPage")
    .order("timestamp", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.spaceId ?? null;
}

async function spaceHasTabs(
  supabase: ReturnType<typeof createClient>,
  spaceId: string,
): Promise<boolean> {
  const { data, error } = await supabase.storage
    .from("spaces")
    .list(`${spaceId}/tabs`, { limit: 1 });

  if (error) {
    return false;
  }

  return (data?.length ?? 0) > 0;
}

async function uploadTabFile(
  supabase: ReturnType<typeof createClient>,
  spaceId: string,
  tabName: string,
  tabConfig: JsonRecord,
  publicKey: string,
  timestamp: string,
): Promise<void> {
  const signedFile = createSignedFile(publicKey, tabConfig, timestamp);
  const { error } = await supabase.storage
    .from("spaces")
    .upload(
      `${spaceId}/tabs/${tabName}`,
      new Blob([JSON.stringify(signedFile)], { type: "application/json" }),
      { upsert: true },
    );

  if (error) {
    throw error;
  }
}

async function uploadTabOrder(
  supabase: ReturnType<typeof createClient>,
  spaceId: string,
  tabOrder: string[],
  publicKey: string,
  timestamp: string,
): Promise<void> {
  const payload = createTabOrderPayload(spaceId, tabOrder, publicKey, timestamp);
  const { error } = await supabase.storage
    .from("spaces")
    .upload(
      `${spaceId}/tabOrder`,
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
      { upsert: true },
    );

  if (error) {
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (req.method === "GET") {
      const url = new URL(req.url);
      const walletAddress = url.searchParams.get("walletAddress");

      if (!walletAddress) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "walletAddress query parameter is required",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: existingIdentities } = await supabase
        .from("walletIdentities")
        .select("identityPublicKey, walletAddress");

      const existingIdentity = existingIdentities?.find(
        (identity) =>
          identity.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
      );

      return new Response(
        JSON.stringify({
          success: true,
          exists: !!existingIdentity,
          identityPublicKey: existingIdentity?.identityPublicKey || null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const requestData: DeployRequest = await req.json();

    const {
      walletAddress,
      communityId,
      walletSignature,
      nonce,
      isNewUser,
      identityRequest,
      signedKeyFile,
      brandConfig,
      assetsConfig,
      communityConfig,
      fidgetsConfig,
      navigationConfig,
      uiConfig,
    } = requestData;

    if (!walletAddress || !communityId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Wallet address and community ID are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!walletSignature) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Wallet signature is required for authentication",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: existingIdentities, error: fetchError } = await supabase
      .from("walletIdentities")
      .select("*");

    const existingIdentity = existingIdentities?.find(
      (identity) =>
        identity.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
    );

    if (fetchError) {
      console.error("Error fetching identity:", fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch user identity",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let identityPublicKey: string;

    if (existingIdentity) {
      identityPublicKey = existingIdentity.identityPublicKey;
    } else {
      if (!isNewUser || !identityRequest || !signedKeyFile) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Identity request and signed key file are required for new users",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (identityRequest.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Identity request wallet address does not match",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      identityPublicKey = identityRequest.identityPublicKey;

      const { error: insertError } = await supabase
        .from("walletIdentities")
        .insert({
          type: identityRequest.type,
          identityPublicKey: identityRequest.identityPublicKey,
          walletAddress: identityRequest.walletAddress,
          nonce: identityRequest.nonce,
          timestamp: identityRequest.timestamp,
          signature: identityRequest.signature,
        });

      if (insertError) {
        console.error("Error creating identity:", insertError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to create user identity",
            details: insertError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const keyFilePath = rootKeyPath(
        identityRequest.identityPublicKey,
        identityRequest.walletAddress,
      );
      const keyFileContent = JSON.stringify(signedKeyFile);

      const { error: storageError } = await supabase.storage
        .from("private")
        .upload(
          keyFilePath,
          new Blob([keyFileContent], { type: "application/json" }),
          { upsert: true },
        );

      if (storageError) {
        console.error("Error uploading key file:", storageError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to upload identity key file",
            details: storageError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const { data: existingConfig } = await supabase
      .from("community_configs")
      .select("admin_identity_public_keys, navigation_config")
      .eq("community_id", communityId)
      .maybeSingle();

    let adminKeys: string[] = [identityPublicKey];

    if (existingConfig?.admin_identity_public_keys) {
      const existingKeys = existingConfig.admin_identity_public_keys as string[];
      if (!existingKeys.includes(identityPublicKey)) {
        adminKeys = [...existingKeys, identityPublicKey];
      } else {
        adminKeys = existingKeys;
      }
    }

    const nowIso = new Date().toISOString();
    const homeSpaceName = `${communityId}-home`;
    let homeSpaceId = getHomeNavSpaceId(navigationConfig);
    let createdHomeSpace = false;

    if (homeSpaceId) {
      try {
        const exists = await spaceIdExists(supabase, homeSpaceId);
        if (!exists) {
          homeSpaceId = null;
        }
      } catch (error) {
        console.error("Error checking nav spaceId:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to validate navigation spaceId",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (!homeSpaceId) {
      try {
        homeSpaceId = await findHomeSpaceByName(supabase, homeSpaceName);
      } catch (error) {
        console.error("Error looking up home space:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to resolve home space",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (!homeSpaceId) {
      const { data: insertedSpace, error: insertSpaceError } = await supabase
        .from("spaceRegistrations")
        .insert({
          fid: null,
          spaceName: homeSpaceName,
          spaceType: "navPage",
          identityPublicKey,
          signature: "not applicable, machine generated file",
          timestamp: nowIso,
        })
        .select("spaceId")
        .maybeSingle();

      if (insertSpaceError || !insertedSpace?.spaceId) {
        console.error("Error creating home space:", insertSpaceError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to create home space",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      homeSpaceId = insertedSpace.spaceId;
      createdHomeSpace = true;
    }

    const communityConfigObj = isRecord(communityConfig) ? communityConfig : {};
    const communityUrls = isRecord(communityConfigObj.urls)
      ? communityConfigObj.urls
      : {};
    const communitySocial = isRecord(communityConfigObj.social)
      ? communityConfigObj.social
      : {};
    const website = getString(communityUrls.website);
    const discordUrl = getString(communityUrls.discord);
    const farcaster = getString(communitySocial.farcaster);
    const xHandle = normalizeHandle(
      getString(communitySocial.x ?? communitySocial.twitter ?? communitySocial.X),
    );
    const displayName =
      getString(isRecord(brandConfig) ? brandConfig.displayName : null) ??
      communityId;

    const shouldSeedStorage =
      createdHomeSpace || !(await spaceHasTabs(supabase, homeSpaceId));

    if (shouldSeedStorage) {
      const tabs: Array<{ name: string; config: JsonRecord }> = [];
      const tabOrder: string[] = [];

      tabs.push({ name: "Home", config: buildHomeTabConfig(website, nowIso) });
      tabOrder.push("Home");

      if (farcaster) {
        const socialTabConfig = buildSocialTabConfig(
          farcaster,
          displayName,
          xHandle,
          discordUrl,
          isRecord(uiConfig) ? uiConfig : {},
          nowIso,
        );
        tabs.push({ name: "Social", config: socialTabConfig });
        tabOrder.push("Social");
      }

      try {
        for (const tab of tabs) {
          await uploadTabFile(
            supabase,
            homeSpaceId,
            tab.name,
            tab.config,
            identityPublicKey,
            nowIso,
          );
        }
        await uploadTabOrder(
          supabase,
          homeSpaceId,
          tabOrder,
          identityPublicKey,
          nowIso,
        );
      } catch (error) {
        console.error("Error uploading home space files:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to upload home space files",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const navigationConfigWithHome = ensureHomeNavItem(
      navigationConfig,
      homeSpaceId,
    );

    const { data: configData, error: configError } = await supabase
      .from("community_configs")
      .upsert(
        {
          community_id: communityId,
          brand_config: brandConfig,
          assets_config: assetsConfig,
          community_config: communityConfig,
          fidgets_config: fidgetsConfig,
          navigation_config: navigationConfigWithHome,
          ui_config: uiConfig,
          is_published: true,
          admin_identity_public_keys: adminKeys,
          updated_at: nowIso,
        },
        {
          onConflict: "community_id",
        },
      )
      .select()
      .maybeSingle();

    if (configError) {
      console.error("Error saving config:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to save community configuration",
          details: configError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        communityId,
        identityPublicKey,
        config: configData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error deploying config:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
