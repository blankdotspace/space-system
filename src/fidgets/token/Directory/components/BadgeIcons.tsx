import React from "react";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import {
  FARCASTER_BADGE_SRC,
  ENS_BADGE_SRC,
  X_BADGE_SRC,
  GITHUB_BADGE_SRC,
  ETHERSCAN_BADGE_SRC,
} from "../constants";
import { getFarcasterProfileUrl, getEnsProfileUrl } from "../utils";

export type BadgeIconsProps = {
  username?: string | null;
  ensName?: string | null;
  ensAvatarUrl?: string | null;
  fid?: number | null;
  primaryAddress?: string | null;
  etherscanUrl?: string | null;
  xHandle?: string | null;
  xUrl?: string | null;
  githubHandle?: string | null;
  githubUrl?: string | null;
  size?: number; // px
  gapClassName?: string;
};

export const BadgeIcons: React.FC<BadgeIconsProps> = ({
  username,
  ensName,
  ensAvatarUrl,
  fid,
  primaryAddress,
  etherscanUrl,
  xHandle,
  xUrl,
  githubHandle,
  githubUrl,
  size = 16,
  gapClassName,
}) => {
  const normalizedUsername = username?.replace(/^@/, "").trim();
  const hasFarcasterIdentity =
    Boolean(normalizedUsername && normalizedUsername.length > 0) ||
    typeof fid === "number";
  const farcasterUrl = hasFarcasterIdentity
    ? getFarcasterProfileUrl(normalizedUsername, fid)
    : null;

  const hasEnsIdentity =
    Boolean(ensName && ensName.trim().length > 0) ||
    Boolean(ensAvatarUrl && ensAvatarUrl.trim().length > 0);
  const ensUrl = hasEnsIdentity ? getEnsProfileUrl(ensName?.trim()) : null;

  const normalizedPrimaryAddress = primaryAddress
    ? primaryAddress.trim().toLowerCase()
    : null;
  const resolvedEtherscanUrl =
    etherscanUrl ??
    (normalizedPrimaryAddress
      ? `https://etherscan.io/address/${normalizedPrimaryAddress}`
      : null);

  const normalizedXHandle = xHandle?.replace(/^@/, "").trim() || "";
  const fallbackXHandleFromUrl =
    !normalizedXHandle && xUrl
      ? xUrl.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "").replace(/\/+$/, "")
      : "";
  const finalXHandle = normalizedXHandle || fallbackXHandleFromUrl || null;
  const finalXUrl =
    xUrl ?? (finalXHandle ? `https://twitter.com/${finalXHandle}` : null);
  const hasXIdentity = Boolean(finalXHandle || finalXUrl);

  const normalizedGithubHandle = githubHandle?.replace(/^@/, "").trim() || "";
  const fallbackGithubHandleFromUrl =
    !normalizedGithubHandle && githubUrl
      ? githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/+$/, "")
      : "";
  const finalGithubHandle =
    normalizedGithubHandle || fallbackGithubHandleFromUrl || null;
  const finalGithubUrl =
    githubUrl ?? (finalGithubHandle ? `https://github.com/${finalGithubHandle}` : null);
  const hasGithubIdentity = Boolean(finalGithubHandle || finalGithubUrl);

  const hasEtherscan = Boolean(resolvedEtherscanUrl);

  if (
    !hasFarcasterIdentity &&
    !hasEnsIdentity &&
    !hasXIdentity &&
    !hasGithubIdentity &&
    !hasEtherscan
  ) {
    return null;
  }

  const dim = `${size}px`;
  const imgClass = "rounded-full object-cover ring-1 ring-black/10";

  type BadgeEntry = {
    key: string;
    src: string;
    alt: string;
    title: string;
    href?: string | null;
  };

  const badges: BadgeEntry[] = [];

  if (hasFarcasterIdentity) {
    badges.push({
      key: "farcaster",
      src: FARCASTER_BADGE_SRC,
      alt: "Farcaster",
      title: normalizedUsername
        ? `Farcaster (@${normalizedUsername})`
        : "Farcaster profile",
      href: farcasterUrl,
    });
  }

  if (hasEnsIdentity) {
    badges.push({
      key: "ens",
      src: ENS_BADGE_SRC,
      alt: "ENS",
      title: ensName ? `ENS (${ensName})` : "ENS profile",
      href: ensUrl,
    });
  }

  if (hasXIdentity) {
    badges.push({
      key: "x",
      src: X_BADGE_SRC,
      alt: "X",
      title: finalXHandle ? `X (@${finalXHandle})` : "X profile",
      href: finalXUrl,
    });
  }

  if (hasGithubIdentity) {
    badges.push({
      key: "github",
      src: GITHUB_BADGE_SRC,
      alt: "GitHub",
      title: finalGithubHandle ? `GitHub (${finalGithubHandle})` : "GitHub profile",
      href: finalGithubUrl,
    });
  }

  if (hasEtherscan) {
    badges.push({
      key: "etherscan",
      src: ETHERSCAN_BADGE_SRC,
      alt: "Etherscan",
      title: normalizedPrimaryAddress
        ? `View ${normalizedPrimaryAddress} on Etherscan`
        : "View on Etherscan",
      href: resolvedEtherscanUrl,
    });
  }

  return (
    <div className={mergeClasses("flex items-center gap-1", gapClassName)}>
      {badges.map((badge) =>
        badge.href ? (
          <a
            key={badge.key}
            href={badge.href}
            target="_blank"
            rel="noreferrer"
            aria-label={badge.title}
            title={badge.title}
          >
            <img
              src={badge.src}
              alt={badge.alt}
              width={size}
              height={size}
              style={{ width: dim, height: dim }}
              className={imgClass}
            />
          </a>
        ) : (
          <span key={badge.key} className="inline-flex" aria-label={badge.title} title={badge.title}>
            <img
              src={badge.src}
              alt={badge.alt}
              width={size}
              height={size}
              style={{ width: dim, height: dim }}
              className={imgClass}
            />
          </span>
        ),
      )}
    </div>
  );
};

