import React from "react";
import Link from "next/link";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";

export type ProfileLinkProps = {
  username?: string | null;
  fallbackHref?: string;
  className?: string;
  children: React.ReactNode;
};

export const ProfileLink: React.FC<ProfileLinkProps> = ({
  username,
  fallbackHref,
  className,
  children,
}) => {
  const href = username ? `/s/${username}` : fallbackHref;

  if (!href) {
    return <div className={mergeClasses("cursor-default", className)}>{children}</div>;
  }

  const baseClassName = mergeClasses(
    "transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    className,
  );

  if (username) {
    return (
      <Link href={href} prefetch={false} className={baseClassName}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={baseClassName} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
};

