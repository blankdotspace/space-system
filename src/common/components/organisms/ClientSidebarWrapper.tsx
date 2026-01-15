"use client";

import React from "react";
import Sidebar from "./Sidebar";
import { SystemConfig } from "@/config";

type ClientSidebarWrapperProps = {
  systemConfig: SystemConfig;
};

/**
 * Client-side wrapper for Sidebar
 * This enables the server component in layout.tsx to properly use client components
 */
export const ClientSidebarWrapper: React.FC<ClientSidebarWrapperProps> = ({ systemConfig }) => {
  return <Sidebar systemConfig={systemConfig} />;
};

export default ClientSidebarWrapper;
