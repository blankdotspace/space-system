import React from "react";
import "@/styles/globals.css";
import '@coinbase/onchainkit/styles.css';
import Providers from "@/common/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { loadSystemConfig, SystemConfig } from "@/config";
import ClientMobileHeaderWrapper from "@/common/components/organisms/ClientMobileHeaderWrapper";
import ClientSidebarWrapper from "@/common/components/organisms/ClientSidebarWrapper";
import type { Metadata } from 'next' // Migrating next/head
import { extractFontFamilyFromUrl } from "@/common/lib/utils/fontUtils";
import { resolveBaseUrl } from "@/common/lib/utils/resolveBaseUrl";
import { resolveAssetUrl } from "@/common/lib/utils/resolveAssetUrl";

const TRUSTED_STYLESHEET_HOSTS = new Set(["fonts.googleapis.com"]);

function validateStylesheetUrl(stylesheetUrl?: string | null): string | null {
  if (!stylesheetUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(stylesheetUrl);
    if (parsedUrl.protocol !== "https:") {
      console.warn("Rejected non-https UI stylesheet URL", { stylesheetUrl });
      return null;
    }

    if (!TRUSTED_STYLESHEET_HOSTS.has(parsedUrl.hostname)) {
      console.warn("Rejected untrusted UI stylesheet URL", {
        stylesheetUrl,
        hostname: parsedUrl.hostname,
      });
      return null;
    }

    return parsedUrl.toString();
  } catch (error) {
    console.warn("Failed to parse UI stylesheet URL", { stylesheetUrl, error });
    return null;
  }
}

// Force dynamic rendering so metadata is generated at request time (not build time)
// This ensures metadata matches the actual domain/community config at runtime
export const dynamic = 'force-dynamic';

// Generate metadata dynamically at request time (not build time)
// This ensures metadata matches the actual domain/community config
export async function generateMetadata(): Promise<Metadata> {
  const config = await loadSystemConfig();
  const baseUrl = resolveBaseUrl({ systemConfig: config });
  const ogImageUrl = resolveAssetUrl(config.assets.logos.og, baseUrl) ?? config.assets.logos.og;
  const splashImageUrl =
    resolveAssetUrl(config.assets.logos.splash, baseUrl) ?? config.assets.logos.splash;
  const communityOgUrl = `${baseUrl}/api/metadata/community`;
  
  const defaultFrame = {
    version: "next",
    imageUrl: ogImageUrl,
    button: {
      title: config.brand.displayName,
      action: {
        type: "launch_frame",
        url: baseUrl,
        name: config.brand.displayName,
        splashImageUrl,
        splashBackgroundColor: "#FFFFFF",
      }
    }
  };

  return {
    title: config.brand.displayName,
    description: config.brand.description,
    openGraph: {
      siteName: config.brand.displayName,
      title: config.brand.displayName,
      type: "website",
      description: config.brand.description,
      images: [
        {
          url: communityOgUrl,
          width: 1200,
          height: 630,
        },
        {
          url: ogImageUrl,
          type: "image/png",
          width: 1200,
          height: 737,
        },
      ],
      url: baseUrl,
    },
    icons: {
      icon: [
        {
          url: resolveAssetUrl(config.assets.logos.favicon, baseUrl) ?? config.assets.logos.favicon,
        },
        {
          url: resolveAssetUrl("/images/favicon-32x32.png", baseUrl) ?? "/images/favicon-32x32.png",
          sizes: "32x32",
        },
        {
          url: resolveAssetUrl("/images/favicon-16x16.png", baseUrl) ?? "/images/favicon-16x16.png",
          sizes: "16x16",
        },
      ],
      // Apple touch icon should be a PNG; configs provide a valid PNG path now
      apple:
        resolveAssetUrl(config.assets.logos.appleTouch, baseUrl) ??
        config.assets.logos.appleTouch,
    },
    other: {
      "fc:frame": JSON.stringify(defaultFrame),
    },
  };
}

// TO DO: Add global cookie check for a signature of a timestamp (within the last minute)
// And a public key. If valid, we can prerender as if it is that user signed in
// This will allow us to prerender some logged in state since we will know what user it is

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemConfig = await loadSystemConfig();
  const validatedUiStylesheet = validateStylesheetUrl(systemConfig.ui?.url);
  const navFontFamily = extractFontFamilyFromUrl(validatedUiStylesheet ?? undefined);
  const navFontStack =
    navFontFamily
      ? `${navFontFamily}, var(--font-sans, Inter, system-ui, -apple-system, sans-serif)`
      : "var(--font-sans, Inter, system-ui, -apple-system, sans-serif)";
  const navFontColor = systemConfig.ui?.fontColor || "#0f172a";
  const castButtonFontColor =
    systemConfig.ui?.castButton?.fontColor ||
    systemConfig.ui?.castButtonFontColor ||
    "#ffffff";
  const navBackgroundColor = systemConfig.ui?.backgroundColor || "#ffffff";
  const castButtonBackgroundColor =
    systemConfig.ui?.castButton?.backgroundColor ||
    systemConfig.ui?.primaryColor ||
    "rgb(37, 99, 235)";
  const castButtonHoverColor =
    systemConfig.ui?.castButton?.hoverColor ||
    systemConfig.ui?.primaryHoverColor ||
    "rgb(29, 78, 216)";
  const castButtonActiveColor =
    systemConfig.ui?.castButton?.activeColor ||
    systemConfig.ui?.primaryActiveColor ||
    "rgb(30, 64, 175)";
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {validatedUiStylesheet && (
          <link rel="stylesheet" href={validatedUiStylesheet} />
        )}
      </head>
      <body
        style={
          {
            ["--ns-nav-font" as string]: navFontStack,
            ["--ns-nav-font-color" as string]: navFontColor,
            ["--ns-cast-button-font-color" as string]: castButtonFontColor,
            ["--ns-background-color" as string]: navBackgroundColor,
            ["--ns-cast-button-background-color" as string]: castButtonBackgroundColor,
            ["--ns-cast-button-hover-color" as string]: castButtonHoverColor,
            ["--ns-cast-button-active-color" as string]: castButtonActiveColor,
          } as React.CSSProperties
        }
      >
        <SpeedInsights />
        <Providers>{sidebarLayout(children, systemConfig)}</Providers>
      </body>
    </html>
  );
}

const sidebarLayout = (page: React.ReactNode, systemConfig: SystemConfig) => {
  return (
    <>
      <div className="min-h-screen max-w-screen w-screen flex flex-col">
        {/* App Navigation Bar */}
        <div className="w-full flex-shrink-0 md:hidden">
          <ClientMobileHeaderWrapper systemConfig={systemConfig} />
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex w-full h-full flex-grow">
          <div className="transition-all duration-100 ease-out z-50 hidden md:block flex-shrink-0">
            <ClientSidebarWrapper systemConfig={systemConfig} />
          </div>
          {page}
        </div>
      </div>
    </>
  );
};
