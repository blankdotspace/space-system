"use client";

import React, { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useNotifications } from "@/common/lib/hooks/useNotifications";
import { useCurrentFid } from "@/common/lib/hooks/useCurrentFid";
import { FaCircleExclamation } from "react-icons/fa6";
import { FaReply } from "react-icons/fa6";
import {
  HeartIcon,
  UserPlusIcon,
  ArrowPathRoundedSquareIcon,
  AtSymbolIcon,
} from "@heroicons/react/24/outline";
import { Notification, NotificationTypeEnum, User } from "@neynar/nodejs-sdk/build/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/atoms/tabs";
import { Alert, AlertDescription } from "@/common/components/atoms/alert";
import { CastAvatar, CastBody, PriorityLink } from "@/fidgets/farcaster/components/CastRow";
import Loading from "@/common/components/molecules/Loading";
import { useInView } from "react-intersection-observer";
import { useCurrentSpaceIdentityPublicKey } from "@/common/lib/hooks/useCurrentSpaceIdentityPublicKey";
import {
  useNotificationsLastSeenCursor,
  useMutateNotificationsLastSeenCursor,
} from "@/common/lib/hooks/useNotificationsLastSeenCursor";
import moment from "moment";
import useDelayedValueChange from "@/common/lib/hooks/useDelayedValueChange";
import { useRouter } from "next/navigation";
import { useUIColors } from "@/common/lib/hooks/useUIColors";

const TAB_OPTIONS = {
  ALL: "all",
  MENTIONS: NotificationTypeEnum.Mention,
  FOLLOWS: NotificationTypeEnum.Follows,
  RECASTS: NotificationTypeEnum.Recasts,
  REPLIES: NotificationTypeEnum.Reply,
  LIKES: NotificationTypeEnum.Likes,
};

export type NotificationRowProps = React.FC<{
  notification: Notification;
  onSelect: (castHash: string, username: string) => void;
  isUnseen?: boolean;
  fontColor: string;
  secondaryTextColor: string;
  borderColor: string;
  fontFamily: string;
}>;

// Type guard to safely extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
};

