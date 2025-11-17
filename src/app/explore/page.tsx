import { redirect } from "next/navigation";
import { loadSystemConfig } from "@/config";

export default function ExploreRootRedirect() {
  const config = loadSystemConfig();
  const defaultTab = encodeURIComponent(config.explorePage.defaultTab);
  redirect(`/explore/${defaultTab}`);
}
