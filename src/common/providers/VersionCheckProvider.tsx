"use client";
import React, { useEffect, useRef, useState } from "react";
import axiosBackend from "../data/api/backend";
import { Button } from "../components/atoms/button";

export default function VersionCheckProivder({
  children,
}: {
  children: React.ReactNode;
}) {
  const pollTimeOut = useRef<NodeJS.Timeout | undefined>(undefined);
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const [versionsMisaligned, setVersionMisaligned] = useState(false);

  async function checkVersion() {
    setNeedsRecheck(false);
    clearTimeout(pollTimeOut.current);
    try {
      const { data } = await axiosBackend.get<{ buildId: string }>(
        "/api/buildId",
      );
      if (data.buildId !== process.env.NEXT_PUBLIC_VERSION) {
        setVersionMisaligned(true);
      }
    } catch {
      console.error("Failed to check for new version");
    } finally {
      if (!versionsMisaligned) {
        pollTimeOut.current = setTimeout(() => setNeedsRecheck(true), 100000);
      }
    }
  }

  useEffect(() => {
    if (needsRecheck) checkVersion();
  }, [needsRecheck]);

  useEffect(() => {
    checkVersion();
  }, []);

  return (
    <>
      {versionsMisaligned && (
        <div className="flex justify-center items-center align-center z-50 absolute w-full">
          <Button onClick={() => window.location.reload()}>
            A new version is available! Click to refresh
          </Button>
        </div>
      )}
      {children}
    </>
  );
}
