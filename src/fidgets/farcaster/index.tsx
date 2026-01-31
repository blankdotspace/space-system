import { AuthenticatorManager, useAuthenticatorManager } from "@/authenticators/AuthenticatorManager";
import { HubError, SignatureScheme, Signer } from "@farcaster/core";
import { indexOf } from "lodash";
import { err, ok } from "neverthrow";
import { useEffect, useState } from "react";
import { useAppStore } from "@/common/data/stores/app";
import useCurrentFid from "@/common/lib/hooks/useCurrentFid";
import { waitForAuthenticatorReady } from "@/common/lib/authenticators/waitForAuthenticatorReady";

export const FARCASTER_AUTHENTICATOR_NAME = "farcaster:nounspace";

const createFarcasterSignerFromAuthenticatorManager = async (
  authenticatorManager: AuthenticatorManager,
  fidgetId: string,
  authenticatorName: string = "farcaster:nounspace"
): Promise<Signer> => {
  const schemeResult = await authenticatorManager.callMethod({
    requestingFidgetId: fidgetId,
    authenticatorId: authenticatorName,
    methodName: "getSignerScheme",
    isLookup: true,
  });
  const scheme = schemeResult.result === "success" ? (schemeResult.value as SignatureScheme) : SignatureScheme.NONE;
  return {
    scheme,
    getSignerKey: async () => {
      const methodResult = await authenticatorManager.callMethod({
        requestingFidgetId: fidgetId,
        authenticatorId: authenticatorName,
        methodName: "getSignerPublicKey",
        isLookup: true,
      });
      if (methodResult.result === "success") {
        return ok(methodResult.value as Uint8Array);
      }
      return err(new HubError("unknown", {}));
    },
    signMessageHash: async (hash: Uint8Array) => {
      const methodResult = await authenticatorManager.callMethod(
        {
          requestingFidgetId: fidgetId,
          authenticatorId: authenticatorName,
          methodName: "signMessage",
          isLookup: false,
        },
        hash
      );
      if (methodResult.result === "success") {
        return ok(methodResult.value as Uint8Array);
      }
      return err(new HubError("unknown", {}));
    },
  };
};

export function useFarcasterSigner(fidgetId: string, authenticatorName: string = "farcaster:nounspace") {
  const authenticatorManager = useAuthenticatorManager();
  const [isLoadingSigner, setIsLoadingSigner] = useState(false);
  const [hasSigner, setHasSigner] = useState(false);
  const currentFid = useCurrentFid();
  const { setModalOpen, isAuthenticatorInstalled } = useAppStore((state) => ({
    setModalOpen: state.setup.setModalOpen,
    isAuthenticatorInstalled: !!state.account.authenticatorConfig[FARCASTER_AUTHENTICATOR_NAME],
  }));

  const ensureSigner = async () => {
    if (!isAuthenticatorInstalled) {
      await authenticatorManager.installAuthenticators([FARCASTER_AUTHENTICATOR_NAME]);
      authenticatorManager.initializeAuthenticators([FARCASTER_AUTHENTICATOR_NAME]);
    } else {
      authenticatorManager.initializeAuthenticators([FARCASTER_AUTHENTICATOR_NAME]);
    }
    setModalOpen(true);

    setIsLoadingSigner(true);
    try {
      const ready = await waitForAuthenticatorReady(authenticatorManager, FARCASTER_AUTHENTICATOR_NAME);
      if (ready) {
        setHasSigner(true);
        return true;
      }
      return false;
    } finally {
      setIsLoadingSigner(false);
    }
  };

  const getOrCreateSigner = async (): Promise<Signer | null> => {
    if (!hasSigner) {
      const ok = await ensureSigner();
      if (!ok) return null;
    }
    // Always create a fresh signer bound to the current authenticatorManager instance.
    return createFarcasterSignerFromAuthenticatorManager(authenticatorManager, fidgetId, authenticatorName);
  };

  useEffect(() => {
    authenticatorManager
      .getInitializedAuthenticators()
      .then((initilizedAuths) => setHasSigner(indexOf(initilizedAuths, FARCASTER_AUTHENTICATOR_NAME) !== -1));
  }, [authenticatorManager.lastUpdatedAt]);
  const [signer, setSigner] = useState<Signer>();
  useEffect(() => {
    if (!hasSigner) {
      setSigner(undefined);
      return;
    }
    createFarcasterSignerFromAuthenticatorManager(authenticatorManager, fidgetId, authenticatorName).then((signer) =>
      setSigner(signer)
    );
  }, [authenticatorManager.lastUpdatedAt, hasSigner, authenticatorManager, fidgetId, authenticatorName]);
  const [fid, setFid] = useState(-1);
  useEffect(() => {
    if (!hasSigner) {
      setFid(currentFid ?? -1);
      return;
    }
    authenticatorManager
      .callMethod({
        requestingFidgetId: fidgetId,
        authenticatorId: FARCASTER_AUTHENTICATOR_NAME,
        methodName: "getAccountFid",
        isLookup: true,
      })
      .then((methodResult) => {
        if (methodResult.result === "success") return setFid(methodResult.value as number);
        return setFid(currentFid ?? -1);
      });
  }, [authenticatorManager.lastUpdatedAt, hasSigner, authenticatorManager, fidgetId, currentFid]);

  return {
    authenticatorManager,
    isLoadingSigner,
    signer,
    fid,
    hasSigner,
    ensureSigner,
    getOrCreateSigner,
  };
}
