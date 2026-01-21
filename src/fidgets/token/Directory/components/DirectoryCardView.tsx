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

export type DirectoryCardViewProps = {
  members: DirectoryMemberData[];
  settings: DirectoryFidgetSettings;
  tokenSymbol?: string | null;
  headingTextStyle: React.CSSProperties;
  headingFontFamilyStyle: React.CSSProperties;
  network: DirectoryNetwork;
  includeFilter: DirectoryIncludeOption;
  viewerFid: number;
  signer: DirectoryFollowButtonProps["signer"];
};

export const DirectoryCardView: React.FC<DirectoryCardViewProps> = ({
  members,
  settings,
  tokenSymbol,
  headingTextStyle,
  headingFontFamilyStyle,
  network,
  includeFilter,
  viewerFid,
  signer,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <div key={`${member.fid ?? member.address}`} className="relative h-full">
            {/* Card content as link */}
            <ProfileLink
              username={member.username}
              fallbackHref={fallbackHref}
              className="flex h-full flex-col gap-3 rounded-xl border border-black/5 bg-white/80 p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage
                    src={getMemberAvatarSrc(member)}
                    alt={primaryLabel}
                  />
                  <AvatarFallback className="bg-black/5 text-sm font-semibold">
                    {!member.username && !member.ensName ? (
                      <BoringAvatar
                        size={48}
                        name={member.address}
                        variant="beam"
                      />
                    ) : (
                      getMemberAvatarFallback(member)
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex flex-col text-sm">
                  <span className="block truncate font-semibold" style={headingTextStyle}>
                    {primaryLabel}
                  </span>
                  {secondaryLabel && (
                    <span className="block truncate text-xs text-muted-foreground">{secondaryLabel}</span>
                  )}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {(settings.source ?? "tokenHolders") === "tokenHolders" && (
                  <div>
                    <dt className="uppercase tracking-wide" style={headingFontFamilyStyle}>Holdings</dt>
                    <dd className="font-semibold" style={headingTextStyle}>
                      {formatTokenBalance(member.balanceFormatted)}
                      {tokenSymbol ? ` ${tokenSymbol}` : ""}
                    </dd>
                  </div>
                )}
                {typeof member.followers === "number" && (
                  <div>
                    <dt className="uppercase tracking-wide" style={headingFontFamilyStyle}>Followers</dt>
                    <dd className="font-semibold" style={headingTextStyle}>
                      {member.followers.toLocaleString()}
                    </dd>
                  </div>
                )}
                {(settings.source ?? "tokenHolders") === "tokenHolders" && lastActivity && (
                  <div className="col-span-2 text-xs">
                    <dt className="uppercase tracking-wide">Last activity</dt>
                    <dd>{lastActivity}</dd>
                  </div>
                )}
              </dl>
            </ProfileLink>
            {/* Badges overlay top-right */}
            <div className="pointer-events-auto absolute right-2 top-2 z-10 flex items-center gap-1">
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
                size={18}
              />
            </div>
            <div className="pointer-events-none absolute bottom-3 right-3 z-10">
              <DirectoryFollowButton
                member={member}
                viewerFid={viewerFid}
                signer={signer}
                className="pointer-events-auto px-3 py-1 text-xs font-semibold"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

