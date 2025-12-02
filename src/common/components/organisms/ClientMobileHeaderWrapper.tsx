"use client";

import React from "react";
import MobileHeader from "./MobileHeader";
import { SystemConfig } from "@/config";

type ClientMobileHeaderWrapperProps = {
  systemConfig: SystemConfig;
};

export const ClientMobileHeaderWrapper: React.FC<ClientMobileHeaderWrapperProps> = React.memo(
  function ClientMobileHeaderWrapper({ systemConfig }) {
    return <MobileHeader systemConfig={systemConfig} />;
  }
);

export default ClientMobileHeaderWrapper;
