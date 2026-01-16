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
  customDomain?: string;
  adminEmail?: string;
  customDomainAuthorized?: boolean;
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

const EXPLORE_FULL_WIDTH = 12;
const EXPLORE_FULL_HEIGHT = 24;
const EXPLORE_RESIZE_HANDLES = ["s", "w", "e", "n", "sw", "nw", "se", "ne"];
const EXPLORE_DEFAULT_NETWORK = "mainnet";
const EXPLORE_CHANNEL_NETWORK = "base";
const BASE_DIRECTORY_SETTINGS = {
  layoutStyle: "cards",
  include: "holdersWithFarcasterAccount",
};
const DIRECTORY_FETCH_TIMEOUT_MS = 25000;

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

function normalizeDomainValue(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  const candidate =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    const normalized = host.startsWith("www.") ? host.slice(4) : host;
    return normalized.includes(".") ? normalized : null;
  } catch {
    return null;
  }
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
      return null;
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

function sanitizeTabKey(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function slugify(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : fallback;
}

function uniqueTabName(baseName: string, used: Set<string>): string {
  let candidate = baseName;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${baseName} ${counter}`;
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}

function createExploreTheme(idSuffix: string): JsonRecord {
  return {
    id: `explore-${idSuffix}-theme`,
    name: `${DEFAULT_THEME.name} Explore`,
    properties: {
      ...DEFAULT_THEME.properties,
      fidgetBorderRadius: "0px",
      gridSpacing: "0",
    },
  };
}

function normalizeTokenNetwork(network: string | null, defaultNetwork: string): string {
  if (!network) {
    return defaultNetwork;
  }
  const normalized = network.trim().toLowerCase();
  if (normalized === "eth") {
    return "mainnet";
  }
  if (normalized === "mainnet" || normalized === "base" || normalized === "polygon") {
    return normalized;
  }
  return defaultNetwork;
}

function resolveCommunityBaseUrl(communityId: string): string | null {
  const trimmed = communityId.trim();
  if (!trimmed) {
    return null;
  }
  const candidate =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function buildEtherscanUrl(address?: string | null): string | null {
  return address ? `https://etherscan.io/address/${normalizeAddress(address)}` : null;
}

function extractNeynarPrimaryAddress(user: unknown): string | null {
  if (!user || typeof user !== "object") {
    return null;
  }

  const verified = (user as { verified_addresses?: any }).verified_addresses;
  if (verified && typeof verified === "object") {
    const primary = verified.primary;
    if (primary && typeof primary.eth_address === "string" && primary.eth_address) {
      return normalizeAddress(primary.eth_address);
    }
    if (Array.isArray(verified.eth_addresses)) {
      const candidate = verified.eth_addresses.find(
        (value: unknown): value is string => typeof value === "string" && value.length > 0,
      );
      if (candidate) {
        return normalizeAddress(candidate);
      }
    }
  }

  const custody = (user as { custody_address?: string | null }).custody_address;
  if (typeof custody === "string" && custody) {
    return normalizeAddress(custody);
  }

  const verifications = (user as { verifications?: string[] }).verifications;
  if (Array.isArray(verifications)) {
    const candidate = verifications.find(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    if (candidate) {
      return normalizeAddress(candidate);
    }
  }

  const authAddresses = (user as { auth_addresses?: Array<{ address?: string }> }).auth_addresses;
  if (Array.isArray(authAddresses)) {
    const entry = authAddresses.find(
      (item) => item && typeof item.address === "string" && item.address.length > 0,
    );
    if (entry?.address) {
      return normalizeAddress(entry.address);
    }
  }

  return null;
}

function extractNeynarSocialAccounts(user: unknown): {
  xHandle: string | null;
  xUrl: string | null;
  githubHandle: string | null;
  githubUrl: string | null;
} {
  if (!user || typeof user !== "object") {
    return { xHandle: null, xUrl: null, githubHandle: null, githubUrl: null };
  }

  const verifiedAccounts = (user as { verified_accounts?: Array<any> }).verified_accounts;
  let xHandle: string | null = null;
  let xUrl: string | null = null;
  let githubHandle: string | null = null;
  let githubUrl: string | null = null;

  if (Array.isArray(verifiedAccounts)) {
    for (const account of verifiedAccounts) {
      const platform =
        typeof account?.platform === "string" ? account.platform.toLowerCase() : "";
      const username =
        typeof account?.username === "string" ? account.username.replace(/^@/, "").trim() : "";
      if (!username) continue;

      if (!xHandle && (platform === "x" || platform === "twitter")) {
        xHandle = username;
        xUrl = `https://twitter.com/${username}`;
      } else if (!githubHandle && platform === "github") {
        githubHandle = username;
        githubUrl = `https://github.com/${username}`;
      }
    }
  }

  return { xHandle, xUrl, githubHandle, githubUrl };
}

function extractViewerContext(user: unknown): { following?: boolean | null } | null {
  if (!user || typeof user !== "object") {
    return null;
  }
  const context = (user as { viewer_context?: { following?: boolean | null } | null })
    .viewer_context;
  if (!context || typeof context !== "object") {
    return null;
  }
  const following = context.following;
  if (typeof following === "boolean" || following === null) {
    return { following };
  }
  return null;
}

function getNestedUser(user: unknown): any | null {
  if (!user || typeof user !== "object") {
    return null;
  }
  if ("user" in user && (user as { user?: unknown }).user) {
    return getNestedUser((user as { user?: unknown }).user);
  }
  return user;
}

function mapNeynarUserToMember(user: any): JsonRecord {
  const primaryAddress = extractNeynarPrimaryAddress(user);
  const { xHandle, xUrl, githubHandle, githubUrl } = extractNeynarSocialAccounts(user);
  const fid = typeof user?.fid === "number" ? user.fid : null;
  const address = fid ? `fc_fid_${fid}` : `fc_fid_${crypto.randomUUID()}`;
  return {
    address,
    balanceRaw: "0",
    balanceFormatted: "",
    username: user?.username ?? null,
    displayName: user?.display_name ?? null,
    fid,
    pfpUrl: user?.pfp_url ?? null,
    followers: typeof user?.follower_count === "number" ? user.follower_count : null,
    lastTransferAt: null,
    ensName: null,
    ensAvatarUrl: null,
    primaryAddress,
    etherscanUrl: buildEtherscanUrl(primaryAddress),
    xHandle,
    xUrl,
    githubHandle,
    githubUrl,
    viewerContext: extractViewerContext(user),
  };
}

function sortMembersByFollowers(members: JsonRecord[]): JsonRecord[] {
  return [...members].sort((a, b) => {
    const aFollowers = typeof a.followers === "number" ? a.followers : 0;
    const bFollowers = typeof b.followers === "number" ? b.followers : 0;
    return bFollowers - aFollowers;
  });
}

async function fetchTokenDirectoryData(
  baseUrl: string,
  network: string,
  contractAddress: string,
  assetType: "token" | "nft",
): Promise<JsonRecord | null> {
  const url = new URL("/api/token/directory", baseUrl);
  url.searchParams.set("network", network);
  url.searchParams.set("contractAddress", contractAddress);
  url.searchParams.set("assetType", assetType);
  url.searchParams.set("pageSize", "1000");

  try {
    const payload = await fetchJsonWithTimeout(url.toString(), DIRECTORY_FETCH_TIMEOUT_MS);
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const result = (payload as { result?: unknown }).result;
    if (result !== "success") {
      return null;
    }
    const value = (payload as { value?: any }).value;
    if (!value || typeof value !== "object") {
      return null;
    }
    const members = Array.isArray(value.members) ? value.members : null;
    if (!members) {
      return null;
    }
    const fetchedAt = typeof value.fetchedAt === "string"
      ? value.fetchedAt
      : new Date().toISOString();
    return {
      members,
      tokenSymbol: value.tokenSymbol ?? null,
      tokenDecimals: typeof value.tokenDecimals === "number" ? value.tokenDecimals : null,
      lastUpdatedTimestamp: fetchedAt,
      lastFetchSettings: {
        source: "tokenHolders",
        network,
        contractAddress,
        assetType,
      },
    };
  } catch (error) {
    console.error("Directory fetch failed:", error);
    return null;
  }
}

async function fetchChannelDirectoryData(
  baseUrl: string,
  channelName: string,
): Promise<JsonRecord | null> {
  const url = new URL("/api/farcaster/neynar/channel/members", baseUrl);
  url.searchParams.set("id", channelName);
  url.searchParams.set("limit", "100");

  try {
    const payload = await fetchJsonWithTimeout(url.toString(), DIRECTORY_FETCH_TIMEOUT_MS);
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const membersArray = Array.isArray((payload as { members?: unknown }).members)
      ? (payload as { members: unknown[] }).members
      : null;
    if (!membersArray) {
      return null;
    }
    const users = membersArray
      .map((entry) => getNestedUser(entry))
      .filter((entry): entry is Record<string, unknown> => !!entry);
    const members = sortMembersByFollowers(users.map(mapNeynarUserToMember));
    return {
      members,
      tokenSymbol: null,
      tokenDecimals: null,
      lastUpdatedTimestamp: new Date().toISOString(),
      lastFetchSettings: {
        source: "farcasterChannel",
        channelName,
        channelFilter: "members",
      },
    };
  } catch (error) {
    console.error("Channel directory fetch failed:", error);
    return null;
  }
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

function buildExploreTabConfig(
  name: string,
  idSuffix: string,
  settings: JsonRecord,
  timestamp: string,
  data: JsonRecord,
): JsonRecord {
  const fidgetId = `Directory:${idSuffix}`;
  return {
    fidgetInstanceDatums: {
      [fidgetId]: {
        config: {
          data,
          editable: false,
          settings,
        },
        fidgetType: "Directory",
        id: fidgetId,
      },
    },
    layoutID: `explore-${idSuffix}-layout`,
    layoutDetails: {
      layoutConfig: {
        layout: [
          {
            w: EXPLORE_FULL_WIDTH,
            h: EXPLORE_FULL_HEIGHT,
            x: 0,
            y: 0,
            i: fidgetId,
            minW: EXPLORE_FULL_WIDTH,
            maxW: EXPLORE_FULL_WIDTH,
            minH: 8,
            maxH: 36,
            moved: false,
            static: false,
            resizeHandles: [...EXPLORE_RESIZE_HANDLES],
            isBounded: false,
          },
        ],
      },
      layoutFidget: "grid",
    },
    theme: createExploreTheme(idSuffix),
    fidgetTrayContents: [],
    isEditable: false,
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
  const uiFont = getString(uiConfig.font) ?? DEFAULT_THEME.properties.font;

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

function buildTokenDirectorySettings(
  address: string,
  assetType: "token" | "nft",
  network: string,
): JsonRecord {
  return {
    ...BASE_DIRECTORY_SETTINGS,
    source: "tokenHolders",
    network,
    contractAddress: address,
    assetType,
    sortBy: "tokenHoldings",
  };
}

function buildChannelDirectorySettings(channel: string): JsonRecord {
  return {
    ...BASE_DIRECTORY_SETTINGS,
    source: "farcasterChannel",
    network: EXPLORE_CHANNEL_NETWORK,
    contractAddress: "",
    assetType: "token",
    sortBy: "followers",
    channelName: channel,
    channelFilter: "members",
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

function findExploreItemIndex(items: unknown[]): number {
  return items.findIndex((item) => {
    if (!isRecord(item)) {
      return false;
    }
    const id = getString(item.id);
    const href = getString(item.href);
    const label = getString(item.label)?.toLowerCase();
    return id === "explore" || href === "/explore" || label === "explore";
  });
}

function getExploreNavSpaceId(navigationConfig: unknown): string | null {
  if (!isRecord(navigationConfig) || !Array.isArray(navigationConfig.items)) {
    return null;
  }
  const exploreIndex = findExploreItemIndex(navigationConfig.items);
  if (exploreIndex === -1) {
    return null;
  }
  const item = navigationConfig.items[exploreIndex];
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

function ensureExploreNavItem(
  navigationConfig: unknown,
  spaceId: string,
): JsonRecord {
  const base = isRecord(navigationConfig) ? { ...navigationConfig } : {};
  const items = Array.isArray(base.items) ? [...base.items] : [];
  const exploreIndex = findExploreItemIndex(items);

  if (exploreIndex >= 0 && isRecord(items[exploreIndex])) {
    items[exploreIndex] = {
      ...items[exploreIndex],
      spaceId,
    };
  } else {
    const homeIndex = findHomeItemIndex(items);
    const insertIndex = homeIndex >= 0 ? homeIndex + 1 : items.length;
    items.splice(insertIndex, 0, {
      id: "explore",
      label: "Explore",
      href: "/explore",
      icon: "explore",
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

async function findNavSpaceByName(
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
        .select("identityPublicKey, walletAddress")
        .ilike("walletAddress", walletAddress)
        .limit(1);

      const existingIdentity = existingIdentities?.[0];

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
      customDomain,
      adminEmail,
      customDomainAuthorized,
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
      .select("identityPublicKey, walletAddress")
      .ilike("walletAddress", walletAddress)
      .limit(1);

    const existingIdentity = existingIdentities?.[0];

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

      const keyFilePath = `${identityRequest.identityPublicKey}/keys/root/${identityRequest.walletAddress}`;
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
    const normalizedCommunityDomain = normalizeDomainValue(communityId);
    const rawCustomDomain = getString(customDomain);
    const normalizedCustomDomain = normalizeDomainValue(rawCustomDomain);

    if (rawCustomDomain && !normalizedCustomDomain) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Custom domain is invalid or unsupported",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (normalizedCustomDomain && normalizedCustomDomain.endsWith(".blank.space")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Custom domain cannot be a blank.space subdomain",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      normalizedCustomDomain &&
      normalizedCommunityDomain &&
      normalizedCustomDomain === normalizedCommunityDomain
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Custom domain must be different from the blank.space subdomain",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (normalizedCustomDomain) {
      const { data: existingDomain } = await supabase
        .from("community_domains")
        .select("community_id")
        .eq("domain", normalizedCustomDomain)
        .maybeSingle();

      if (existingDomain?.community_id && existingDomain.community_id !== communityId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Custom domain is already in use by another community",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (normalizedCommunityDomain) {
      const { data: existingBlankDomain } = await supabase
        .from("community_domains")
        .select("community_id")
        .eq("domain", normalizedCommunityDomain)
        .maybeSingle();

      if (existingBlankDomain?.community_id && existingBlankDomain.community_id !== communityId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Blank.space subdomain is already in use by another community",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const communityConfigPayload = isRecord(communityConfig)
      ? {
          ...communityConfig,
          ...(normalizedCustomDomain ? { domain: normalizedCustomDomain } : {}),
        }
      : communityConfig;

    const homeSpaceName = `${communityId}-home`;
    const exploreSpaceName = `${communityId}-explore`;
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
        homeSpaceId = await findNavSpaceByName(supabase, homeSpaceName);
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

    const communityConfigObj = isRecord(communityConfigPayload)
      ? communityConfigPayload
      : {};
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
    const tokensConfig = isRecord(communityConfigObj.tokens)
      ? communityConfigObj.tokens
      : {};
    const erc20Tokens = Array.isArray(tokensConfig.erc20Tokens)
      ? tokensConfig.erc20Tokens
      : [];
    const nftTokens = Array.isArray(tokensConfig.nftTokens)
      ? tokensConfig.nftTokens
      : [];
    const communityBaseUrl = resolveCommunityBaseUrl(communityId);
    if (!communityBaseUrl) {
      console.warn("Invalid community base URL for directory fetches:", communityId);
    }

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

    const exploreTabs: Array<{ name: string; config: JsonRecord }> = [];
    const exploreTabOrder: string[] = [];
    const usedExploreTabNames = new Set<string>();
    const exploreCandidates: Array<
      | {
          type: "token" | "nft";
          baseName: string;
          settings: JsonRecord;
          idFallback: string;
          network: string;
          contractAddress: string;
          assetType: "token" | "nft";
        }
      | {
          type: "channel";
          baseName: string;
          settings: JsonRecord;
          idFallback: string;
          channelName: string;
        }
    > = [];

    erc20Tokens.forEach((token, index) => {
      if (!isRecord(token)) {
        return;
      }
      const address = getString(token.address);
      const symbol = getString(token.symbol);
      if (!address || !symbol) {
        return;
      }
      const network = normalizeTokenNetwork(
        getString(token.network),
        EXPLORE_DEFAULT_NETWORK,
      );
      exploreCandidates.push({
        type: "token",
        baseName: sanitizeTabKey(symbol, `Token ${index + 1}`),
        settings: buildTokenDirectorySettings(address, "token", network),
        idFallback: `token-${index + 1}`,
        network,
        contractAddress: address,
        assetType: "token",
      });
    });

    nftTokens.forEach((token, index) => {
      if (!isRecord(token)) {
        return;
      }
      const address = getString(token.address);
      if (!address) {
        return;
      }
      const collectionName =
        getString(token.name) ??
        getString(token.symbol) ??
        `Collection ${index + 1}`;
      const network = normalizeTokenNetwork(
        getString(token.network),
        EXPLORE_DEFAULT_NETWORK,
      );
      exploreCandidates.push({
        type: "nft",
        baseName: sanitizeTabKey(collectionName, `Collection ${index + 1}`),
        settings: buildTokenDirectorySettings(address, "nft", network),
        idFallback: `collection-${index + 1}`,
        network,
        contractAddress: address,
        assetType: "nft",
      });
    });

    const normalizedChannel = farcaster?.trim().replace(/^\/+/, "") ?? null;
    if (normalizedChannel) {
      exploreCandidates.push({
        type: "channel",
        baseName: sanitizeTabKey(normalizedChannel, "Channel"),
        settings: buildChannelDirectorySettings(normalizedChannel),
        idFallback: `channel-${exploreCandidates.length + 1}`,
        channelName: normalizedChannel,
      });
    }

    const fetchedCandidates = await Promise.all(
      exploreCandidates.map(async (candidate) => {
        if (!communityBaseUrl) {
          return null;
        }
        const data =
          candidate.type === "channel"
            ? await fetchChannelDirectoryData(communityBaseUrl, candidate.channelName)
            : await fetchTokenDirectoryData(
                communityBaseUrl,
                candidate.network,
                candidate.contractAddress,
                candidate.assetType,
              );
        if (!data) {
          return null;
        }
        return { ...candidate, data };
      }),
    );
    const readyCandidates = fetchedCandidates.filter(
      (candidate): candidate is NonNullable<typeof candidate> => !!candidate,
    );

    const nameCounts = new Map<string, number>();
    readyCandidates.forEach((candidate) => {
      const key = candidate.baseName.toLowerCase();
      nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    });

    readyCandidates.forEach((candidate) => {
      const key = candidate.baseName.toLowerCase();
      const needsSuffix = (nameCounts.get(key) ?? 0) > 1;
      const suffix =
        candidate.type === "token"
          ? "Token"
          : candidate.type === "nft"
          ? "NFT"
          : "channel";
      const baseName = needsSuffix
        ? `${candidate.baseName} ${suffix}`
        : candidate.baseName;
      const tabName = uniqueTabName(baseName, usedExploreTabNames);
      const idSuffix = slugify(tabName, candidate.idFallback);
      exploreTabs.push({
        name: tabName,
        config: buildExploreTabConfig(tabName, idSuffix, candidate.settings, nowIso, candidate.data),
      });
      exploreTabOrder.push(tabName);
    });

    let exploreSpaceId: string | null = null;
    let createdExploreSpace = false;
    const shouldCreateExplore = exploreTabs.length > 0;

    if (shouldCreateExplore) {
      exploreSpaceId = getExploreNavSpaceId(navigationConfig);

      if (exploreSpaceId) {
        try {
          const exists = await spaceIdExists(supabase, exploreSpaceId);
          if (!exists) {
            exploreSpaceId = null;
          }
        } catch (error) {
          console.error("Error checking explore spaceId:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Failed to validate explore spaceId",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      if (!exploreSpaceId) {
        try {
          exploreSpaceId = await findNavSpaceByName(supabase, exploreSpaceName);
        } catch (error) {
          console.error("Error looking up explore space:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Failed to resolve explore space",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      if (!exploreSpaceId) {
        const { data: insertedSpace, error: insertSpaceError } = await supabase
          .from("spaceRegistrations")
          .insert({
            fid: null,
            spaceName: exploreSpaceName,
            spaceType: "navPage",
            identityPublicKey,
            signature: "not applicable, machine generated file",
            timestamp: nowIso,
          })
          .select("spaceId")
          .maybeSingle();

        if (insertSpaceError || !insertedSpace?.spaceId) {
          console.error("Error creating explore space:", insertSpaceError);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Failed to create explore space",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        exploreSpaceId = insertedSpace.spaceId;
        createdExploreSpace = true;
      }

      if (!exploreSpaceId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Explore space ID is missing after creation",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const shouldSeedExplore =
        createdExploreSpace || !(await spaceHasTabs(supabase, exploreSpaceId));

      if (shouldSeedExplore) {
        try {
          for (const tab of exploreTabs) {
            await uploadTabFile(
              supabase,
              exploreSpaceId,
              tab.name,
              tab.config,
              identityPublicKey,
              nowIso,
            );
          }
          await uploadTabOrder(
            supabase,
            exploreSpaceId,
            exploreTabOrder,
            identityPublicKey,
            nowIso,
          );
        } catch (error) {
          console.error("Error uploading explore space files:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Failed to upload explore space files",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    const navigationConfigWithHome = ensureHomeNavItem(
      navigationConfig,
      homeSpaceId,
    );
    const navigationConfigFinal =
      shouldCreateExplore && exploreSpaceId
        ? ensureExploreNavItem(navigationConfigWithHome, exploreSpaceId)
        : navigationConfigWithHome;

    const normalizedAdminEmail = getString(adminEmail);
    const upsertPayload: Record<string, unknown> = {
      community_id: communityId,
      brand_config: brandConfig,
      assets_config: assetsConfig,
      community_config: communityConfigPayload,
      fidgets_config: fidgetsConfig,
      navigation_config: navigationConfigFinal,
      ui_config: uiConfig,
      is_published: true,
      admin_identity_public_keys: adminKeys,
      updated_at: nowIso,
    };

    if (typeof customDomainAuthorized === "boolean") {
      upsertPayload.custom_domain_authorized = customDomainAuthorized;
    }

    if (normalizedAdminEmail) {
      upsertPayload.admin_email = normalizedAdminEmail;
    }

    const { data: configData, error: configError } = await supabase
      .from("community_configs")
      .upsert(upsertPayload, {
        onConflict: "community_id",
      })
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

    const domainRows: Array<{
      community_id: string;
      domain: string;
      domain_type: string;
      updated_at: string;
    }> = [];

    if (normalizedCommunityDomain) {
      domainRows.push({
        community_id: communityId,
        domain: normalizedCommunityDomain,
        domain_type: normalizedCommunityDomain.endsWith(".blank.space")
          ? "blank_subdomain"
          : "custom",
        updated_at: nowIso,
      });
    }

    if (normalizedCustomDomain) {
      domainRows.push({
        community_id: communityId,
        domain: normalizedCustomDomain,
        domain_type: "custom",
        updated_at: nowIso,
      });
    }

    if (domainRows.length > 0) {
      const { error: domainError } = await supabase
        .from("community_domains")
        .upsert(domainRows, { onConflict: "community_id,domain_type" });

      if (domainError) {
        console.error("Error saving community domain mappings:", domainError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to save community domain mappings",
            details: domainError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
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
