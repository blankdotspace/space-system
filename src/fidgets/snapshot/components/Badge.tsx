import React, { memo } from "react";
import { ProposalStatus } from "../hooks/useProposalStatus";

interface BadgeProps {
  status: ProposalStatus;
}

const getStatusBadgeColor = (status: ProposalStatus): string => {
  switch (status) {
    case "Pending":
      return "bg-yellow-500 min-w-16 text-center";
    case "Active":
      return "bg-blue-400 min-w-16 text-center";
    case "Passed":
      return "bg-green-500 min-w-16 text-center";
    case "Failed":
      return "bg-red-500 min-w-16 text-center";
    case "Closed":
      return "bg-gray-500 min-w-16 text-center";
    default:
      return "bg-gray-500 min-w-16 text-center";
  }
};

const Badge: React.FC<BadgeProps> = memo(({ status }) => {
  const colorClasses = getStatusBadgeColor(status);

  return (
    <div
      className={`inline-block text-white py-1 px-3 rounded-full text-xs ${colorClasses}`}
    >
      {status}
    </div>
  );
});

Badge.displayName = "Badge";

export default Badge;
