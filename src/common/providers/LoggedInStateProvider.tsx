"use client";
import { useAuthenticatorManager } from "@/authenticators/AuthenticatorManager";
import { useAppStore, useLogout } from "@/common/data/stores/app";
import { useSignMessage } from "@/common/data/stores/app/accounts/privyStore";
import { SetupStep } from "@/common/data/stores/app/setup";
import useValueHistory from "@/common/lib/hooks/useValueHistory";

import requiredAuthenticators from "@/constants/requiredAuthenticators";
import { FARCASTER_AUTHENTICATOR_NAME } from "@/fidgets/farcaster";
import { bytesToHex } from "@noble/ciphers/utils";
import { usePrivy } from "@privy-io/react-auth";
import { isEqual, isUndefined } from "lodash";
import React, { useEffect } from "react";
import LoginModal from "../components/templates/LoginModal";
import { AnalyticsEvent } from "../constants/analyticsEvents";
import { analytics } from "./AnalyticsProvider";

type LoggedInLayoutProps = { children: React.ReactNode };

const LoggedInStateProvider: React.FC<LoggedInLayoutProps> = ({ children }) => {
  const { ready, authenticated, user, createWallet } = usePrivy();
  const {
    currentStep,
    setCurrentStep,
    storeLoadAuthenticators,
    loadIdentitiesForWallet,
    getIdentitiesForWallet,
    createIdentityForWallet,
    decryptIdentityKeys,
    setCurrentIdentity,
    getCurrentIdentity,
    loadPreKeys,
    loadFidsForCurrentIdentity,
    registerFidForCurrentIdentity,
    modalOpen,
    setModalOpen,
    keepModalOpen,
    // wallet signatures
    isRequestingWalletSignature,
    setIsRequestingWalletSignature,
    hasNogs,
  } = useAppStore((state) => ({
    // Setup State Tracking
    currentStep: state.setup.currentStep,
    setCurrentStep: state.setup.setCurrentStep,
    // Identity Loading
    loadIdentitiesForWallet: state.account.loadIdentitiesForWallet,
    getIdentitiesForWallet: state.account.getIdentitiesForWallet,
    createIdentityForWallet: state.account.createIdentityForWallet,
    decryptIdentityKeys: state.account.decryptIdentityKeys,
    setCurrentIdentity: state.account.setCurrentIdentity,
    getCurrentIdentity: state.account.getCurrentIdentity,
    loadPreKeys: state.account.loadPreKeys,
    // Authenticator Loading
    storeLoadAuthenticators: state.account.loadAuthenitcators,
    // Register FIDs for account
    loadFidsForCurrentIdentity: state.account.getFidsForCurrentIdentity,
    registerFidForCurrentIdentity: state.account.registerFidForCurrentIdentity,
    // Logout
    modalOpen: state.setup.modalOpen,
    setModalOpen: state.setup.setModalOpen,
    keepModalOpen: state.setup.keepModalOpen,
    // wallet signatures
    isRequestingWalletSignature: state.setup.isRequestingWalletSignature,
    setIsRequestingWalletSignature: state.setup.setIsRequestingWalletSignature,
    hasNogs: state.account.hasNogs,
  }));
  const { signMessage, ready: walletsReady } = useSignMessage();
  const authenticatorManager = useAuthenticatorManager();
  const logout = useLogout();
  const previousSteps = useValueHistory<SetupStep>(currentStep, 4);

  async function loadWallet() {
    if (walletsReady && ready && authenticated && user) {
      try {
        if (isUndefined(user.wallet)) await createWallet();
        setCurrentStep(SetupStep.WALLET_CONNECTED);
      } catch (e) {
        console.error(e);
        logout();
      }
    } else {
      logout();
    }
  }

  useEffect(() => {
    if (
      previousSteps[1] === SetupStep.WALLET_CONNECTED &&
      previousSteps[2] === SetupStep.SIGNED_IN &&
      previousSteps[3] === SetupStep.NOT_SIGNED_IN
    ) {
      analytics.track(AnalyticsEvent.CONNECT_WALLET, {
        hasNogs,
      });
    }
  }, [previousSteps, hasNogs]);

  async function loadIdentity() {
    if (walletsReady && ready && authenticated && user) {
      if (isUndefined(getCurrentIdentity())) {
        if (isRequestingWalletSignature) return;
        setIsRequestingWalletSignature(true);
        const wallet = user.wallet!;
        await loadIdentitiesForWallet(wallet);
        const identities = getIdentitiesForWallet(wallet);
        try {
          if (identities.length > 0) {
            await decryptIdentityKeys(
              signMessage,
              wallet,
              identities[0].identityPublicKey,
            );
            setCurrentIdentity(identities[0].identityPublicKey);
          } else {
            const publicKey = await createIdentityForWallet(
              signMessage,
              wallet,
            );
            setCurrentIdentity(publicKey);
          }
        } catch (e) {
          console.error(e);
          logout();
          return;
        } finally {
          setIsRequestingWalletSignature(false);
        }
      }
      setCurrentStep(SetupStep.IDENTITY_LOADED);
    } else {
      logout();
    }
  }

  const inferFidFromWallet = async (): Promise<number | undefined> => {
    if (!user?.wallet?.address) {
      console.log("[inferFidFromWallet] No wallet address available");
      return undefined;
    }
    try {
      console.log("[inferFidFromWallet] Fetching FID for wallet:", user.wallet.address);
      const response = await fetch(
        `/api/farcaster/neynar/users?addresses=${user.wallet.address}`,
      );
      if (!response.ok) {
        console.log("[inferFidFromWallet] API response not OK:", response.status, response.statusText);
        return undefined;
      }
      const data = await response.json();
      console.log("[inferFidFromWallet] API response data:", data);
      const users = data?.users ?? [];
      if (users.length === 0) {
        console.log("[inferFidFromWallet] No users found in response");
        return undefined;
      }
      
      const walletLower = user.wallet.address.toLowerCase();
      const matchingUser = users.find((u: any) => {
        // Check verified_addresses.primary.eth_address
        if (u.verified_addresses?.primary?.eth_address?.toLowerCase() === walletLower) {
          return true;
        }
        // Check verified_addresses.eth_addresses array
        if (u.verified_addresses?.eth_addresses?.some(
          (addr: string) => addr.toLowerCase() === walletLower
        )) {
          return true;
        }
        // Check verifications array (fallback)
        if (u.verifications?.some(
          (addr: string) => addr.toLowerCase() === walletLower
        )) {
          return true;
        }
        return false;
      });
      
      const fid = matchingUser?.fid ?? users[0]?.fid;
      console.log("[inferFidFromWallet] Found FID:", fid, "from matching user:", !!matchingUser);
      return fid;
    } catch (e) {
      console.error("[inferFidFromWallet] Error inferring FID from wallet:", e);
      return undefined;
    }
  };

  const waitForAuthenticator = async (
    authenticatorName: string,
    attempts = 10,
    delay = 1000,
  ) => {
    for (let i = 0; i < attempts; i++) {
      const initialized = await authenticatorManager.getInitializedAuthenticators();
      if (initialized.includes(authenticatorName)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return false;
  };

  async function loadAuthenticators() {
    try {
      await loadPreKeys();
      await storeLoadAuthenticators();
      setCurrentStep(SetupStep.AUTHENTICATORS_LOADED);
    } catch (e) {
      console.error(e);
      logout();
    }
  }

  const installRequiredAuthenticators = async () => {
    if (requiredAuthenticators.length > 0) {
      await authenticatorManager.installAuthenticators(requiredAuthenticators);
      authenticatorManager.initializeAuthenticators(requiredAuthenticators);
      setCurrentStep(SetupStep.REQUIRED_AUTHENTICATORS_INSTALLED);
    } else {
      // If no required authenticators, skip directly to initialized
      setCurrentStep(SetupStep.AUTHENTICATORS_INITIALIZED);
    }
  };

  const registerAccounts = async () => {
    let currentIdentity = getCurrentIdentity()!;
    console.log("[registerAccounts] Starting, current FIDs:", currentIdentity.associatedFids);
    if (currentIdentity.associatedFids.length > 0) {
      console.log("[registerAccounts] FIDs already exist, skipping registration");
      setCurrentStep(SetupStep.ACCOUNTS_REGISTERED);
    } else {
      console.log("[registerAccounts] No FIDs found, loading from server...");
      await loadFidsForCurrentIdentity();
      currentIdentity = getCurrentIdentity()!;
      console.log("[registerAccounts] After loadFidsForCurrentIdentity, FIDs:", currentIdentity.associatedFids);
      if (currentIdentity.associatedFids.length === 0) {
        console.log("[registerAccounts] No FIDs from server, attempting to infer from wallet...");
        const fidFromWallet = await inferFidFromWallet();
        console.log("[registerAccounts] Inferred FID from wallet:", fidFromWallet);
        if (!isUndefined(fidFromWallet)) {
          try {
            console.log("[registerAccounts] Registering FID without signer:", fidFromWallet);
            await registerFidForCurrentIdentity(fidFromWallet);
            console.log("[registerAccounts] FID registered, reloading...");
            await loadFidsForCurrentIdentity();
            currentIdentity = getCurrentIdentity()!;
            console.log("[registerAccounts] After registration, FIDs:", currentIdentity.associatedFids);
          } catch (e) {
            console.error("[registerAccounts] Error registering FID from wallet:", e);
            // Continue to fallback flow if registration fails
          }
        }
        if (currentIdentity.associatedFids.length === 0) {
          console.log("[registerAccounts] No FID found/inferred, falling back to signer flow...");
          await authenticatorManager.installAuthenticators([
            FARCASTER_AUTHENTICATOR_NAME,
          ]);
          authenticatorManager.initializeAuthenticators([
            FARCASTER_AUTHENTICATOR_NAME,
          ]);
          const signerReady = await waitForAuthenticator(FARCASTER_AUTHENTICATOR_NAME);
          if (signerReady) {
            try {
            const fidResult = (await authenticatorManager.callMethod({
              requestingFidgetId: "root",
              authenticatorId: FARCASTER_AUTHENTICATOR_NAME,
              methodName: "getAccountFid",
              isLookup: true,
            })) as { value: number };
            const publicKeyResult = (await authenticatorManager.callMethod({
              requestingFidgetId: "root",
              authenticatorId: FARCASTER_AUTHENTICATOR_NAME,
              methodName: "getSignerPublicKey",
              isLookup: true,
            })) as { value: Uint8Array };
            const signForFid = async (messageHash) => {
              const signResult = (await authenticatorManager.callMethod(
                {
                  requestingFidgetId: "root",
                  authenticatorId: FARCASTER_AUTHENTICATOR_NAME,
                  methodName: "signMessage",
                  isLookup: false,
                },
                messageHash,
              )) as { value: Uint8Array };
              return signResult.value;
            };
            await registerFidForCurrentIdentity(
              fidResult.value,
              bytesToHex(publicKeyResult.value),
              signForFid,
            );
            } catch (e) {
              console.error("Error registering FID with signer:", e);
            }
          }
        }
      }
    }
    setCurrentStep(SetupStep.ACCOUNTS_REGISTERED);
  };

  // Has to be separate otherwise will cause retrigger chain
  // due to depence on authenticatorManager
  useEffect(() => {
    if (
      ready &&
      walletsReady &&
      authenticated &&
      currentStep === SetupStep.REQUIRED_AUTHENTICATORS_INSTALLED
    ) {
      Promise.resolve(authenticatorManager.getInitializedAuthenticators()).then(
        (initializedAuthNames) => {
          const initializedAuthenticators = new Set(initializedAuthNames);
          const requiredAuthSet = new Set(requiredAuthenticators);
          if (isEqual(initializedAuthenticators, requiredAuthSet)) {
            setCurrentStep(SetupStep.AUTHENTICATORS_INITIALIZED);
          }
        },
      );
    }
  }, [
    ready,
    currentStep,
    authenticated,
    authenticatorManager.lastUpdatedAt,
    walletsReady,
  ]);

  useEffect(() => {
    if (ready && authenticated && user) {
      if (
        currentStep === SetupStep.NOT_SIGNED_IN ||
        currentStep === SetupStep.UNINITIALIZED
      ) {
        setCurrentStep(SetupStep.SIGNED_IN);
      } else if (walletsReady) {
        if (currentStep === SetupStep.SIGNED_IN) {
          loadWallet();
        } else if (currentStep === SetupStep.WALLET_CONNECTED) {
          setCurrentStep(SetupStep.TOKENS_FOUND);
        } else if (currentStep === SetupStep.TOKENS_FOUND) {
          loadIdentity();
        } else if (currentStep === SetupStep.IDENTITY_LOADED) {
          loadAuthenticators();
        } else if (currentStep === SetupStep.AUTHENTICATORS_LOADED) {
          installRequiredAuthenticators();
        } else if (currentStep === SetupStep.AUTHENTICATORS_INITIALIZED) {
          registerAccounts();
        } else if (currentStep === SetupStep.ACCOUNTS_REGISTERED) {
          setModalOpen(false);
          setCurrentStep(SetupStep.DONE);
        }
      }
    } else if (
      ready &&
      !authenticated &&
      currentStep !== SetupStep.NOT_SIGNED_IN
    ) {
      setCurrentStep(SetupStep.NOT_SIGNED_IN);
    }
  }, [currentStep, walletsReady, ready, authenticated, user]);

  return (
    <>
      <LoginModal
        open={modalOpen}
        setOpen={setModalOpen}
        showClose={!keepModalOpen}
      />
      {children}
    </>
  );
};

export default LoggedInStateProvider;
