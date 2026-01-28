import {
  AuthenticatorManager,
  useAuthenticatorManager,
} from "@/authenticators/AuthenticatorManager";
import { useAppStore } from "@/common/data/stores/app";
import { HubError, SignatureScheme, Signer } from "@farcaster/core";
import { bytesToHex } from "@noble/ciphers/utils";
import { indexOf } from "lodash";
import { err, ok } from "neverthrow";
import { useCallback, useEffect, useState } from "react";

export const FARCASTER_AUTHENTICATOR_NAME = "farcaster:nounspace";

const createFarcasterSignerFromAuthenticatorManager = async (
  authenticatorManager: AuthenticatorManager,
  fidgetId: string,
  authenticatorName: string = "farcaster:nounspace",
): Promise<Signer> => {
  // First verify the authenticator is ready
  const initializedAuths = await authenticatorManager.getInitializedAuthenticators();
  const isReady = indexOf(initializedAuths, authenticatorName) !== -1;
  
  if (!isReady) {
    console.log("[createFarcasterSigner] Authenticator not ready, returning NONE scheme");
    return {
      scheme: SignatureScheme.NONE,
      getSignerKey: async () => err(new HubError("unavailable", { message: "Authenticator not initialized" })),
      signMessageHash: async () => err(new HubError("unavailable", { message: "Authenticator not initialized" })),
    };
  }

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
  
  // Only verify we can get the public key if explicitly requested (to avoid extra calls)
  let canGetKey = scheme !== SignatureScheme.NONE;
  if (scheme !== SignatureScheme.NONE) {
    try {
      const testKeyResult = await authenticatorManager.callMethod({
        requestingFidgetId: fidgetId,
        authenticatorId: authenticatorName,
        methodName: "getSignerPublicKey",
        isLookup: true,
      });
      canGetKey = testKeyResult.result === "success";
      if (!canGetKey) {
        console.log("[createFarcasterSigner] Cannot get public key, signer not fully ready", {
          result: testKeyResult.result,
          reason: testKeyResult.result === "error" ? testKeyResult.reason : undefined,
          value: testKeyResult.result === "error" && testKeyResult.reason === "failed" ? testKeyResult.value : undefined,
        });
      } else {
        console.log("[createFarcasterSigner] Successfully got public key, signer is ready!");
      }
    } catch (error) {
      console.log("[createFarcasterSigner] Error testing public key access:", error);
      canGetKey = false;
    }
  }

  return {
    scheme: canGetKey ? scheme : SignatureScheme.NONE,
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
      const errorMessage = methodResult.result === "error" && methodResult.reason === "failed" && methodResult.value
        ? (methodResult.value instanceof Error ? methodResult.value.message : String(methodResult.value))
        : "Failed to get signer public key";
      return err(new HubError("unavailable", { 
        message: errorMessage
      }));
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
      const errorMessage = methodResult.result === "error" && methodResult.reason === "failed" && methodResult.value
        ? (methodResult.value instanceof Error ? methodResult.value.message : String(methodResult.value))
        : "Failed to sign message";
      return err(new HubError("unavailable", { 
        message: errorMessage
      }));
    },
  };
};

