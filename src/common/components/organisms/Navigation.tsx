import Player from "@/common/components/organisms/Player";
import { useLoadFarcasterUser } from "@/common/data/queries/farcaster";
import { useAppStore, useLogout } from "@/common/data/stores/app";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import { useFarcasterSigner } from "@/fidgets/farcaster";
import CreateCast from "@/fidgets/farcaster/components/CreateCast";
import { first } from "lodash";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CgProfile } from "react-icons/cg";
import {
    FaChevronLeft,
    FaChevronRight,
    FaDiscord,
    FaPaintbrush,
} from "react-icons/fa6";
import { Button } from "../atoms/button";
import BrandHeader from "../molecules/BrandHeader";
import Modal from "../molecules/Modal";
import { Badge } from "@/common/components/atoms/badge";
import useNotificationBadgeText from "@/common/lib/hooks/useNotificationBadgeText";
import { UserTheme } from "@/common/lib/theme";
import { useUserTheme } from "@/common/lib/theme/UserThemeProvider";
import { trackAnalyticsEvent } from "@/common/lib/utils/analyticsUtils";
import { NOUNISH_LOWFI_URL } from "@/constants/nounishLowfi";
import { usePathname } from "next/navigation";
import { RiQuillPenLine } from "react-icons/ri";
import HomeIcon from "../atoms/icons/HomeIcon";
import NotificationsIcon from "../atoms/icons/NotificationsIcon";
import RocketIcon from "../atoms/icons/RocketIcon";
import RobotIcon from "../atoms/icons/RobotIcon";
import SearchIcon from "../atoms/icons/SearchIcon";
import ExploreIcon from "../atoms/icons/ExploreIcon";
import LogoutIcon from "../atoms/icons/LogoutIcon";
import LoginIcon from "../atoms/icons/LoginIcon";
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";
import type { DialogContentProps } from "@radix-ui/react-dialog";
import { eventIsFromCastModalInteractiveRegion } from "@/common/lib/utils/castModalInteractivity";
import {
  CastModalPortalBoundary,
  CastDiscardPrompt,
} from "../molecules/CastModalHelpers";
import SearchModal, { SearchModalHandle } from "./SearchModal";
import { toFarcasterCdnUrl } from "@/common/lib/utils/farcasterCdn";
import { SystemConfig } from "@/config";
import { NavigationItem } from "@/config/systemConfig";
import { useUIColors } from "@/common/lib/hooks/useUIColors";
import { useCurrentSpaceIdentityPublicKey } from "@/common/lib/hooks/useCurrentSpaceIdentityPublicKey";
import { useSidebarContext } from "./Sidebar";
import { Reorder } from "framer-motion";
import { map, debounce } from "lodash";
import EditableText from "../atoms/editable-text";
import { CloseIcon } from "../atoms/icons/CloseIcon";
import { FaPlus, FaCheck, FaXmark } from "react-icons/fa6";
import { toast } from "sonner";

type NavItemProps = {
  label: string;
  active?: boolean;
  Icon: React.FC;
  href: string;
  disable?: boolean;
  openInNewTab?: boolean;
  badgeText?: string | null;
  onClick?: () => void;
};

type NavButtonProps = Omit<NavItemProps, "href" | "openInNewTab">;

type NavProps = {
  systemConfig: SystemConfig;
  isEditable: boolean;
  enterEditMode?: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
};

const NavIconBadge: React.FC<{
  children: React.ReactNode;
  systemConfig: SystemConfig;
}> = ({ children, systemConfig }) => {
  const uiColors = useUIColors({ systemConfig });
  return (
    <Badge
      className="justify-center text-[11px]/[12px] min-w-[18px] min-h-[18px] font-medium shadow-md px-[3px] rounded-full absolute left-[19px] top-[4px] border-white text-white"
      style={{ backgroundColor: uiColors.primaryColor }}
    >
      {children}
    </Badge>
  );
};

