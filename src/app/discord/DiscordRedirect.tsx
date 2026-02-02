"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

type DiscordRedirectProps = {
  discordUrl: string | undefined;
};

export default function DiscordRedirect({ discordUrl }: DiscordRedirectProps) {
  const router = useRouter();

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
