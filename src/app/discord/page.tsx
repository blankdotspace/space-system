"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSystemConfig } from "@/common/providers/SystemConfigProvider";

export default function DiscordRedirect() {
  const router = useRouter();
  const systemConfig = useSystemConfig();
  const discordUrl = systemConfig?.community?.urls?.discord;

  useEffect(() => {
    if (discordUrl) {
      // Open Discord invite in new tab
      window.open(discordUrl, "_blank", "noopener,noreferrer");
    }
    // Redirect to home
    router.replace("/home");
  }, [discordUrl, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to Discord...</p>
    </div>
  );
}
