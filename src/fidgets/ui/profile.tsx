import { Button } from "@/common/components/atoms/button";
import { toFarcasterCdnUrl } from "@/common/lib/utils/farcasterCdn";
import TextInput from "@/common/components/molecules/TextInput";
import { useLoadFarcasterUser } from "@/common/data/queries/farcaster";
import { FidgetArgs, FidgetModule, FidgetProperties } from "@/common/fidgets";
import { defaultStyleFields } from "@/fidgets/helpers";
import { User } from "@neynar/nodejs-sdk/build/api";
import { first, isUndefined } from "lodash";
import React, { useMemo, useState } from "react";
import { CgProfile } from "react-icons/cg";
import { useFarcasterSigner } from "../farcaster";
import FarcasterLinkify from "../farcaster/components/linkify";
import { followUser, unfollowUser } from "../farcaster/utils";
import { useIsMobile } from "@/common/lib/hooks/useIsMobile";
import { BsPerson, BsPersonFill } from "react-icons/bs";
import { IoLocationOutline } from "react-icons/io5";

export type ProfileFidgetSettings = {
  fid: number;
};

const profileProperties: FidgetProperties = {
  fidgetName: "Profile",
  icon: 0x1f464, // This is the hex code for an emoji
  mobileIcon: <BsPerson size={24} />,
  mobileIconSelected: <BsPersonFill size={24} />,
  fields: [
    {
      fieldName: "fid",
      default: null,
      required: true,
      inputSelector: TextInput,
    },
    ...defaultStyleFields,
  ],
  size: {
    minHeight: 3,
    maxHeight: 36,
    minWidth: 4,
    maxWidth: 36,
  },
};

const Profile: React.FC<FidgetArgs<ProfileFidgetSettings>> = ({
  settings: { fid },
}) => {
  const isMobile = useIsMobile();
  const { fid: viewerFid, signer, getOrCreateSigner, isLoadingSigner } =
    useFarcasterSigner("Profile");
  const { data: userData } = useLoadFarcasterUser(
    fid,
    viewerFid > 0 ? viewerFid : undefined
  );

  const [actionStatus, setActionStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");

  const user: User | undefined = useMemo(() => {
    if (isUndefined(userData)) {
      return undefined;
    }
    return first(userData.users);
  }, [userData]);

  // console.log("user", user);

  const toggleFollowing = async () => {
    if (user && viewerFid > 0) {
      if (isLoadingSigner) return;
      const activeSigner = signer ?? (await getOrCreateSigner());
      if (!activeSigner) return;
      setActionStatus("loading");

      // Optimistically update the user's following state
      const wasFollowing = user.viewer_context?.following ?? false;
      user.viewer_context = {
        following: !wasFollowing,
        followed_by: user.viewer_context?.followed_by ?? false,
        blocking: user.viewer_context?.blocking ?? false,
        blocked_by: user.viewer_context?.blocked_by ?? false,
      };

      try {
        let success;
        if (wasFollowing) {
          success = await unfollowUser(fid, viewerFid, activeSigner);
        } else {
          success = await followUser(fid, viewerFid, activeSigner);
        }

        if (!success) {
          throw new Error("Failed to update follow status.");
        }
      } catch (error) {
        // Revert the optimistic update if the operation fails
        user.viewer_context = {
          ...user.viewer_context,
          following: wasFollowing,
        };
        setActionStatus("error");
        // Removido: setErrorMessage não é mais necessário
      } finally {
        // Reset status after some delay
        setTimeout(() => setActionStatus("idle"), 3000);
      }
    }
  };

  if (isUndefined(user)) {
    return (
      <div className="flex flex-row h-full overflow-auto p-6 animate-pulse">
        <div className="h-full max-h-24 max-w-24">
          <CgProfile className="text-gray-200 dark:text-gray-700 me-4 aspect-square rounded-full max-h-full h-full w-full"></CgProfile>
        </div>
        <div className="w-4/6 flex flex-col pl-6">
          <div className="flex flex-col">
            <span className="w-full h-5 bg-gray-200 rounded-full dark:bg-gray-700 m-1"></span>
            <small className="w-20 h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 m-1"></small>
          </div>
          <div className="flex flex-row text-sm">
            <p className="mr-6 w-20 h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 m-1"></p>
            <p className="w-20 h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 m-1"></p>
          </div>
          <div className="text-sm mt-4 w-full h-10 bg-gray-200 rounded-full dark:bg-gray-700 "></div>
        </div>
      </div>
    );
  }

  // Extract location if available
  // DISABLE: @_ts-expect-error > maybe update the neynar package solves this
  const location = user.profile?.location?.address?.city || "";
  // const location = 'teste';
  const hasLocation = location.length > 0;

  const bioText = user.profile?.bio?.text || "";
  const uiFontFamily =
    "var(--ns-nav-font, var(--font-sans, Inter, system-ui, -apple-system, sans-serif))";
  const uiFontColor = "var(--ns-nav-font-color, #0f172a)";
  
  return (
    <div
      className={`flex flex-col h-full overflow-auto ${isMobile ? 'px-3 py-3' : 'px-4 py-4'}`}
      style={{
        fontFamily: uiFontFamily,
        color: uiFontColor,
        backgroundColor: "var(--ns-background-color, #ffffff)",
      }}
    >
      <div className="flex flex-row items-center mb-4">
        <div className={`${isMobile ? 'h-12 w-12' : 'h-14 w-14'} mr-4`}>
          {user.pfp_url ? (
            <img
              className="aspect-square rounded-full max-h-full object-cover"
              src={toFarcasterCdnUrl(user.pfp_url || '')}
            />
          ) : (
            <CgProfile className="text-gray-200 dark:text-gray-700 me-4 aspect-square rounded-full max-h-full h-full w-full"></CgProfile>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xl">
            {user.display_name || user.username}
          </span>
          <small className="text-slate-500">@{user.username}</small>
        </div>
        {user.viewer_context && fid !== viewerFid && (
          <div className="ml-auto">
            <Button
              onClick={toggleFollowing}
              variant={
                user.viewer_context?.following ? "secondary" : "primary"
              }
              disabled={actionStatus === "loading"}
              className="px-3 py-1 text-sm"
            >
              {actionStatus === "loading"
                ? "..."
                : user.viewer_context?.following
                  ? "Unfollow"
                  : "Follow"}
            </Button>
          </div>
        )}
      </div>
      {/* Bio - full width on mobile */}
      {bioText && (
        <p className="text-sm mb-3 w-full">
          <FarcasterLinkify>{bioText}</FarcasterLinkify>
        </p>
      )}
      {/* Followers/Following count - underneath bio */}
      <div className="flex flex-row text-sm items-center gap-3">
        <p>
          <span className="font-bold">{user.following_count}</span> Following
        </p>
        <p>
          <span className="font-bold">{user.follower_count}</span> Followers
        </p>
        {hasLocation && (
          <div className="flex gap-0 items-center">
            <IoLocationOutline className="h-4 w-4 text-slate-500 inline-block mr-1" />
            <p className="text-slate-500">{location}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default {
  fidget: Profile,
  properties: profileProperties,
} as FidgetModule<FidgetArgs<ProfileFidgetSettings>>;
