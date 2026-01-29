"use client";
import { useAuthenticatorManager } from "@/authenticators/AuthenticatorManager";
import { useAppStore, useLogout } from "@/common/data/stores/app";
import { useSignMessage } from "@/common/data/stores/app/accounts/privyStore";
import { SetupStep } from "@/common/data/stores/app/setup";
import useValueHistory from "@/common/lib/hooks/useValueHistory";

import requiredAuthenticators from "@/constants/requiredAuthenticators";
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
    inferFidForCurrentIdentity,
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
    inferFidForCurrentIdentity: state.account.inferFidForCurrentIdentity,
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

  const waitForAuthenticatorReady = async (
    authenticatorId: string,
    timeoutMs = 60_000,
  ) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const initialized = await authenticatorManager.getInitializedAuthenticators();
      if (initialized.includes(authenticatorId)) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  };

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
    await authenticatorManager.installAuthenticators(requiredAuthenticators);
    authenticatorManager.initializeAuthenticators(requiredAuthenticators);
    // If no authenticators are required for signup, skip this step entirely.
    if (requiredAuthenticators.length === 0) {
      setCurrentStep(SetupStep.AUTHENTICATORS_INITIALIZED);
      return;
    }
    setCurrentStep(SetupStep.REQUIRED_AUTHENTICATORS_INSTALLED);
  };

  const registerAccounts = async () => {
    try {
      let currentIdentity = getCurrentIdentity()!;
      if (currentIdentity.associatedFids.length > 0) {
        setCurrentStep(SetupStep.ACCOUNTS_REGISTERED);
        return;
      }

      await loadFidsForCurrentIdentity();
      currentIdentity = getCurrentIdentity()!;
      if (currentIdentity.associatedFids.length > 0) {
        setCurrentStep(SetupStep.ACCOUNTS_REGISTERED);
        return;
      }

      // First attempt: infer user's Farcaster FID from their connected wallet address (no signer required).
      const walletAddress = user?.wallet?.address;
      if (walletAddress) {
        await inferFidForCurrentIdentity(walletAddress);
        currentIdentity = getCurrentIdentity()!;
      }

      if (currentIdentity.associatedFids.length > 0) {
        setCurrentStep(SetupStep.ACCOUNTS_REGISTERED);
        return;
      }

      // Fallback: if we still can't infer an FID, prompt the user to connect to Farcaster.
      await authenticatorManager.installAuthenticators(["farcaster:nounspace"]);
      authenticatorManager.initializeAuthenticators(["farcaster:nounspace"]);
      setModalOpen(true);

      const ready = await waitForAuthenticatorReady("farcaster:nounspace");
      if (!ready) {
        // Keep the user on this step until they finish the Farcaster flow.
        return;
      }

      const fidResult = await authenticatorManager.callMethod({
        requestingFidgetId: "root",
        authenticatorId: "farcaster:nounspace",
        methodName: "getAccountFid",
        isLookup: true,
      });
      if (fidResult.result !== "success") return;

      const publicKeyResult = await authenticatorManager.callMethod({
        requestingFidgetId: "root",
        authenticatorId: "farcaster:nounspace",
        methodName: "getSignerPublicKey",
        isLookup: true,
      });
      if (publicKeyResult.result !== "success") return;

      const signForFid = async (messageHash) => {
        const signResult = await authenticatorManager.callMethod(
          {
            requestingFidgetId: "root",
            authenticatorId: "farcaster:nounspace",
            methodName: "signMessage",
            isLookup: false,
          },
          messageHash,
        );
        if (signResult.result !== "success") {
          throw new Error("Failed to sign message");
        }
        return signResult.value as Uint8Array;
      };

      await registerFidForCurrentIdentity(
        fidResult.value as number,
        bytesToHex(publicKeyResult.value as Uint8Array),
        signForFid,
      );

      setCurrentStep(SetupStep.ACCOUNTS_REGISTERED);
    } catch (e) {
      console.error("[registerAccounts] failed", e);
      // Don't deadlock the user; show modal so they can recover/authorize if needed.
      setModalOpen(true);
    }
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
          // Consider the step complete once all required authenticators are initialized,
          // even if other authenticators are also installed/initialized.
          const allRequiredInitialized = Array.from(requiredAuthSet).every((id) =>
            initializedAuthenticators.has(id),
          );
          if (allRequiredInitialized) {
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
