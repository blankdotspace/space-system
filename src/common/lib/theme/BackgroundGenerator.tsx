import React, { useState, useRef, useEffect } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { Button } from "@/common/components/atoms/button";
import Spinner from "@/common/components/atoms/spinner";
import HTMLInput from "@/common/components/molecules/HTMLInput";
import { useToastStore } from "@/common/data/stores/toastStore";
import { useAppStore } from "@/common/data/stores/app";
import { ThemeSettingsTooltip } from "./components/ThemeSettingsTooltip";
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";
import { analytics } from "@/common/providers/AnalyticsProvider";
import { usePrivy } from "@privy-io/react-auth";
import { Address, formatUnits, zeroAddress } from "viem";
import { base } from "viem/chains";
import { useBalance } from "wagmi";
import { getSpaceContractAddr } from "@/constants/spaceToken";

interface BackgroundGeneratorProps {
  backgroundHTML: string;
  onChange: (value: string) => void;
}

export const BackgroundGenerator = ({
  backgroundHTML,
  onChange,
}: BackgroundGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateText, setGenerateText] = useState("Generate");
  const [showBanner, setShowBanner] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [internalBackgroundHTML, setInternalBackgroundHTML] =
    useState(backgroundHTML);
  const [waitingForTokens, setWaitingForTokens] = useState(false);
  const timersRef = useRef<number[]>([]);
  const { showToast } = useToastStore();

  // Sync internal state with props when backgroundHTML changes
  useEffect(() => {
    setInternalBackgroundHTML(backgroundHTML);
  }, [backgroundHTML]);

  // Random prompt choices
  const randomPrompts = [
    "Warm sunset gradient",
    "Soft pastel stripes",
    "Floating bubble circles",
    "Calm teal radial glow",
    "Lush green rainforest",
    "Animated purple gradient",
  ];

  const { user } = usePrivy();
  const [spaceContractAddr, setSpaceContractAddr] = useState<Address | null>(null);
  
  // Load space contract address (async)
  useEffect(() => {
    getSpaceContractAddr().then(addr => setSpaceContractAddr(addr));
  }, []);
  
  const result = useBalance({
    address: (user?.wallet?.address as Address) || zeroAddress,
    token: (spaceContractAddr || zeroAddress) as Address,
    chainId: base.id,
    enabled: !!spaceContractAddr, // Only query when address is loaded
  });
  const spaceHoldAmount = result?.data
    ? parseInt(formatUnits(result.data.value, result.data.decimals))
    : 0;
  const userHoldEnoughSpace = spaceHoldAmount >= 1111;
  const spaceLoading = result.isLoading || result.isFetching;
  const { hasNogs } = useAppStore((state) => ({
    hasNogs: state.account.hasNogs,
  }));

  // Sync gate state with token data
  useEffect(() => {
    if (waitingForTokens && !spaceLoading) {
      setWaitingForTokens(false);
    }
    if (spaceLoading && waitingForTokens) {
      setButtonDisabled(true);
      setShowBanner(false);
    } else if (!userHoldEnoughSpace && !hasNogs) {
      setButtonDisabled(true);
      setShowBanner(true);
    } else {
      setButtonDisabled(false);
      setShowBanner(false);
    }
  }, [spaceLoading, userHoldEnoughSpace, hasNogs, waitingForTokens]);

  const handleGenerateBackground = async (promptText: string) => {
    try {
      analytics.track(AnalyticsEvent.GENERATE_BACKGROUND, {
        user_input: promptText,
      });
      const response = await fetch(`/api/venice/background`, {
        method: "POST",
        body: JSON.stringify({ text: promptText }),
      });
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const data = await response.json();
      onChange(data.response);
      showToast(
        "Hope you love your new background! To refine it, try adding a prompt before the code and click 'Generate' again.",
        10000,
        "background-generated",
        true,
      );
    } catch (error) {
      console.error("Error generating background:", error);
    } finally {
      timersRef.current.forEach((timer) => clearInterval(timer));
      timersRef.current = [];
      setGenerateText("Generate");
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const messages = [
      "Analyzing…",
      "Imagining…",
      "Coding…",
      "Reviewing…",
      "Improving…",
    ];
    let index = 0;
    setGenerateText(messages[index]);
    const intervalId = window.setInterval(() => {
      index = (index + 1) % messages.length;
      setGenerateText(messages[index]);
    }, 8000);
    timersRef.current = [intervalId];

    // If field is empty, use a random prompt from the list
    const inputText =
      internalBackgroundHTML.trim() === ""
        ? randomPrompts[Math.floor(Math.random() * randomPrompts.length)]
        : internalBackgroundHTML;

    if (process.env.NODE_ENV !== "production")
      console.log(`inputText: ${inputText}`);

    handleGenerateBackground(inputText);
  };

  const handleGenerateWrapper = () => {
    if (spaceLoading) {
      setWaitingForTokens(true);
      setButtonDisabled(true);
      setShowBanner(false);
      return;
    }
    if (buttonDisabled) return;
    handleGenerate();
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row gap-1">
        <h4 className="text-sm">Prompt and/or HTML/CSS</h4>
        <ThemeSettingsTooltip text="Customize your background with HTML/CSS, or describe your dream background and click Generate. To modify existing code, add a prompt before the code and click Generate." />
      </div>
      <HTMLInput
        value={backgroundHTML}
        onChange={(value) => {
          setInternalBackgroundHTML(value);
          onChange(value);
        }}
        placeholder="Customize your background with HTML/CSS, or describe your dream background and click Generate."
      />
      <Button
        onClick={handleGenerateWrapper}
        variant="primary"
        width="auto"
        withIcon
        disabled={buttonDisabled || isGenerating || waitingForTokens}
        className="w-full"
      >
        {isGenerating || waitingForTokens ? (
          <Spinner className="size-6" />
        ) : (
          <SparklesIcon className="size-5" />
        )}
        <span>
          {waitingForTokens
            ? "Checking tokens..."
            : isGenerating
            ? generateText
            : "Generate"}
        </span>
      </Button>
      {showBanner && (
        <div className="flex gap-1 items-center border-2 border-red-600 text-red-600 bg-red-100 rounded-lg p-2 text-sm font-medium">
          <p>
            Hold at least 1,111{" "}
            <a
              target="_blank"
              rel="noreferrer"
              href="https://www.nounspace.com/t/base/0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab"
              className="font-bold underline"
            >
              $SPACE
            </a>{" "}
            or 1{" "}
            <a
              target="_blank"
              rel="noreferrer"
              href="https://highlight.xyz/mint/base:0xD094D5D45c06c1581f5f429462eE7cCe72215616"
              className="font-bold underline"
            >
              nOGs
            </a>{" "}
            to unlock generation
          </p>
        </div>
      )}
    </div>
  );
};
