import {
  AuthenticatorManager,
  useAuthenticatorManager,
} from "@/authenticators/AuthenticatorManager";
import { useAppStore } from "@/common/data/stores/app";
import { bytesToHex } from "@noble/ciphers/utils";
import { HubError, SignatureScheme, Signer } from "@farcaster/core";
import { indexOf } from "lodash";
import { err, ok } from "neverthrow";
import { useCallback, useEffect, useState } from "react";

export const FARCASTER_AUTHENTICATOR_NAME = "farcaster:nounspace";

const createFarcasterSignerFromAuthenticatorManager = async (
  authenticatorManager: AuthenticatorManager,
  fidgetId: string,
  authenticatorName: string = "farcaster:nounspace",
): Promise<Signer> => {
  const schemeResult = await authenticatorManager.callMethod({
    requestingFidgetId: fidgetId,
    authenticatorId: authenticatorName,
    methodName: "getSignerScheme",
    isLookup: true,
  });
  const scheme =
    schemeResult.result === "success"
      ? (schemeResult.value as SignatureScheme)
      : SignatureScheme.NONE;
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
        hash,
      );
      if (methodResult.result === "success") {
        return ok(methodResult.value as Uint8Array);
      }
      return err(new HubError("unknown", {}));
    },
  };
};

export function useFarcasterSigner(
  fidgetId: string,
  authenticatorName: string = "farcaster:nounspace",
) {
  const authenticatorManager = useAuthenticatorManager();
  const { currentIdentityFids, registerFidForCurrentIdentity, loadFids } =
    useAppStore((state) => ({
      currentIdentityFids:
        state.account.getCurrentIdentity()?.associatedFids || [],
      registerFidForCurrentIdentity: state.account.registerFidForCurrentIdentity,
      loadFids: state.account.getFidsForCurrentIdentity,
    }));
  const [hasRequestedSigner, setHasRequestedSigner] = useState(false);
  const [isLoadingSigner, setIsLoadingSigner] = useState(false);
  const [signer, setSigner] = useState<Signer>();
  const [fid, setFid] = useState(-1);
  const requestSignerAuthorization = useCallback(async () => {
    setHasRequestedSigner(true);
    setIsLoadingSigner(true);
    try {
      await authenticatorManager.installAuthenticators([authenticatorName]);
      authenticatorManager.initializeAuthenticators([authenticatorName]);
      // Give a bit of time for the authenticator to initialize
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setIsLoadingSigner(false);
    }
  }, [authenticatorManager, authenticatorName]);

  useEffect(() => {
    if (currentIdentityFids.length > 0) {
      setFid(currentIdentityFids[0]);
    } else {
      // Try to load FIDs if not already loaded
      loadFids();
    }
  }, [currentIdentityFids, loadFids]);

  useEffect(() => {
    if (!hasRequestedSigner) {
      setIsLoadingSigner(false);
      return;
    }
    authenticatorManager
      .getInitializedAuthenticators()
      .then((initializedAuths) => {
        const ready = indexOf(initializedAuths, FARCASTER_AUTHENTICATOR_NAME) !== -1;
        setIsLoadingSigner(!ready);
        if (ready) {
          createFarcasterSignerFromAuthenticatorManager(
            authenticatorManager,
            fidgetId,
            authenticatorName,
          ).then((newSigner) => setSigner(newSigner));
          authenticatorManager
            .callMethod({
              requestingFidgetId: fidgetId,
              authenticatorId: FARCASTER_AUTHENTICATOR_NAME,
              methodName: "getAccountFid",
              isLookup: true,
            })
            .then((methodResult) => {
              if (methodResult.result === "success") {
                return setFid(methodResult.value as number);
              }
              return setFid(-1);
            });
        }
      });
  }, [
    authenticatorManager,
    authenticatorManager.lastUpdatedAt,
    authenticatorName,
    fidgetId,
    hasRequestedSigner,
  ]);

  useEffect(() => {
    if (!hasRequestedSigner || !signer || fid < 0) return;

    const syncFidRegistration = async () => {
    try {
      const publicKeyResult = await authenticatorManager.callMethod({
        requestingFidgetId: fidgetId,
        authenticatorId: FARCASTER_AUTHENTICATOR_NAME,
        methodName: "getSignerPublicKey",
        isLookup: true,
      });
      const signForFid = async (messageHash: Uint8Array) => {
        const signResult = await authenticatorManager.callMethod(
          {
            requestingFidgetId: fidgetId,
            authenticatorId: FARCASTER_AUTHENTICATOR_NAME,
            methodName: "signMessage",
            isLookup: false,
          },
          messageHash,
        );
        return signResult.result === "success"
          ? (signResult.value as Uint8Array)
          : new Uint8Array();
      };
      if (publicKeyResult.result === "success") {
        await registerFidForCurrentIdentity(
          fid,
          bytesToHex(publicKeyResult.value as Uint8Array),
          signForFid,
        );
        await loadFids();
        }
      } catch (error) {
        console.error("Error syncing FID registration with signer:", error);
      }
    };

    syncFidRegistration();
  }, [
    authenticatorManager,
    authenticatorManager.lastUpdatedAt,
    fid,
    fidgetId,
    hasRequestedSigner,
    loadFids,
    registerFidForCurrentIdentity,
    signer,
  ]);

  return {
    authenticatorManager,
    isLoadingSigner,
    signer,
    fid,
    requestSignerAuthorization,
  };
}
