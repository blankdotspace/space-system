"use client";

import React from "react";
import { BotIdClient } from "botid/client";
import { botIdProtectedRoutes } from "@/common/utils/botIdProtection";

export default function BotIdProtectionLoader() {
  return <BotIdClient protect={botIdProtectedRoutes} />;
}
