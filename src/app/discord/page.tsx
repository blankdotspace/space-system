import React from "react";
import { loadSystemConfig } from "@/config";
import DiscordRedirect from "./DiscordRedirect";

// Force dynamic rendering - config loading requires request context
export const dynamic = "force-dynamic";

export default async function DiscordPage() {
  const config = await loadSystemConfig();
  const discordUrl = config?.community?.urls?.discord;

  return <DiscordRedirect discordUrl={discordUrl} />;
}
