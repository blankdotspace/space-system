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
import { FARCASTER_AUTHENTICATOR_NAME } from "@/fidgets/farcaster";

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
    if (!user?.wallet?.address) return undefined;
    try {
      const response = await fetch(
        `/api/farcaster/neynar/users?addresses=${user.wallet.address}`,
      );
      if (!response.ok) return undefined;
      const data = await response.json();
      const users = data?.users ?? [];
      const walletLower = user.wallet.address.toLowerCase();
      const matchingUser = users.find((u) =>
        (u.verified_addresses?.eth_addresses || [])
          .map((addr: string) => addr.toLowerCase())
          .includes(walletLower),
      );
      return matchingUser?.fid ?? users[0]?.fid;
    } catch (e) {
      console.error(e);
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
    await authenticatorManager.installAuthenticators(requiredAuthenticators);
    authenticatorManager.initializeAuthenticators(requiredAuthenticators);
    setCurrentStep(SetupStep.REQUIRED_AUTHENTICATORS_INSTALLED);
  };

  const registerAccounts = async () => {
    let currentIdentity = getCurrentIdentity()!;
    if (currentIdentity.associatedFids.length > 0) {
      setCurrentStep(SetupStep.ACCOUNTS_REGISTERED);
    } else {
      await loadFidsForCurrentIdentity();
      currentIdentity = getCurrentIdentity()!;
      if (currentIdentity.associatedFids.length === 0) {
        const fidFromWallet = await inferFidFromWallet();
        if (!isUndefined(fidFromWallet)) {
          await registerFidForCurrentIdentity(fidFromWallet);
          await loadFidsForCurrentIdentity();
          currentIdentity = getCurrentIdentity()!;
        }
        if (currentIdentity.associatedFids.length === 0) {
          await authenticatorManager.installAuthenticators([
            FARCASTER_AUTHENTICATOR_NAME,
          ]);
          authenticatorManager.initializeAuthenticators([
            FARCASTER_AUTHENTICATOR_NAME,
          ]);
          const signerReady = await waitForAuthenticator(FARCASTER_AUTHENTICATOR_NAME);
          if (signerReady) {
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
