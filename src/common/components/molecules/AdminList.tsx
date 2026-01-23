"use client";

import React from "react";
import type { CommunityAdminProfile } from "@/common/lib/utils/loadCommunityAdminProfiles";

type AdminListProps = {
  admins: CommunityAdminProfile[];
};

const formatIdentitySnippet = (identityPublicKey: string) =>
  `${identityPublicKey.slice(0, 6)}…${identityPublicKey.slice(-4)}`;

const getInitials = (value?: string) =>
  value?.trim().slice(0, 2).toUpperCase() ?? "?";

export const AdminList = ({ admins }: AdminListProps) => {
  if (admins.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        No community administrators have been publicly configured for this space system yet.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {admins.map((admin) => {
        const displayName = admin.displayName || admin.username || "Community administrator";
        const profileHref = admin.username ? `/s/${admin.username}` : undefined;
        const identitySnippet = formatIdentitySnippet(admin.identityPublicKey);
        const initials = getInitials(admin.username || admin.displayName);

        return (
          <li key={admin.identityPublicKey} className="flex items-center gap-4">
            {admin.pfpUrl ? (
              <img
                src={admin.pfpUrl}
                alt={displayName}
                className="h-12 w-12 rounded-full border border-gray-200 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                {initials}
              </div>
            )}
            <div className="flex flex-col">
              {profileHref ? (
                <a href={profileHref} className="text-base font-semibold text-blue-600">
                  {displayName}
                </a>
              ) : (
                <span className="text-base font-semibold text-gray-900">{displayName}</span>
              )}
              {admin.username ? (
                <span className="text-sm text-gray-500">@{admin.username}</span>
              ) : (
                <span className="text-xs text-gray-400">Identity: {identitySnippet}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
