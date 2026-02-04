"use client";
import { useAppStore } from "@/common/data/stores/app";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import React, { useEffect, useState } from "react";
import { SetupStep } from "@/common/data/stores/app/setup";
import LoadingScreen from "../organisms/LoadingScreen";
import Spinner from "../atoms/spinner";
import { useAuthenticatorManager } from "@/authenticators/AuthenticatorManager";
import Modal from "@/common/components/molecules/Modal";
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
  const { CurrentInitializerComponent } = useAuthenticatorManager();

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

    // If an authenticator is requesting initialization (e.g. Farcaster signer),
    // show its initializer regardless of the current setup step.
    if (CurrentInitializerComponent) {
      return <CurrentInitializerComponent />;
    }

    return <LoadingScreen text={currentStep} />;
  }

  return (
    <Modal
      setOpen={setOpen}
      open={open && authenticated && (currentStep !== SetupStep.DONE || !!CurrentInitializerComponent)}
      showClose={showClose}
    >
      {getModalContent()}
    </Modal>
  );
};

export default LoginModal;
