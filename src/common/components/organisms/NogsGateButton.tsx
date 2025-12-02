import React, { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/common/data/stores/app";
import { RECHECK_BACKOFF_FACTOR } from "@/common/data/stores/app/setup";
import { getNogsContractAddr } from "@/constants/nogs";
import { ALCHEMY_API } from "@/constants/urls";
import { AlchemyIsHolderOfContract } from "@/pages/api/signerRequests";
import { usePrivy } from "@privy-io/react-auth";
import axios from "axios";
import { Button, ButtonProps } from "../atoms/button";
import NogsChecker from "./NogsChecker";
import Modal from "../molecules/Modal";
import { isUndefined } from "lodash";
import { useBalance } from "wagmi";
import { Address, formatUnits, zeroAddress } from "viem";
import { base } from "viem/chains";
import { getSpaceContractAddr } from "@/constants/spaceToken";

const MIN_SPACE_TOKENS_FOR_UNLOCK = 1111;

const NogsGateButton = (props: ButtonProps) => {
  const { user } = usePrivy();

  const {
    setNogsIsChecking,
    nogsTimeoutTimer,
    nogsRecheckCountDownTimer,
    setNogsRecheckCountDown,
    setNogsShouldRecheck,
    setNogsRecheckTimerLength,
    nogsRecheckTimerLength,
    setNogsTimeoutTimer,
    nogsRecheckCountDown,
    setNogsRecheckCountDownTimer,
    nogsShouldRecheck,
    hasNogs,
    setHasNogs,
  } = useAppStore((state) => ({
    setNogsIsChecking: state.setup.setNogsIsChecking,
    nogsTimeoutTimer: state.setup.nogsTimeoutTimer,
    nogsRecheckCountDownTimer: state.setup.nogsRecheckCountDownTimer,
    setNogsRecheckCountDown: state.setup.setNogsRecheckCountDown,
    setNogsShouldRecheck: state.setup.setNogsShouldRecheck,
    setNogsRecheckTimerLength: state.setup.setNogsRecheckTimerLength,
    nogsRecheckTimerLength: state.setup.nogsRecheckTimerLength,
    setNogsTimeoutTimer: state.setup.setNogsTimeoutTimer,
    nogsRecheckCountDown: state.setup.nogsRecheckCountDown,
    setNogsRecheckCountDownTimer: state.setup.setNogsRecheckCountDownTimer,
    nogsShouldRecheck: state.setup.nogsShouldRecheck,
    hasNogs: state.account.hasNogs,
    setHasNogs: state.account.setHasNogs,
  }));

  const [modalOpen, setModalOpen] = useState(false);
  const [spaceContractAddr, setSpaceContractAddr] = useState<Address | null>(null);
  const [nogsContractAddr, setNogsContractAddr] = useState<string | null>(null);

  // Load contract addresses (async)
  useEffect(() => {
    getSpaceContractAddr().then(addr => setSpaceContractAddr(addr));
    getNogsContractAddr().then(addr => setNogsContractAddr(addr));
  }, []);

  // ----- SPACE token gating -----
  const walletAddress = user?.wallet?.address as Address | undefined;

  const { data: spaceBalanceData } = useBalance({
    address: walletAddress ?? zeroAddress,
    token: (spaceContractAddr || zeroAddress) as Address,
    chainId: base.id,
    query: { enabled: Boolean(walletAddress) && !!spaceContractAddr },
  });

  const userHoldEnoughSpace = spaceBalanceData
    ? Number(formatUnits(spaceBalanceData.value, spaceBalanceData.decimals)) >=
      MIN_SPACE_TOKENS_FOR_UNLOCK
    : false;

  const gatingSatisfied = hasNogs || userHoldEnoughSpace;

  // Optional debug logs
  useEffect(() => {
    if (spaceBalanceData && spaceContractAddr) {
      console.log(
        "[DEBUG] SPACE balance:",
        Number(formatUnits(spaceBalanceData.value, spaceBalanceData.decimals)),
      );
      console.log("[DEBUG] SPACE contract address:", spaceContractAddr);
      console.log("[DEBUG] Connected wallet:", walletAddress);
    }
  }, [spaceBalanceData, spaceContractAddr, walletAddress]);

  useEffect(() => {
    console.log("[DEBUG] userHoldEnoughSpace:", userHoldEnoughSpace);
    console.log("[DEBUG] hasNogs:", hasNogs);
  }, [userHoldEnoughSpace, hasNogs]);

  // ----- nOGs gating / timers -----

  async function isHoldingNogs(address: string): Promise<boolean> {
    setNogsIsChecking(true);

    if (process.env.NODE_ENV === "development") {
      setNogsIsChecking(false);
      return true;
    }

    try {
      console.log("[DEBUG] Checking nOGs for address:", address);
      console.log(
        "[DEBUG] Using API:",
        `${ALCHEMY_API("base")}nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/isHolderOfContract`,
      );
      if (!nogsContractAddr) {
        console.error("[DEBUG] nOGs contract address not loaded yet");
        return false;
      }

      console.log("[DEBUG] nOGs Contract:", nogsContractAddr);

      const { data } = await axios.get<AlchemyIsHolderOfContract>(
        `${ALCHEMY_API("base")}nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/isHolderOfContract`,
        {
          params: {
            wallet: address,
            contractAddress: nogsContractAddr,
          },
        },
      );

      console.log("[DEBUG] API response for nOGs:", data);
      return data.isHolderOfContract;
    } catch (err) {
      console.error("[DEBUG] Error checking nOGs:", err);
      return false;
    } finally {
      setNogsIsChecking(false);
    }
  }

  const checkForNogs = useCallback(async () => {
    clearTimeout(nogsTimeoutTimer);
    clearTimeout(nogsRecheckCountDownTimer);
    setNogsRecheckCountDown(0);
    setNogsShouldRecheck(false);

    if (user && user.wallet) {
      const isHolder = await isHoldingNogs(user.wallet.address);
      if (isHolder) {
        setHasNogs(true);
        setModalOpen(false);
      } else {
        setNogsRecheckTimerLength(
          nogsRecheckTimerLength * RECHECK_BACKOFF_FACTOR,
        );
        setNogsTimeoutTimer(
          setTimeout(
            () => setNogsShouldRecheck(true),
            nogsRecheckTimerLength,
          ),
        );
        setNogsRecheckCountDown(nogsRecheckTimerLength / 1000);
      }
    }
  }, [
    user,
    nogsTimeoutTimer,
    nogsRecheckCountDownTimer,
    nogsRecheckTimerLength,
    setNogsRecheckCountDown,
    setNogsRecheckTimerLength,
    setNogsShouldRecheck,
    setNogsTimeoutTimer,
    setHasNogs,
  ]);

  // Recheck countdown tick
  useEffect(() => {
    if (nogsRecheckCountDown > 0) {
      const timer = setTimeout(
        () => setNogsRecheckCountDown(nogsRecheckCountDown - 1),
        1000,
      );
      setNogsRecheckCountDownTimer(timer);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [
    nogsRecheckCountDown,
    setNogsRecheckCountDown,
    setNogsRecheckCountDownTimer,
  ]);

  // Trigger recheck when nogsShouldRecheck flips to true
  useEffect(() => {
    if (nogsShouldRecheck) {
      void checkForNogs();
    }
  }, [nogsShouldRecheck, checkForNogs]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(nogsTimeoutTimer);
      clearTimeout(nogsRecheckCountDownTimer);
    };
  }, [nogsTimeoutTimer, nogsRecheckCountDownTimer]);

  // NFT nOGs debug status (optional)
  const [nogsCheckResult, setNogsCheckResult] = useState<string>("?");

  // Automatically check nOGs on load
  useEffect(() => {
    async function checkNogsAuto() {
      if (!walletAddress || !nogsContractAddr) return;

      try {
        const { data } = await axios.get<AlchemyIsHolderOfContract>(
          `${ALCHEMY_API("base")}nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/isHolderOfContract`,
          {
            params: {
              wallet: walletAddress,
              contractAddress: nogsContractAddr,
            },
          },
        );

        setNogsCheckResult(data.isHolderOfContract ? "YES" : "NO");
        if (data.isHolderOfContract) {
          setHasNogs(true);
        }
      } catch {
        setNogsCheckResult("ERROR");
      }
    }

    void checkNogsAuto();
  }, [walletAddress, nogsContractAddr, setHasNogs]);

  // ----- Button wrapper (this is what ThemeSettingsEditor uses) -----

  const { onClick, children, ...rest } = props;

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (gatingSatisfied) {
      if (!isUndefined(onClick)) {
        onClick(e);
      }
      return;
    }

    setModalOpen(true);
    void checkForNogs();
  };

  return (
    <>
      <Modal setOpen={setModalOpen} open={modalOpen} showClose>
        <NogsChecker />
      </Modal>
      <Button {...rest} onClick={handleClick}>
        {children}
      </Button>
    </>
  );
};

export default NogsGateButton;
