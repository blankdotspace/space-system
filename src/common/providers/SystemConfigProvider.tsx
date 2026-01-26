"use client";

import React, { createContext, useContext } from "react";
import { SystemConfig } from "@/config";

const SystemConfigContext = createContext<SystemConfig | null>(null);

export const SystemConfigProvider: React.FC<{
  children: React.ReactNode;
  systemConfig: SystemConfig;
}> = ({ children, systemConfig }) => {
  return (
    <SystemConfigContext.Provider value={systemConfig}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = (): SystemConfig => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error("useSystemConfig must be used within SystemConfigProvider");
  }
  return context;
};

export default SystemConfigProvider;