const Navigation = React.memo(
({
  systemConfig,
  isEditable,
  enterEditMode,
  mobile = false,
  onNavigate,
}: NavProps) => {
  const searchRef = useRef<SearchModalHandle | null>(null);
  const { setModalOpen, getIsAccountReady, getIsInitializing } = useAppStore(
    (state) => ({
      setModalOpen: state.setup.setModalOpen,
      getIsAccountReady: state.getIsAccountReady,
      getIsInitializing: state.getIsInitializing,
    })
  );
  const { editMode, setEditMode, navEditMode, setNavEditMode } = useSidebarContext();
  const currentUserIdentityPublicKey = useCurrentSpaceIdentityPublicKey();
  const userTheme: UserTheme = useUserTheme();
  const uiColors = useUIColors({ systemConfig });
  
  // Check if user is admin (can edit navigation)
  const adminIdentityPublicKeys = systemConfig.adminIdentityPublicKeys || [];
  const isNavigationEditable = currentUserIdentityPublicKey 
    ? adminIdentityPublicKeys.includes(currentUserIdentityPublicKey)
    : false;
  
  // Initialize navigation store from SystemConfig
  const {
    loadNavigation,
    localNavigation,
    hasUncommittedChanges,
    createNavigationItem,
    deleteNavigationItem,
    renameNavigationItem,
    updateNavigationOrder,
    commitNavigationChanges,
    resetNavigationChanges,
  } = useAppStore((state) => ({
    loadNavigation: state.navigation.loadNavigation,
    localNavigation: state.navigation.localNavigation,
    hasUncommittedChanges: state.navigation.hasUncommittedChanges,
    createNavigationItem: state.navigation.createNavigationItem,
    deleteNavigationItem: state.navigation.deleteNavigationItem,
    renameNavigationItem: state.navigation.renameNavigationItem,
    updateNavigationOrder: state.navigation.updateNavigationOrder,
    commitNavigationChanges: state.navigation.commitNavigationChanges,
    resetNavigationChanges: state.navigation.resetNavigationChanges,
  }));
  
  // Destructure navigation from systemConfig early
  const { community, navigation, ui } = systemConfig;
  
  React.useEffect(() => {
    loadNavigation(systemConfig.navigation);
  }, [systemConfig.navigation, loadNavigation]);
  
  // Always use localNavigation as the source of truth
  // It's initialized from systemConfig.navigation on mount and updated by user actions
  const navItemsToDisplay = localNavigation;
  
  // For backwards compatibility with code that uses configuredNavItems
  // Use navItemsToDisplay (which is localNavigation) as the configured items
  const configuredNavItems = navItemsToDisplay;
  
  // Debounced reorder handler
  const debouncedUpdateOrder = React.useCallback(
    debounce((newOrder: NavigationItem[]) => {
      updateNavigationOrder(newOrder);
    }, 300),
    [updateNavigationOrder]
  );
  
  // Handle commit
  const handleCommit = React.useCallback(async () => {
    if (!hasUncommittedChanges()) {
      toast.info("No changes to commit");
      return;
    }
    
    try {
      await commitNavigationChanges(systemConfig.community?.type || "nouns");
      toast.success("Navigation changes committed (local only - API endpoints pending)");
      setNavEditMode(false);
    } catch (error: any) {
      console.error("Failed to commit navigation changes:", error);
      if (error?.response?.status === 404) {
        toast.success("Navigation changes staged locally (API endpoints not yet implemented)");
        setNavEditMode(false);
      } else {
        toast.error("Failed to commit navigation changes");
      }
    }
  }, [hasUncommittedChanges, commitNavigationChanges, systemConfig.community?.type, setNavEditMode]);
  
  // Handle cancel
  const handleCancel = React.useCallback(() => {
    resetNavigationChanges();
    toast.info("Navigation changes cancelled");
    setNavEditMode(false);
  }, [resetNavigationChanges, setNavEditMode]);
  
  // Handle create new item
  const handleCreateItem = React.useCallback(async () => {
    try {
      await createNavigationItem({
        label: "New Item",
        href: "/new-item",
        icon: "custom",
        createSpace: true,
      });
      toast.success("Navigation item created");
    } catch (error) {
      console.error("Failed to create navigation item:", error);
      toast.error("Failed to create navigation item");
    }
  }, [createNavigationItem]);

  const logout = useLogout();
  const notificationBadgeText = useNotificationBadgeText();
  const pathname = usePathname();
  const discordUrl = community?.urls?.discord || "https://discord.gg/eYQeXU2WuH";
  
  // Get cast button colors from config, with fallback to blue
  const castButtonColors = {
    backgroundColor: uiColors.castButton.backgroundColor,
    hoverColor: uiColors.castButton.hoverColor,
    activeColor: uiColors.castButton.activeColor,
    fontColor: uiColors.castButtonFontColor,
  };
  const navTextStyle: React.CSSProperties = {
    color: uiColors.fontColor,
    fontFamily: uiColors.fontFamily,
  };

  const [shrunk, setShrunk] = useState(mobile ? false : true);
  const forcedExpansionRef = useRef(false);

  // Force sidebar to remain expanded while in navigation edit mode
  // Use a ref to track if we've already forced expansion in this edit session
  // to prevent render loops if external code flips shrunk back to true
  useEffect(() => {
    if (navEditMode && shrunk && !forcedExpansionRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Navigation] Forcing sidebar expansion due to navigation edit mode');
      }
      setShrunk(false);
      forcedExpansionRef.current = true;
    }
    
    // Clear the ref when exiting edit mode
    if (!navEditMode) {
      forcedExpansionRef.current = false;
    }
  }, [navEditMode, shrunk]);

  const toggleSidebar = () => {
    if (mobile || navEditMode) return; // Disable toggle during navigation edit mode
    setShrunk((prev) => !prev);
  };

  function handleLogout() {
    router.push("/home");
    logout();
  }

  const openModal = () => setModalOpen(true);

  const [showCastModal, setShowCastModal] = useState(false);
  const [shouldConfirmCastClose, setShouldConfirmCastClose] = useState(false);
  const [showCastDiscardPrompt, setShowCastDiscardPrompt] = useState(false);

  const closeCastModal = useCallback(() => {
    setShowCastModal(false);
    setShowCastDiscardPrompt(false);
    setShouldConfirmCastClose(false);
  }, []);

  function openCastModal() {
    setShowCastModal(true);
  }

  const handleCastModalChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (shouldConfirmCastClose) {
          setShowCastDiscardPrompt(true);
          return;
        }

        closeCastModal();
        return;
      }

      setShowCastDiscardPrompt(false);
      setShowCastModal(true);
    },
    [closeCastModal, shouldConfirmCastClose],
  );

  useEffect(() => {
    if (!shouldConfirmCastClose) {
      setShowCastDiscardPrompt(false);
    }
  }, [shouldConfirmCastClose]);

  const handleCastModalInteractOutside = useCallback<
    NonNullable<DialogContentProps["onInteractOutside"]>
  >(
    (event) => {
      // Type guard to check if event has the expected structure
      const hasDetailWithOriginalEvent = (
        e: unknown
      ): e is { detail?: { originalEvent?: unknown } } => {
        return typeof e === "object" && e !== null && "detail" in e;
      };

      // Type guard to check if target exists on event
      const hasTarget = (e: unknown): e is { target?: unknown } => {
        return typeof e === "object" && e !== null && "target" in e;
      };

      // Safely extract originalEvent if it exists and is an Event
      const originalEvent = hasDetailWithOriginalEvent(event) && 
        event.detail?.originalEvent instanceof Event
        ? event.detail.originalEvent
        : undefined;

      // Safely extract eventTarget from originalEvent or fallback to event target
      const eventTarget = originalEvent?.target instanceof EventTarget
        ? originalEvent.target
        : hasTarget(event) && event.target instanceof EventTarget
        ? event.target
        : null;

      if (originalEvent && eventTarget && 
          eventIsFromCastModalInteractiveRegion(originalEvent, eventTarget)) {
        event.preventDefault();
        return;
      }

      if (!shouldConfirmCastClose) {
        return;
      }

      event.preventDefault();
      setShowCastDiscardPrompt(true);
    },
    [shouldConfirmCastClose],
  );

  const handleDiscardCast = useCallback(() => {
    closeCastModal();
  }, [closeCastModal]);

  const handleCancelDiscard = useCallback(() => {
    setShowCastDiscardPrompt(false);
  }, []);
  const { fid } = useFarcasterSigner("navigation");
  const isLoggedIn = getIsAccountReady();
  const isInitializing = getIsInitializing();
  const { data } = useLoadFarcasterUser(fid);
  const user = useMemo(() => first(data?.users), [data]);
  const username = useMemo(() => user?.username, [user]);

  const CurrentUserImage = useCallback(
    () =>
      user && user.pfp_url ? (
        <img
          className="aspect-square rounded-full w-6 h-6"
          src={toFarcasterCdnUrl(user.pfp_url || "")}
        />
      ) : (
        <CgProfile />
      ),
    [user]
  );

  const router = useRouter();

  const iconFor = useCallback((key?: string): React.FC => {
    switch (key) {
      case 'home': return HomeIcon;
      case 'explore': return ExploreIcon;
      case 'notifications': return NotificationsIcon;
      case 'space': return RocketIcon;
      case 'robot': return RobotIcon;
      default: return HomeIcon;
    }
  }, []);
  
  // Process nav items: adjust labels and hrefs based on login status when needed
  const allNavItems = configuredNavItems.map((item) => {
    // Dynamically adjust home label and href based on login status
    if (item.id === 'home') {
      return {
        ...item,
        label: isLoggedIn ? 'Homebase' : item.label,
        href: isLoggedIn ? '/homebase' : item.href,
      };
    }
    return item;
  });

  const NavItem: React.FC<NavItemProps> = ({
    label,
    Icon,
    href,
    onClick,
    disable = false,
    openInNewTab = false,
    badgeText = null,
  }) => {
    const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
      if (disable) {
        e.preventDefault();
        return;
      }
      
      const isPrimary = e.button === 0;
      const hasMod = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
      
      if (!openInNewTab && href && href.startsWith("/") && isPrimary && !hasMod) {
        e.preventDefault();
        router.push(href);
        // Execute callbacks after navigation
        React.startTransition(() => {
          onClick?.();
          onNavigate?.();
        });
        return;
      }
      onClick?.();
      onNavigate?.();
    }, [onClick, onNavigate, href, disable, openInNewTab, router]);
    return (
      <li>
        <Link
          href={disable ? "#" : href}
          className={mergeClasses(
            "flex relative items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 w-full group",
            href === pathname ? "bg-gray-100" : "",
            shrunk ? "justify-center" : ""
          )}
          style={navTextStyle}
          onClick={handleClick}
          rel={openInNewTab ? "noopener noreferrer" : undefined}
          target={openInNewTab ? "_blank" : undefined}
        >
          {badgeText && <NavIconBadge systemConfig={systemConfig}>{badgeText}</NavIconBadge>}
          <Icon />
          {!shrunk && <span className="ms-3 relative z-10">{label}</span>}
        </Link>
      </li>
    );
  };

  const NavButton: React.FC<NavButtonProps> = ({
    label,
    Icon,
    onClick,
    disable = false,
    badgeText = null,
  }) => {
    return (
      <li>
        <button
          disabled={disable}
          className={mergeClasses(
            "flex relative items-center p-2 text-gray-900 rounded-lg dark:text-white w-full group",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            shrunk ? "justify-center" : ""
          )}
          style={navTextStyle}
          onClick={onClick}
        >
          {badgeText && <NavIconBadge systemConfig={systemConfig}>{badgeText}</NavIconBadge>}
          <Icon aria-hidden="true" />
          {!shrunk && <span className="ms-3 relative z-10">{label}</span>}
        </button>
      </li>
    );
  };

  const openSearchModal = useCallback(() => {
    if (!searchRef?.current) return;
    searchRef.current.focus();
  }, [searchRef]);

  const handleSearchResultSelect = useCallback(() => {
    onNavigate?.();
  }, [onNavigate]);

  return (
    <nav
      id="logo-sidebar"
      className={mergeClasses(
        "border-r-2 bg-white",
        mobile
          ? "w-[270px]"
          : "w-full transition-transform -translate-x-full sm:translate-x-0"
      )}
      aria-label="Sidebar"
      style={navTextStyle}
    >
      <Modal
        open={showCastModal}
        setOpen={handleCastModalChange}
        focusMode={false}
        showClose={false}
        onInteractOutside={handleCastModalInteractOutside}
        onPointerDownOutside={handleCastModalInteractOutside}
      >
        <CastModalPortalBoundary>
          <>
            <CreateCast
              afterSubmit={closeCastModal}
              onShouldConfirmCloseChange={setShouldConfirmCastClose}
              systemConfig={systemConfig}
            />
            <CastDiscardPrompt
              open={showCastDiscardPrompt}
              onClose={handleCancelDiscard}
              onDiscard={handleDiscardCast}
            />
          </>
        </CastModalPortalBoundary>
      </Modal>
      <SearchModal ref={searchRef} onResultSelect={handleSearchResultSelect} />
      <div
        className={mergeClasses(
          "pt-12 pb-12 h-full",
          mobile ? "block" : "md:block hidden"
        )}
      >
        <div
          className={mergeClasses(
            "flex flex-col h-full transition-all duration-300 relative",
            mobile
              ? "w-[270px]"
              : shrunk
              ? "w-[90px]"
              : "w-[270px]"
          )}
        >
          {!mobile && (
            <button
              onClick={toggleSidebar}
              className="absolute right-0 top-4 transform translate-x-1/2 bg-white rounded-full border border-gray-200 shadow-sm p-2 hover:bg-gray-50 sidebar-expand-button z-50"
              aria-label={shrunk ? "Expand sidebar" : "Collapse sidebar"}
            >
              {shrunk ? (
                <FaChevronRight size={14} />
              ) : (
                <FaChevronLeft size={14} />
              )}
            </button>
          )}

          <div className="-mt-6 pb-6">
            <BrandHeader systemConfig={systemConfig} />
          </div>
          <div
            className={mergeClasses(
              "flex flex-col text-lg font-medium pb-3 px-4 overflow-auto transition-all duration-300 pt-[18px]",
              shrunk ? "px-1" : "px-4"
            )}
          >
            <div className="flex-auto">
              {navEditMode && isNavigationEditable ? (
                // Edit mode: show editable navigation items with drag-and-drop
                <div className="space-y-2">
                  <Reorder.Group
                    axis="y"
                    onReorder={debouncedUpdateOrder}
                    values={navItemsToDisplay}
                    className="space-y-2"
                  >
                    {map(navItemsToDisplay, (item) => {
                      if (item.requiresAuth && !isLoggedIn) return null;
                      const IconComp = iconFor(item.icon);
                      const badge = item.id === 'notifications' ? notificationBadgeText : null;
                      const isSelected = pathname === item.href;
                      
                      return (
                        <Reorder.Item
                          key={item.id}
                          value={item}
                          className="relative"
                          whileDrag={{ backgroundColor: "#e3e3e3" }}
                          dragListener={navEditMode}
                        >
                          <Link
                            href={item.href}
                            className={mergeClasses(
                              "flex relative items-center p-2 rounded-lg w-full group",
                              isSelected ? "bg-gray-100" : "hover:bg-gray-100",
                              navEditMode ? "cursor-grab active:cursor-grabbing" : ""
                            )}
                            onClick={(e) => {
                              // Prevent navigation only if clicking on delete button or input field
                              const target = e.target as HTMLElement;
                              if (target.closest('button[aria-label="Delete item"]') || target.tagName === 'INPUT') {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            draggable={false}
                          >
                            {badge && <NavIconBadge systemConfig={systemConfig}>{badge}</NavIconBadge>}
                            <IconComp />
                            {!shrunk && (
                              <div className="ms-3 flex-1 flex items-center gap-2">
                                <EditableText
                                  initialText={item.label}
                                  updateMethod={(oldLabel, newLabel) => {
                                    if (oldLabel !== newLabel) {
                                      renameNavigationItem(item.id, { label: newLabel });
                                    }
                                  }}
                                />
                              </div>
                            )}
                            {navEditMode && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteNavigationItem(item.id);
                                  toast.success("Navigation item deleted");
                                }}
                                className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                aria-label="Delete item"
                              >
                                <CloseIcon />
                              </button>
                            )}
                          </Link>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                  
                  {/* Add new item button */}
                  <button
                    onClick={handleCreateItem}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 w-full text-left text-gray-600"
                  >
                    <FaPlus size={14} />
                    {!shrunk && <span className="text-sm">Add Navigation Item</span>}
                  </button>
                  
                  {/* Commit/Cancel buttons */}
                  {hasUncommittedChanges() && !shrunk && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        onClick={handleCommit}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm flex-1"
                      >
                        <FaCheck size={12} />
                        <span>Commit</span>
                      </Button>
                      <Button
                        onClick={handleCancel}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-sm"
                      >
                        <FaXmark size={12} />
                        <span>Cancel</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                // Normal mode: show regular navigation items
                <ul className="space-y-2">
                  {allNavItems.map((item) => {
                    if (item.requiresAuth && !isLoggedIn) return null;
                    const IconComp = iconFor(item.icon);
                    const badge = item.id === 'notifications' ? notificationBadgeText : null;
                    return (
                      <NavItem
                        key={item.id}
                        label={item.label}
                        Icon={IconComp}
                        href={item.href}
                        onClick={() => {
                          if (item.id === 'explore') trackAnalyticsEvent(AnalyticsEvent.CLICK_EXPLORE);
                          if (item.id === 'notifications') trackAnalyticsEvent(AnalyticsEvent.CLICK_NOTIFICATIONS);
                          if (item.id === 'home') trackAnalyticsEvent(AnalyticsEvent.CLICK_HOMEBASE);
                          if (item.id === 'space-token') trackAnalyticsEvent(AnalyticsEvent.CLICK_SPACE_FAIR_LAUNCH);
                        }}
                        openInNewTab={item.openInNewTab}
                        badgeText={badge}
                      />
                    );
                  })}
                <NavButton
                  label="Search"
                  Icon={SearchIcon}
                  onClick={() => {
                    openSearchModal();
                    trackAnalyticsEvent(AnalyticsEvent.CLICK_SEARCH);
                  }}
                />
                {isLoggedIn && (
                  <NavItem
                    label={"My Space"}
                    Icon={CurrentUserImage}
                    href={`/s/${username}`}
                    onClick={() =>
                      trackAnalyticsEvent(AnalyticsEvent.CLICK_MY_SPACE)
                    }
                  />
                )}
                {isLoggedIn && (
                  <NavButton
                    label={"Logout"}
                    Icon={LogoutIcon}
                    onClick={handleLogout}
                  />
                )}
                {!isLoggedIn && (
                  <NavButton
                    label={isInitializing ? "Complete Signup" : "Login"}
                    Icon={LoginIcon}
                    onClick={openModal}
                  />
                )}
                {/* Edit Navigation Button - only show if user is admin */}
                {isNavigationEditable && !mobile && (
                  <NavButton
                    label={navEditMode ? "Exit Edit" : "Edit Nav"}
                    Icon={navEditMode ? LogoutIcon : FaPaintbrush}
                    onClick={() => {
                      setNavEditMode(!navEditMode);
                    }}
                  />
                )}
              </ul>
              )}
            </div>
          </div>
          <div className="flex flex-col flex-auto justify-between border-t px-4">
            {navigation?.showMusicPlayer !== false && (
              <div
                className={mergeClasses("mt-8 px-2", shrunk ? "px-0" : "px-2")}
              >
                <Player
                  url={userTheme?.properties?.musicURL || NOUNISH_LOWFI_URL}
                  shrunk={shrunk}
                />
              </div>
            )}
            {isLoggedIn && (
              <div
                className={mergeClasses(
                  "pt-3 flex items-center gap-2 justify-center",
                  shrunk ? "flex-col gap-1" : ""
                )}
              >
                <Button
                  onClick={openCastModal}
                  id="open-cast-modal-button"
                  width="auto"
                  className="flex items-center justify-center w-12 h-12 font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor: castButtonColors.backgroundColor,
                    color: castButtonColors.fontColor,
                    fontFamily: uiColors.fontFamily,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = castButtonColors.hoverColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = castButtonColors.backgroundColor;
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.backgroundColor = castButtonColors.activeColor;
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.backgroundColor = castButtonColors.hoverColor;
                  }}
                >
                  {shrunk ? <span className="sr-only">Cast</span> : "Cast"}
                  {shrunk && (
                    <span className="text-lg font-bold">
                      <RiQuillPenLine />
                    </span>
                  )}
                </Button>
              </div>
            )}
            {!isLoggedIn && (
              <div className="flex flex-col items-center gap-2">
                {navigation?.showSocials !== false && (
                  <Link
                    href={discordUrl}
                    className={mergeClasses(
                      "flex items-center p-2 text-gray-900 rounded-lg dark:text-white group w-full gap-2 text-lg font-medium",
                      shrunk ? "justify-center gap-0" : ""
                    )}
                    style={navTextStyle}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <FaDiscord className="text-[#5865f2] w-6 h-6" />
                    {!shrunk && "Join"}
                  </Link>
                )}
                <div
                  className="flex flex-col items-center text-xs text-gray-500 mt-5"
                  style={navTextStyle}
                >
                  <Link href="/terms" className="hover:underline">
                    Terms
                  </Link>
                  <Link href="/privacy" className="hover:underline">
                    Privacy
                  </Link>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </nav>
  );
  }
);

Navigation.displayName = 'Navigation';

export default Navigation;
