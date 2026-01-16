import React from "react";
import { Button } from "../atoms/button";
import ClaimModal from "./ClaimModal";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "../atoms/tooltip";
import { useToken } from "@/common/providers/TokenProvider";
import { Address } from "viem";
import { useUIColors } from "@/common/lib/hooks/useUIColors";

interface ClaimButtonWithModalProps {
  contractAddress?: Address;
  tokenSymbol?: string;
}

const ClaimButtonWithModal: React.FC<ClaimButtonWithModalProps> = ({
  contractAddress,
  tokenSymbol,
}) => {
  const [isModalOpen, setModalOpenState] = React.useState(false);
  const uiColors = useUIColors();
  let tokenData: ReturnType<typeof useToken>["tokenData"] | null = null;
  try {
    // Attempt to read token data if a TokenProvider is present
    tokenData = useToken().tokenData;
  } catch {
    // Swallow the error when no TokenProvider is available
    tokenData = null;
  }

  const symbol =
    tokenSymbol ??
    tokenData?.clankerData?.symbol ??
    tokenData?.geckoData?.symbol ??
    "";

  const handleClaimClick = () => {
    setModalOpenState(true);
  };

  const handleModalClose = () => {
    setModalOpenState(false);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center mr-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="line-clamp-1 min-w-40 max-w-xs truncate text-white font-medium transition-colors"
              style={{ backgroundColor: uiColors.primaryColor }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = uiColors.primaryHoverColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = uiColors.primaryColor;
              }}
              onClick={handleClaimClick}
            >
              Claim this Space
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Log in with the Farcaster account that deployed ${symbol} to
            customize this space.
          </TooltipContent>
        </Tooltip>
      </div>
      <ClaimModal
        isModalOpen={isModalOpen}
        handleModalClose={handleModalClose}
        tokenSymbol={symbol}
      />
    </TooltipProvider>
  );
};

export default ClaimButtonWithModal;
