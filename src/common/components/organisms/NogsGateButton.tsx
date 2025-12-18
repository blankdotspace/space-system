import React, { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/common/data/stores/app";
import { RECHECK_BACKOFF_FACTOR } from "@/common/data/stores/app/setup";
import { ALCHEMY_API } from "@/constants/urls";
import { AlchemyIsHolderOfContract } from "@/pages/api/signerRequests";
import { usePrivy } from "@privy-io/react-auth";
import axios from "axios";
import { Button, ButtonProps } from "../atoms/button";
import NogsChecker from "./NogsChecker";
import Modal from "../molecules/Modal";
import { isUndefined } from "lodash";
import { Address, formatUnits, zeroAddress } from "viem";
import { useBalance } from "wagmi";
import { getGateTokens, getChainForNetwork, mapNetworkToAlchemy } from "@/common/lib/utils/tokenGates";
import { type CommunityTokenNetwork } from "@/config";

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
  const [erc20Token, setErc20Token] = useState<{
    address: Address;
    decimals: number;
    network?: CommunityTokenNetwork;
  } | null>(null);
  const [nftTokens, setNftTokens] = useState<
    { address: string; network?: CommunityTokenNetwork }[]
  >([]);

  // Load contract addresses (async)
  useEffect(() => {
    getGateTokens().then((tokens) => {
      const primaryErc20 = tokens.erc20Tokens[0];
      if (primaryErc20) {
        setErc20Token({
          address: primaryErc20.address as Address,
          decimals: primaryErc20.decimals ?? 18,
          network: primaryErc20.network,
        });
      }
      setNftTokens(
        (tokens.nftTokens || []).map((token) => ({
          address: token.address,
          network: token.network,
        })),
      );
    });
  }, []);

  // ----- SPACE token gating -----
  const walletAddress = user?.wallet?.address as Address | undefined;

  const { data: spaceBalanceData } = useBalance({
    address: walletAddress ?? zeroAddress,
    token: (erc20Token?.address || zeroAddress) as Address,
    chainId: erc20Token ? getChainForNetwork(erc20Token.network).id : undefined,
    query: { enabled: Boolean(walletAddress) && !!erc20Token },
  });

  const userHoldEnoughSpace = spaceBalanceData
    ? Number(
        formatUnits(
          spaceBalanceData.value,
          spaceBalanceData.decimals ?? erc20Token?.decimals ?? 18,
        ),
      ) >=
      MIN_SPACE_TOKENS_FOR_UNLOCK
    : false;

  const gatingSatisfied = hasNogs || userHoldEnoughSpace;

  // Optional debug logs
  useEffect(() => {
    if (spaceBalanceData && erc20Token?.address) {
      console.log(
        "[DEBUG] ERC20 balance:",
        Number(
          formatUnits(
            spaceBalanceData.value,
            spaceBalanceData.decimals ?? erc20Token.decimals ?? 18,
          ),
        ),
      );
      console.log("[DEBUG] ERC20 contract address:", erc20Token.address);
      console.log("[DEBUG] Connected wallet:", walletAddress);
    }
  }, [spaceBalanceData, erc20Token?.address, erc20Token?.decimals, walletAddress]);

  // ----- nOGs gating / timers -----

  async function isHoldingNogs(address: string): Promise<boolean> {
    setNogsIsChecking(true);

    if (process.env.NODE_ENV === "development") {
      setNogsIsChecking(false);
      return true;
    }

    try {
      if (nftTokens.length === 0) {
        console.error("[DEBUG] No NFT gating tokens configured");
        return false;
      }

      for (const token of nftTokens) {
        const alchemyNetwork = mapNetworkToAlchemy(token.network as any);
        const { data } = await axios.get<AlchemyIsHolderOfContract>(
          `${ALCHEMY_API(alchemyNetwork)}nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/isHolderOfContract`,
          {
            params: {
              wallet: address,
              contractAddress: token.address,
            },
          },
        );

        console.log("[DEBUG] API response for NFT gate:", data);
        if (data.isHolderOfContract) {
          return true;
        }
      }

      return false;
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

  // Automatically check nOGs on load
  useEffect(() => {
    async function checkNogsAuto() {
      if (!walletAddress || nftTokens.length === 0) return;

      try {
        const results = await Promise.all(
          nftTokens.map((token) => {
            const alchemyNetwork = mapNetworkToAlchemy(token.network as any);
            return axios.get<AlchemyIsHolderOfContract>(
              `${ALCHEMY_API(alchemyNetwork)}nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/isHolderOfContract`,
              {
                params: {
                  wallet: walletAddress,
                  contractAddress: token.address,
                },
              },
            );
          }),
        );

        const anyHold = results.some((res) => res.data.isHolderOfContract);
        if (anyHold) {
          setHasNogs(true);
        }
      } catch (error) {
        console.error("[DEBUG] Error during NFT gate auto-check:", error);
      }
    }

    void checkNogsAuto();
  }, [walletAddress, nftTokens, setHasNogs]);

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
