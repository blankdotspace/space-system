import { useAppStore } from "@/common/data/stores/app";
import { RECHECK_INITIAL_TIME } from "@/common/data/stores/app/setup";
import React from "react";
import { Button } from "@/common/components/atoms/button";

export default function NogsChecker() {
  const { setRecheckTimerLength, setShouldRecheck, isChecking } = useAppStore(
    (state) => ({
      setRecheckTimerLength: state.setup.setNogsRecheckTimerLength,
      setShouldRecheck: state.setup.setNogsShouldRecheck,
      isChecking: state.setup.nogsIsChecking,
      recheckCountDown: state.setup.nogsRecheckCountDown,
    }),
  );

  async function userTriggeredRecheck() {
    setRecheckTimerLength(RECHECK_INITIAL_TIME);
    setShouldRecheck(true);
  }

  return (
    <>
      <p className="mb-2">
        Premium features like the vibe editor, AI background generation, and cast
        enhancements are reserved for supporters who hold the configured gate tokens
        (one eligible NFT or at least 1,111 of an eligible ERC20). If your community
        has not set custom gate tokens yet, the legacy nOGs NFT or $SPACE ERC20
        fallback applies.
      </p>
      <Button disabled={isChecking} onClick={userTriggeredRecheck}>
        {isChecking ? "Checking your access" : "Check access"}
      </Button>
    </>
  );
}
