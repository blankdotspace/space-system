import React from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/common/components/atoms/avatar";
import BoringAvatar from "boring-avatars";
import type {
  DirectoryMemberData,
  DirectoryFidgetSettings,
  DirectoryNetwork,
  DirectoryIncludeOption,
} from "../types";
import { ProfileLink } from "./ProfileLink";
import { BadgeIcons } from "./BadgeIcons";
import {
  getMemberPrimaryLabel,
  getMemberSecondaryLabel,
  getMemberAvatarSrc,
  getMemberAvatarFallback,
  getLastActivityLabel,
  formatTokenBalance,
} from "../utils";
import { buildEtherscanUrl, getBlockExplorerLink } from "@/common/data/api/token/utils";
import {
  DirectoryFollowButton,
  type DirectoryFollowButtonProps,
} from "./DirectoryFollowButton";

export type DirectoryListViewProps = {
  members: DirectoryMemberData[];
  settings: DirectoryFidgetSettings;
  tokenSymbol?: string | null;
  headingTextStyle: React.CSSProperties;
  network: DirectoryNetwork;
  includeFilter: DirectoryIncludeOption;
  viewerFid: number;
  signer: DirectoryFollowButtonProps["signer"];
};

export const DirectoryListView: React.FC<DirectoryListViewProps> = ({
  members,
  settings,
  tokenSymbol,
  headingTextStyle,
  network,
  includeFilter,
  viewerFid,
  signer,
}) => {
  return (
    <ul className="divide-y divide-black/5">
      {members.map((member) => {
        const lastActivity = getLastActivityLabel(member.lastTransferAt);
        const fallbackAddress =
          member.primaryAddress ??
          (member.address?.startsWith("0x") ? member.address : null);
        const fallbackHref =
          (settings.source ?? "tokenHolders") === "tokenHolders" &&
          includeFilter === "allHolders" &&
          !member.username &&
          fallbackAddress
            ? getBlockExplorerLink(network, fallbackAddress)
            : undefined;
        const primaryLabel = getMemberPrimaryLabel(member);
        const secondaryLabel = getMemberSecondaryLabel(member);
        return (
          <li key={`${member.fid ?? member.address}`} className="flex items-center gap-3 py-3">
            <ProfileLink username={member.username} fallbackHref={fallbackHref}>
              <Avatar className="size-11 shrink-0">
                <AvatarImage
                  src={getMemberAvatarSrc(member)}
                  alt={primaryLabel}
                />
                <AvatarFallback className="bg-black/5 text-xs">
                  {!member.username && !member.ensName ? (
                    <BoringAvatar
                      size={44}
                      name={member.address}
                      variant="beam"
                    />
                  ) : (
                    getMemberAvatarFallback(member)
                  )}
                </AvatarFallback>
              </Avatar>
            </ProfileLink>
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <ProfileLink
                  username={member.username}
                  fallbackHref={fallbackHref}
                  className="block truncate font-semibold hover:underline"
                >
                  <span style={headingTextStyle}>{primaryLabel}</span>
                </ProfileLink>
                <BadgeIcons
                  username={member.username}
                  ensName={member.ensName}
                  ensAvatarUrl={member.ensAvatarUrl}
                  fid={member.fid}
                  primaryAddress={
                    member.primaryAddress ??
                    (member.address?.startsWith("0x") ? member.address : null)
                  }
                  etherscanUrl={
                    member.etherscanUrl ??
                    (member.address?.startsWith("0x")
                      ? buildEtherscanUrl(member.address)
                      : null)
                  }
                  xHandle={member.xHandle}
                  xUrl={member.xUrl}
                  githubHandle={member.githubHandle}
                  githubUrl={member.githubUrl}
                  size={16}
                />
              </div>
              {secondaryLabel && (
                <span className="block truncate text-xs text-muted-foreground">{secondaryLabel}</span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <DirectoryFollowButton
                member={member}
                viewerFid={viewerFid}
                signer={signer}
                className="px-3 py-1 text-xs font-semibold"
              />
              <div className="flex flex-col items-end gap-1 text-right text-xs text-muted-foreground">
                {(settings.source ?? "tokenHolders") === "tokenHolders" && (
                  <span className="font-semibold" style={headingTextStyle}>
                    {formatTokenBalance(member.balanceFormatted)}
                    {tokenSymbol ? ` ${tokenSymbol}` : ""}
                  </span>
                )}
                {typeof member.followers === "number" && (
                  <span>{`${member.followers.toLocaleString()} followers`}</span>
                )}
                {(settings.source ?? "tokenHolders") === "tokenHolders" && lastActivity && (
                  <span>{lastActivity}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

