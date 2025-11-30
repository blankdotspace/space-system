import { redirect } from "next/navigation";
import { loadSystemConfig } from "@/config";

export default function RootRedirect() {
  const config = loadSystemConfig();
  
  // If homePage exists (legacy config), redirect to its default tab
  if (config.homePage?.defaultTab) {
    const tab = encodeURIComponent(config.homePage.defaultTab);
    redirect(`/home/${tab}`);
    return null;
  }
  
  // Otherwise, redirect to /home and let the navigation handler figure out the default tab
  redirect('/home');
  return null;
}


