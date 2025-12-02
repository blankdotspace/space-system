import { WEBSITE_URL } from "@/constants/app";
import React from "react";
import "@/styles/globals.css";
import '@coinbase/onchainkit/styles.css';
import Providers from "@/common/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { loadSystemConfig } from "@/config";
import ClientMobileHeaderWrapper from "@/common/components/organisms/ClientMobileHeaderWrapper";
import ClientSidebarWrapper from "@/common/components/organisms/ClientSidebarWrapper";
import type { Metadata } from 'next' // Migrating next/head

// Generate metadata dynamically (async)
export async function generateMetadata(): Promise<Metadata> {
  const config = await loadSystemConfig();
  
  const defaultFrame = {
    version: "next",
    imageUrl: `${WEBSITE_URL}${config.assets.logos.og}`,
    button: {
      title: config.brand.name,
      action: {
        type: "launch_frame",
        url: WEBSITE_URL,
        name: config.brand.displayName,
        splashImageUrl: `${WEBSITE_URL}${config.assets.logos.splash}`,
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
      images: {
        url: `${WEBSITE_URL}${config.assets.logos.og}`,
        type: "image/png",
        width: 1200,
        height: 737,
      },
      url: WEBSITE_URL,
    },
    icons: {
      icon: [
        {
          url: config.assets.logos.favicon,
        },
        {
          url: "/images/favicon-32x32.png",
          sizes: "32x32",
        },
        {
          url: "/images/favicon-16x16.png",
          sizes: "16x16",
        },
      ],
      // Apple touch icon should be a PNG; configs provide a valid PNG path now
      apple: config.assets.logos.appleTouch,
    },
    other: {
      "fc:frame": JSON.stringify(defaultFrame),
    },
  };
}

// TO DO: Add global cookie check for a signature of a timestamp (within the last minute)
// And a public key. If valid, we can prerender as if it is that user signed in
// This will allow us to prerender some logged in state since we will know what user it is

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SpeedInsights />
        <Providers>{sidebarLayout(children)}</Providers>
      </body>
    </html>
  );
}

const sidebarLayout = (page: React.ReactNode) => {
  return (
    <>
      <div className="min-h-screen max-w-screen w-screen flex flex-col">
        {/* App Navigation Bar */}
        <div className="w-full flex-shrink-0 md:hidden">
          <ClientMobileHeaderWrapper />
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex w-full h-full flex-grow">
          <div className="transition-all duration-100 ease-out z-50 hidden md:block flex-shrink-0">
            <ClientSidebarWrapper />
          </div>
          {page}
        </div>
      </div>
    </>
  );
};