export function useFarcasterSigner(
  fidgetId: string,
  authenticatorName: string = "farcaster:nounspace",
) {
  const authenticatorManager = useAuthenticatorManager();
  const { currentIdentityFids, registerFidForCurrentIdentity, loadFids, currentSpaceIdentityPublicKey } =
    useAppStore((state) => ({
      currentIdentityFids:
        state.account.getCurrentIdentity()?.associatedFids || [],
      registerFidForCurrentIdentity: state.account.registerFidForCurrentIdentity,
      loadFids: state.account.getFidsForCurrentIdentity,
      currentSpaceIdentityPublicKey: state.account.currentSpaceIdentityPublicKey,
    }));
  const [hasRequestedSigner, setHasRequestedSigner] = useState(false);
  const [isLoadingSigner, setIsLoadingSigner] = useState(false);
  const [signer, setSigner] = useState<Signer>();
  const [fid, setFid] = useState(-1);
  const [hasCheckedInitialState, setHasCheckedInitialState] = useState(false);
  const [hasAttemptedDirectLoad, setHasAttemptedDirectLoad] = useState(false);
  
  const requestSignerAuthorization = useCallback(async () => {
    setHasRequestedSigner(true);
    setIsLoadingSigner(true);
    try {
      await authenticatorManager.installAuthenticators([authenticatorName]);
      authenticatorManager.initializeAuthenticators([authenticatorName]);
    } catch (error) {
      console.error("[useFarcasterSigner] Error requesting signer authorization:", error);
      setIsLoadingSigner(false);
    }
  }, [authenticatorManager, authenticatorName]);

  const [hasLoadedFids, setHasLoadedFids] = useState(false);

  useEffect(() => {
    if (currentIdentityFids.length > 0) {
      setFid(currentIdentityFids[0]);
      setHasLoadedFids(true);
    } else if (!hasLoadedFids && currentSpaceIdentityPublicKey) {
      // Try to load FIDs only once if not already loaded and identity exists
      loadFids()
        .then(() => setHasLoadedFids(true))
        .catch((error) => {
          console.error("[useFarcasterSigner] Failed to load FIDs:", error);
          setHasLoadedFids(true); // Mark as loaded even on error to prevent infinite retry
        });
    }
    // Intentionally omit loadFids from dependencies to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdentityFids.length, currentSpaceIdentityPublicKey, hasLoadedFids]);

  // Check if signer is already initialized on mount or when FID becomes available
  useEffect(() => {
    // Skip if we already have a valid signer
    if (signer && signer.scheme !== 0) {
      return;
    }
    
    // Check if we should verify signer (either first time or when FID is available)
    // But don't retry direct load if we already attempted it
    const shouldCheck = !hasCheckedInitialState || (fid > 0 && !signer && !isLoadingSigner && !hasAttemptedDirectLoad);
    
    if (!shouldCheck) return;
    
    // Prevent multiple simultaneous checks
    if (isLoadingSigner) return;
    
    const checkAndLoadSigner = async () => {
      setIsLoadingSigner(true);
      try {
        const initializedAuths = await authenticatorManager.getInitializedAuthenticators();
        const ready = indexOf(initializedAuths, FARCASTER_AUTHENTICATOR_NAME) !== -1;
        
        if (!hasCheckedInitialState) {
          setHasCheckedInitialState(true);
        }
        
        if (ready) {
          console.log("[useFarcasterSigner] Signer already initialized, loading it");
          // Signer is already initialized, load it
          setIsLoadingSigner(false);
          const newSigner = await createFarcasterSignerFromAuthenticatorManager(
            authenticatorManager,
            fidgetId,
            authenticatorName,
          );
          console.log("[useFarcasterSigner] Signer loaded, scheme:", newSigner.scheme);
          setSigner(newSigner);
          // Also check if signer scheme is valid
          if (newSigner.scheme !== 0) {
            setHasRequestedSigner(true);
          }
          // Only try to get FID from signer if we don't already have one
          if (fid < 0) {
            const methodResult = await authenticatorManager.callMethod({
              requestingFidgetId: fidgetId,
              authenticatorId: FARCASTER_AUTHENTICATOR_NAME,
              methodName: "getAccountFid",
              isLookup: true,
            });
            if (methodResult.result === "success") {
              console.log("[useFarcasterSigner] FID loaded from signer:", methodResult.value);
              setFid(methodResult.value as number);
            } else {
              setFid(-1);
            }
          }
        } else if (fid > 0 && !hasRequestedSigner && !hasAttemptedDirectLoad) {
          // We have a FID but signer is not in initialized list
          // Try to create signer directly first - it might work if authenticator is installed
          // Mark that we've attempted this to avoid infinite loops
          setHasAttemptedDirectLoad(true);
          console.log("[useFarcasterSigner] FID available but signer not in initialized list, attempting to load directly");
          try {
            const newSigner = await createFarcasterSignerFromAuthenticatorManager(
              authenticatorManager,
              fidgetId,
              authenticatorName,
            );
            console.log("[useFarcasterSigner] Signer created directly, scheme:", newSigner.scheme);
            // Always set the signer, even if scheme is 0, to prevent infinite loops
            setSigner(newSigner);
            if (newSigner.scheme !== 0) {
              setHasRequestedSigner(true);
              setIsLoadingSigner(false);
            } else {
              // Signer exists but needs initialization - don't do it automatically
              // User must explicitly call requestSignerAuthorization()
              setIsLoadingSigner(false);
            }
          } catch (error) {
            console.log("[useFarcasterSigner] Could not create signer directly, needs initialization:", error);
            setIsLoadingSigner(false);
          }
        } else {
          console.log("[useFarcasterSigner] Signer not initialized yet and no FID available");
        }
      } catch (error) {
        console.error("[useFarcasterSigner] Error checking signer:", error);
      } finally {
        setIsLoadingSigner(false);
      }
    };
    
    checkAndLoadSigner();
  }, [authenticatorManager, authenticatorName, fidgetId, hasCheckedInitialState, fid, hasAttemptedDirectLoad]);

  // Check for signer when authenticator becomes ready (listen to lastUpdatedAt changes, no polling)
  useEffect(() => {
    if (!hasRequestedSigner) return;
    if (signer && signer.scheme !== 0) return;
    
    let cancelled = false;
    
    const checkSigner = async () => {
      if (cancelled) return;
      
      try {
        const initializedAuths = await authenticatorManager.getInitializedAuthenticators();
        if (cancelled) return;
        
        const ready = indexOf(initializedAuths, FARCASTER_AUTHENTICATOR_NAME) !== -1;
        
        if (ready) {
          const newSigner = await createFarcasterSignerFromAuthenticatorManager(
            authenticatorManager,
            fidgetId,
            authenticatorName,
          );
          
          if (!cancelled) {
            setSigner(newSigner);
            setIsLoadingSigner(false);
            
            if (newSigner.scheme !== 0 && fid < 0) {
              const methodResult = await authenticatorManager.callMethod({
                requestingFidgetId: fidgetId,
                authenticatorId: FARCASTER_AUTHENTICATOR_NAME,
                methodName: "getAccountFid",
                isLookup: true,
              });
              if (methodResult.result === "success") {
                setFid(methodResult.value as number);
              }
            }
          }
        }
      } catch (error) {
        console.error("[useFarcasterSigner] Error checking signer:", error);
        if (!cancelled) {
          setIsLoadingSigner(false);
        }
      }
    };
    
    // Check when hasRequestedSigner changes or when authenticatorManager updates
    checkSigner();
    
    return () => {
      cancelled = true;
    };
  }, [
    authenticatorManager.lastUpdatedAt,
    authenticatorName,
    fidgetId,
    hasRequestedSigner,
    signer?.scheme,
    fid,
  ]);

  const [hasSyncedFid, setHasSyncedFid] = useState(false);

  useEffect(() => {
    // Don't sync if already synced, no signer, invalid signer, or FID not available
    if (!hasRequestedSigner || !signer || fid < 0 || hasSyncedFid) return;
    if (signer.scheme === 0) return;
    // Don't sync if no current identity
    if (!currentSpaceIdentityPublicKey) return;
    
    // Don't sync if FID is already in currentIdentityFids
    if (currentIdentityFids.includes(fid)) {
      setHasSyncedFid(true);
      return;
    }

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
          try {
            await registerFidForCurrentIdentity(
              fid,
              bytesToHex(publicKeyResult.value as Uint8Array),
              signForFid,
            );
            setHasSyncedFid(true);
          } catch (registerError) {
            console.error("[useFarcasterSigner] Error registering FID:", registerError);
            setHasSyncedFid(true); // Mark as synced even on error to prevent infinite retry
          }
        }
      } catch (error) {
        console.error("[useFarcasterSigner] Error syncing FID registration:", error);
        setHasSyncedFid(true); // Mark as synced even on error to prevent infinite retry
      }
    };

    syncFidRegistration();
  }, [
    authenticatorManager,
    fid,
    fidgetId,
    hasRequestedSigner,
    hasSyncedFid,
    signer?.scheme,
    currentIdentityFids,
    currentSpaceIdentityPublicKey,
  ]);

  return {
    authenticatorManager,
    isLoadingSigner,
    signer,
    fid,
    requestSignerAuthorization,
  };
}