const ErrorPanel = ({ message }: { message: string }) => {
  return (
    <Alert variant="destructive">
      <FaCircleExclamation className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

const FormattedUsersText = ({ users, fontColor }: { users: User[]; fontColor: string }) => {
  if (users.length === 0) {
    return "Nobody";
  }

  const firstUserLink = (
    <PriorityLink
      href={`/s/${users[0].username}`}
      className="hover:underline font-semibold"
      style={{ color: fontColor }}
    >
      {users[0].display_name}
    </PriorityLink>
  );

  if (users.length === 1) {
    return firstUserLink;
  } else if (users.length === 2) {
    return <>{firstUserLink} and 1 other</>;
  } else {
    return (
      <>
        {firstUserLink} and {users.length - 1} others
      </>
    );
  }
};

const getNotificationActionText = (type: NotificationTypeEnum): string => {
  switch (type) {
    case NotificationTypeEnum.Follows:
      return "followed you";
    case NotificationTypeEnum.Recasts:
      return "recasted your cast";
    case NotificationTypeEnum.Quote:
      return "quoted your cast";
    case NotificationTypeEnum.Likes:
      return "liked your cast";
    case NotificationTypeEnum.Mention:
      return "mentioned you";
    case NotificationTypeEnum.Reply:
      return "replied to your cast";
    default:
      return "interacted with your content";
  }
};

const getNotificationIcon = (type: NotificationTypeEnum): React.ReactNode => {
  switch (type) {
    case NotificationTypeEnum.Follows:
      return <UserPlusIcon className="text-blue-500 w-3 h-3" />;
    case NotificationTypeEnum.Recasts:
    case NotificationTypeEnum.Quote:
      return <ArrowPathRoundedSquareIcon className="text-green-500 w-3 h-3" />;
    case NotificationTypeEnum.Likes:
      return <HeartIcon className="text-red-500 w-3 h-3" />;
    case NotificationTypeEnum.Mention:
      return <AtSymbolIcon className="text-purple-500 w-3 h-3" />;
    case NotificationTypeEnum.Reply:
      return <FaReply className="text-blue-500 w-3 h-3" />;
    default:
      return null;
  }
};

const NotificationRow: NotificationRowProps = ({
  notification,
  onSelect,
  isUnseen = false,
  fontColor,
  secondaryTextColor,
  borderColor,
  fontFamily,
}) => {
  const handleClick = useCallback(() => {
    if (notification.cast?.hash && notification.cast?.author?.username) {
      onSelect(notification.cast.hash, notification.cast.author.username);
    }
  }, [notification, onSelect]);

  // Get users based on notification type
  const getRelatedUsers = (): User[] => {
    if (notification.reactions) {
      return notification.reactions.map((r) => r.user);
    }
    if (notification.follows) {
      return notification.follows.map((f) => f.user);
    }
    if (notification.cast?.author) {
      return [notification.cast.author];
    }
    return [];
  };

  const relatedUsers = getRelatedUsers();
  const maxAvatarsToShow = 4;
  const showAvatars =
    relatedUsers.length > 1 ||
    notification.type === NotificationTypeEnum.Follows ||
    notification.type === NotificationTypeEnum.Likes ||
    notification.type === NotificationTypeEnum.Recasts ||
    notification.type === NotificationTypeEnum.Quote ||
    notification.type === NotificationTypeEnum.Mention ||
    notification.type === NotificationTypeEnum.Reply;

  return (
    <div
      className={`
        px-4 py-3 border-b cursor-pointer transition-all duration-200 hover:bg-[rgba(128,128,128,0.08)]
        ${isUnseen ? "bg-blue-50/30 border-l-4 border-l-blue-500" : ""}
      `}
      onClick={handleClick}
      style={{
        borderTopColor: borderColor,
        borderRightColor: borderColor,
        borderBottomColor: borderColor,
        borderLeftColor: isUnseen ? undefined : borderColor,
        color: fontColor,
        fontFamily,
      }}
    >
      {/* Avatars row (for all notification types) */}
      {showAvatars && relatedUsers.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          {/* Notification icon for group actions or single action indicator */}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
              notification.type === NotificationTypeEnum.Likes
                ? "bg-red-500"
                : notification.type === NotificationTypeEnum.Follows
                  ? "bg-blue-500"
                  : notification.type === NotificationTypeEnum.Recasts ||
                      notification.type === NotificationTypeEnum.Quote
                    ? "bg-green-500"
                    : notification.type === NotificationTypeEnum.Mention
                      ? "bg-purple-500"
                      : notification.type === NotificationTypeEnum.Reply
                        ? "bg-orange-500"
                        : "bg-gray-500"
            }`}
          >
            {notification.type === NotificationTypeEnum.Likes ? (
              <HeartIcon className="text-white w-4 h-4" />
            ) : notification.type === NotificationTypeEnum.Follows ? (
              <UserPlusIcon className="text-white w-4 h-4" />
            ) : notification.type === NotificationTypeEnum.Recasts ||
              notification.type === NotificationTypeEnum.Quote ? (
              <ArrowPathRoundedSquareIcon className="text-white w-4 h-4" />
            ) : notification.type === NotificationTypeEnum.Mention ? (
              <AtSymbolIcon className="text-white w-4 h-4" />
            ) : notification.type === NotificationTypeEnum.Reply ? (
              <FaReply className="text-white w-4 h-4" />
            ) : (
              getNotificationIcon(notification.type)
            )}
          </div>

          {/* User avatars */}
          <div className="flex -space-x-2">
            {relatedUsers.slice(0, maxAvatarsToShow).map((user, index) => (
              <CastAvatar
                key={user.fid || index}
                user={user}
                className="w-8 h-8 border-2 border-background hover:z-20"
              />
            ))}
            {/* Show overflow indicator */}
            {relatedUsers.length > maxAvatarsToShow && (
              <div
                className="w-8 h-8 bg-muted border-2 border-background rounded-full flex items-center justify-center text-xs font-medium"
                style={{ color: secondaryTextColor, borderColor }}
              >
                +{relatedUsers.length - maxAvatarsToShow}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content row */}
      <div className="flex">
        {/* Right side - Content */}
        <div className="flex-1 min-w-0">
          {/* Header with users and action */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <FormattedUsersText users={relatedUsers} fontColor={fontColor} />
            </div>
            <span className="text-sm opacity-80" style={{ color: secondaryTextColor }}>
              {getNotificationActionText(notification.type)}
            </span>
            <span className="text-xs opacity-80" style={{ color: secondaryTextColor }}>
              •
            </span>
            <span className="text-xs opacity-80" style={{ color: secondaryTextColor }}>
              {moment(notification.most_recent_timestamp).fromNow()}
            </span>
          </div>

          {/* Cast content if present */}
          {notification.cast && (
            <div className="mt-2 text-sm opacity-90" style={{ color: secondaryTextColor }}>
              <CastBody
                cast={notification.cast}
                castTextStyle={{
                  fontSize: "14px",
                  lineHeight: "1.4",
                  color: fontColor,
                  fontWeight: "400",
                  fontFamily,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const isNotificationUnseen = (
  notification: Notification,
  lastSeenNotificationDate?: moment.Moment | null
): boolean | undefined => {
  if (lastSeenNotificationDate === undefined) return undefined;
  if (lastSeenNotificationDate === null) return true;

  return moment.utc(notification.most_recent_timestamp).isAfter(lastSeenNotificationDate);
};

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div>Loading notifications...</div>}>
      <NotificationsPageContent />
    </Suspense>
  );
}

function NotificationsPageContent() {
  const [tab, setTab] = useState<string>(TAB_OPTIONS.ALL);
  const fid = useCurrentFid();
  const identityPublicKey = useCurrentSpaceIdentityPublicKey();
  const { data, error, fetchNextPage, hasNextPage, isFetching } = useNotifications(fid);
  const [ref] = useInView({
    skip: !hasNextPage || isFetching,
    onChange: (_inView) => {
      if (_inView) {
        fetchNextPage();
      }
    },
  });

  const { data: lastSeenNotificationTimestamp } = useNotificationsLastSeenCursor(fid, identityPublicKey);

  const { mutate: updateLastSeenCursor } = useMutateNotificationsLastSeenCursor(fid, identityPublicKey);

  const router = useRouter();
  const uiColors = useUIColors();
  const castButtonColors = useMemo(
    () => ({
      backgroundColor: uiColors.castButton.backgroundColor,
      fontColor: uiColors.castButtonFontColor,
    }),
    [uiColors.castButton.backgroundColor, uiColors.castButtonFontColor]
  );
  const tabBarBackground = "rgba(128, 128, 128, 0.2)";
  const borderColor = "rgba(128, 128, 128, 0.2)";
  const secondaryTextColor = uiColors.fontColor;

  const onTabChange = useCallback((value: string) => {
    setTab(value);
  }, []);

  const onSelectNotification = useCallback(
    (hash: string, username: string) => {
      router.push(`/homebase/c/${username}/${hash}`);
    },
    [router]
  );

  const filterByType = useCallback(
    (_notifications: Notification[]): Notification[] => {
      if (tab === TAB_OPTIONS.ALL) {
        return _notifications;
      }

      if (tab === TAB_OPTIONS.RECASTS) {
        return _notifications.filter(
          (notification) =>
            notification.type === NotificationTypeEnum.Recasts || notification.type === NotificationTypeEnum.Quote
        );
      }

      return _notifications.filter((notification) => notification.type === tab);
    },
    [tab]
  );

  const lastSeenNotificationDate = useMemo<moment.Moment | null | undefined>(() => {
    return typeof lastSeenNotificationTimestamp === "string"
      ? moment.parseZone(lastSeenNotificationTimestamp)
      : lastSeenNotificationTimestamp;
  }, [lastSeenNotificationTimestamp]);

  const mostRecentNotificationTimestamp: string | null = useMemo(() => {
    if (data?.pages?.length && data.pages[0]?.notifications?.length > 0) {
      return data.pages[0].notifications[0].most_recent_timestamp;
    }
    return null;
  }, [data]);

  const shouldUpdateNotificationsCursor: boolean = useMemo(() => {
    if (tab !== TAB_OPTIONS.ALL) return false;
    if (!mostRecentNotificationTimestamp) return false;

    // Return false if user is not authenticated or system is not ready
    if (!fid || !identityPublicKey) return false;
    if (lastSeenNotificationTimestamp === undefined) return false;

    if (!lastSeenNotificationDate) return true;

    return moment.utc(mostRecentNotificationTimestamp).isAfter(lastSeenNotificationDate);
  }, [
    tab,
    mostRecentNotificationTimestamp,
    lastSeenNotificationDate,
    fid,
    identityPublicKey,
    lastSeenNotificationTimestamp,
  ]);

  const updateNotificationsCursor = useCallback(() => {
    if (shouldUpdateNotificationsCursor && mostRecentNotificationTimestamp) {
      updateLastSeenCursor({
        lastSeenTimestamp: mostRecentNotificationTimestamp,
      });
    }
  }, [updateLastSeenCursor, mostRecentNotificationTimestamp, shouldUpdateNotificationsCursor]);

  useEffect(() => {
    if (shouldUpdateNotificationsCursor) {
      updateNotificationsCursor();
    }
  }, [updateNotificationsCursor, shouldUpdateNotificationsCursor]);

  // On page load, the lastSeenCursor is updated, which immediately clears the badge count in the nav.
  // To make it apparent which notifications are new, this delays the visual clearing of the unseen
  // notifications to keep them highlighted for an extra n seconds after being marked seen in the db.
  const delayedLastSeenNotificationDate = useDelayedValueChange(
    lastSeenNotificationDate,
    20000,
    function shouldDelay(prev, curr) {
      const wasJustCreated = moment.isMoment(curr) && prev === null;
      const wasJustUpdated = moment.isMoment(curr) && moment.isMoment(prev);
      return wasJustCreated || wasJustUpdated;
    }
  );

  return (
    <div
      className="w-full min-h-screen"
      style={{
        backgroundColor: uiColors.backgroundColor,
        color: uiColors.fontColor,
        fontFamily: uiColors.fontFamily,
      }}
    >
      <Tabs value={tab} onValueChange={onTabChange} className="min-h-full">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div
            className="px-4 py-4 border-b sticky top-0 z-10"
            style={{ borderColor, backgroundColor: uiColors.backgroundColor }}
          >
            <h1
              className="text-xl font-semibold mb-4"
              style={{ color: uiColors.fontColor, fontFamily: uiColors.fontFamily }}
            >
              Notifications
            </h1>
            <div className="overflow-x-auto pb-2 -mx-4 px-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
              <TabsList
                className="grid min-w-[600px] md:min-w-fit w-full grid-cols-6 max-w-2xl"
                style={{
                  backgroundColor: tabBarBackground,
                  fontFamily: uiColors.fontFamily,
                  borderColor,
                }}
              >
                <TabsTrigger
                  value={TAB_OPTIONS.ALL}
                  className="data-[state=active]:bg-[var(--tab-active-bg)] data-[state=active]:text-[var(--tab-active-color)]"
                  style={{
                    color: uiColors.fontColor,
                    fontFamily: uiColors.fontFamily,
                    ["--tab-active-bg" as string]: castButtonColors.backgroundColor,
                    ["--tab-active-color" as string]: castButtonColors.fontColor,
                  }}
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value={TAB_OPTIONS.MENTIONS}
                  className="data-[state=active]:bg-[var(--tab-active-bg)] data-[state=active]:text-[var(--tab-active-color)]"
                  style={{
                    color: uiColors.fontColor,
                    fontFamily: uiColors.fontFamily,
                    ["--tab-active-bg" as string]: castButtonColors.backgroundColor,
                    ["--tab-active-color" as string]: castButtonColors.fontColor,
                  }}
                >
                  Mentions
                </TabsTrigger>
                <TabsTrigger
                  value={TAB_OPTIONS.FOLLOWS}
                  className="data-[state=active]:bg-[var(--tab-active-bg)] data-[state=active]:text-[var(--tab-active-color)]"
                  style={{
                    color: uiColors.fontColor,
                    fontFamily: uiColors.fontFamily,
                    ["--tab-active-bg" as string]: castButtonColors.backgroundColor,
                    ["--tab-active-color" as string]: castButtonColors.fontColor,
                  }}
                >
                  Follows
                </TabsTrigger>
                <TabsTrigger
                  value={TAB_OPTIONS.RECASTS}
                  className="data-[state=active]:bg-[var(--tab-active-bg)] data-[state=active]:text-[var(--tab-active-color)]"
                  style={{
                    color: uiColors.fontColor,
                    fontFamily: uiColors.fontFamily,
                    ["--tab-active-bg" as string]: castButtonColors.backgroundColor,
                    ["--tab-active-color" as string]: castButtonColors.fontColor,
                  }}
                >
                  Recasts
                </TabsTrigger>
                <TabsTrigger
                  value={TAB_OPTIONS.REPLIES}
                  className="data-[state=active]:bg-[var(--tab-active-bg)] data-[state=active]:text-[var(--tab-active-color)]"
                  style={{
                    color: uiColors.fontColor,
                    fontFamily: uiColors.fontFamily,
                    ["--tab-active-bg" as string]: castButtonColors.backgroundColor,
                    ["--tab-active-color" as string]: castButtonColors.fontColor,
                  }}
                >
                  Replies
                </TabsTrigger>
                <TabsTrigger
                  value={TAB_OPTIONS.LIKES}
                  className="data-[state=active]:bg-[var(--tab-active-bg)] data-[state=active]:text-[var(--tab-active-color)]"
                  style={{
                    color: uiColors.fontColor,
                    fontFamily: uiColors.fontFamily,
                    ["--tab-active-bg" as string]: castButtonColors.backgroundColor,
                    ["--tab-active-color" as string]: castButtonColors.fontColor,
                  }}
                >
                  Likes
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value={tab} className="mt-0">
            {/* Notifications List */}
            <div className="relative">
              <Suspense fallback={<div className="p-4 text-center" style={{ color: secondaryTextColor }}>Loading...</div>}>
                {data?.pages?.map((page, pageIndex) => (
                  <React.Fragment key={pageIndex}>
                    {filterByType(page?.notifications ?? []).map((notification, pageItemIndex) => {
                      const isUnseen = isNotificationUnseen(notification, delayedLastSeenNotificationDate);
                      // Create a stable key from notification properties instead of index
                      const notificationKey = (notification as any).id ?? 
                        (notification as any).uuid ?? 
                        `${notification.type}-${notification.most_recent_timestamp}-${notification.cast?.hash ?? pageItemIndex}`;
                      
                      return (
                        <NotificationRow
                          notification={notification}
                          onSelect={onSelectNotification}
                          isUnseen={isUnseen}
                          fontColor={uiColors.fontColor}
                          secondaryTextColor={secondaryTextColor}
                          borderColor={borderColor}
                          fontFamily={uiColors.fontFamily}
                          key={notificationKey}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </Suspense>
            </div>

            {error && (
              <div className="p-4">
                <ErrorPanel message={getErrorMessage(error)} />
              </div>
            )}

            {!error && (
              <div ref={ref} className="h-[100px] flex items-center justify-center">
                {isFetching && (
                  <div className="h-full w-full flex flex-col justify-center items-center">
                    <Loading />
                  </div>
                )}
                {!isFetching && !hasNextPage && (
                  <p className="text-sm" style={{ color: secondaryTextColor }}>
                    No more notifications
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
