"use client";
import React from "react";
import { useAuthenticatorManager } from "@/authenticators/AuthenticatorManager";
import Modal from "@/common/components/molecules/Modal";
import { useAppStore } from "@/common/data/stores/app";
import { SetupStep } from "@/common/data/stores/app/setup";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import Spinner from "../atoms/spinner";
import LoadingScreen from "../organisms/LoadingScreen";
const LoginModal = ({
  open,
  setOpen,
  showClose,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  showClose: boolean;
}) => {
  const { currentStep, setCurrentStep } = useAppStore((state) => ({
    // Setup State Tracking
    currentStep: state.setup.currentStep,
    setCurrentStep: state.setup.setCurrentStep,
  }));

  const { authenticated, ready } = usePrivy();
  const { login } = useLogin({
    onComplete: (_user, isNewUser, wasAlreadyAuthenticated) => {
      if (!wasAlreadyAuthenticated) {
        if (isNewUser) {
          // redirect to the new user tutorial?
        }
      }
      setCurrentStep(SetupStep.SIGNED_IN);
    },
    onError: () => {
      setOpen(false);
      setErrored(true);
    },
  });
  const [errored, setErrored] = useState(false);
  const { CurrentInitializerComponent, hasCurrentInitializer, lastUpdatedAt } = useAuthenticatorManager();

  useEffect(() => {
    if (
      currentStep === SetupStep.NOT_SIGNED_IN &&
      !authenticated &&
      ready &&
      open
    ) {
      login();
    }
  }, [currentStep, open, ready, authenticated]);

  // Open modal automatically when CurrentInitializerComponent exists (for signer authorization)
  // This allows signer authorization to work even when setup is already done
  useEffect(() => {
    if (hasCurrentInitializer && !open && authenticated) {
      setOpen(true);
    }
  }, [hasCurrentInitializer, open, authenticated, setOpen]);

  // Close modal automatically if setup is done and no CurrentInitializerComponent is present
  // Also listen to lastUpdatedAt to ensure we react when the authenticator state changes
  useEffect(() => {
    if (open && authenticated && currentStep === SetupStep.DONE && !hasCurrentInitializer) {
      setOpen(false);
    }
  }, [open, authenticated, currentStep, hasCurrentInitializer, lastUpdatedAt, setOpen]);

  function getModalContent() {
    if (!ready) {
      return (
        <div className="self-center">
          <Spinner className="size-12" />
        </div>
      );
    }

    if (currentStep === SetupStep.NOT_SIGNED_IN) {
      return authenticated ? (
        <>
          <div className="self-center">
            <Spinner className="size-12" />
          </div>
          {errored && (
            <div className="bg-red text-white">
              An error occurred signing you in. Please try again or contact
              support if the problem persists
            </div>
          )}
        </>
      ) : null;
    }

    if (currentStep === SetupStep.REQUIRED_AUTHENTICATORS_INSTALLED)
      return CurrentInitializerComponent ? (
        <CurrentInitializerComponent />
      ) : (
        "One second..."
      );

    // If setup is done but we have a CurrentInitializerComponent (for signer authorization), show it
    if (currentStep === SetupStep.DONE && hasCurrentInitializer && CurrentInitializerComponent) {
      return <CurrentInitializerComponent />;
    }

    return <LoadingScreen text={currentStep} />;
  }

  // Modal should be open if:
  // 1. Normal setup flow (authenticated && currentStep !== DONE)
  // 2. OR hasCurrentInitializer exists (for signer authorization after setup is done)
  // But only if hasCurrentInitializer exists when setup is done
  const shouldOpenModal = authenticated && (
    currentStep !== SetupStep.DONE || (currentStep === SetupStep.DONE && hasCurrentInitializer)
  );

  return (
    <Modal
      setOpen={setOpen}
      open={open && shouldOpenModal}
      showClose={showClose}
    >
      {getModalContent()}
    </Modal>
  );
};

export default LoginModal;