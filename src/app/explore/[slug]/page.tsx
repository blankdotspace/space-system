import React from "react";
import { notFound } from "next/navigation";

import { loadSystemConfig } from "@/config";
import ExploreTabPage from "../ExploreTabPage";

export async function generateStaticParams() {
  const config = loadSystemConfig();
  const tabParams = config.explorePage.tabOrder.map((tab) => ({ slug: tab }));
  return tabParams;
}

export default async function ExploreEntry({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const config = loadSystemConfig();
  const { slug } = await params;
  const tabName = decodeURIComponent(slug);

  if (!config.explorePage.tabs[tabName]) {
    notFound();
  }

  return <ExploreTabPage tabName={tabName} explorePage={config.explorePage} />;
}
