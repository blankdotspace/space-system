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
    FaPencil,
    FaX,
    FaFloppyDisk,
    FaSpinner,
    FaTriangleExclamation,
} from "react-icons/fa6";
import * as FaIcons from "react-icons/fa6";
import * as BsIcons from "react-icons/bs";
import * as GiIcons from "react-icons/gi";
import * as LuIcons from "react-icons/lu";
import type { IconType } from "react-icons";
import { Button } from "../atoms/button";
import BrandHeader from "../molecules/BrandHeader";
import Modal from "../molecules/Modal";
import useNotificationBadgeText from "@/common/lib/hooks/useNotificationBadgeText";
import { useUIColors } from "@/common/lib/hooks/useUIColors";
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
import { useCurrentSpaceIdentityPublicKey } from "@/common/lib/hooks/useCurrentSpaceIdentityPublicKey";
import { useSidebarContext } from "./Sidebar";
import { useNavigation } from "./navigation/useNavigation";
import { NavigationItem as NavItemComponent, NavigationButton } from "./navigation/NavigationItem";
import { NavigationEditor } from "./navigation/NavigationEditor";
import { NavigationErrorBoundary } from "./navigation/ErrorBoundary";

type NavProps = {
  systemConfig: SystemConfig;
  isEditable: boolean;
  enterEditMode?: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
};

const NAV_BORDER_COLOR = "rgba(128, 128, 128, 0.5)";
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
  const { navEditMode, setNavEditMode } = useSidebarContext();
  const currentUserIdentityPublicKey = useCurrentSpaceIdentityPublicKey();
  const userTheme: UserTheme = useUserTheme();
  const uiColors = useUIColors({ systemConfig });
  
  // Check if user is logged in
  const isLoggedIn = getIsAccountReady();
  
  // Check if user is admin (can edit navigation)
  // Requires both: user must be logged in AND have admin identity public key
  const adminIdentityPublicKeys = systemConfig.adminIdentityPublicKeys || [];
  const isNavigationEditable = isLoggedIn && 
    currentUserIdentityPublicKey && 
    adminIdentityPublicKeys.includes(currentUserIdentityPublicKey);
  
  // Use navigation hook for store access and handlers
  const {
    localNavigation,
    hasUncommittedChanges,
    navItemsToDisplay,
    debouncedUpdateOrder,
    handleCommit,
    handleCancel,
    handleCreateItem,
    isCommitting,
  } = useNavigation(systemConfig, setNavEditMode);
  
  // Destructure navigation from systemConfig early
  const { community, navigation } = systemConfig;
  
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
    backgroundColor: uiColors.backgroundColor,
  };

  const [shrunk, setShrunk] = useState(mobile ? false : true);
  const [isExpandTransitioning, setIsExpandTransitioning] = useState(false);
  const forcedExpansionRef = useRef(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track when sidebar is expanding (shrunk -> expanded) to delay text appearance
  useEffect(() => {
    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    if (!shrunk && !mobile) {
      // Sidebar is expanding - set transitioning state
      setIsExpandTransitioning(true);
      // Clear transitioning state after animation completes (300ms)
      transitionTimeoutRef.current = setTimeout(() => {
        setIsExpandTransitioning(false);
      }, 300);
    } else {
      // Sidebar is collapsing or mobile - no transition delay needed
      setIsExpandTransitioning(false);
    }

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [shrunk, mobile]);

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

  // Text visibility: hidden when shrunk OR during expand transition
  // This prevents text from appearing until the sidebar animation completes
  const showExpandedText = !shrunk && !isExpandTransitioning;

  const router = useRouter();

  async function handleLogout() {
    await logout();
    // Redirect to root, which will redirect to the first nav item
    router.push("/");
  }
  
  // For backwards compatibility with code that uses configuredNavItems
  const configuredNavItems = navItemsToDisplay;

  const openModal = () => setModalOpen(true);

  const [showCastModal, setShowCastModal] = useState(false);
  const [shouldConfirmCastClose, setShouldConfirmCastClose] = useState(false);
  const [showCastDiscardPrompt, setShowCastDiscardPrompt] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Reset confirmation state when exiting edit mode
  useEffect(() => {
    if (!navEditMode) {
      setShowConfirmCancel(false);
    }
  }, [navEditMode]);

  // Handler for cancel button click - shows confirmation if there are changes
  const handleCancelClick = useCallback(() => {
    if (hasUncommittedChanges) {
      setShowConfirmCancel(true);
    } else {
      handleCancel();
    }
  }, [hasUncommittedChanges, handleCancel]);

  // Handler for confirmed cancel
  const handleConfirmedCancel = useCallback(() => {
    setShowConfirmCancel(false);
    handleCancel();
  }, [handleCancel]);

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
  const isInitializing = getIsInitializing();
  const { data } = useLoadFarcasterUser(fid);
  const user = useMemo(() => first(data?.users), [data]);
  const username = useMemo(() => user?.username ?? undefined, [user]);

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

  // Icon pack mapping for react-icons (matches IconSelector)
  const iconPack = useMemo(() => ({
    ...FaIcons,
    ...BsIcons,
    ...GiIcons,
    ...LuIcons,
  }), []);

  // Cache for wrapper components to prevent remounts
  const iconWrapperCacheRef = useRef<Map<string, React.FC>>(new Map());
  const MAX_ICON_CACHE = 50;

  // Reusable component factory for URL icons
  const createUrlIconWrapper = useCallback((src: string): React.FC => {
    const CustomIconWrapper = React.memo(() => (
      <img
        src={src}
        alt="icon"
        className="w-5 h-5 object-contain"
        aria-hidden="true"
      />
    ));
    CustomIconWrapper.displayName = `CustomIcon(${src})`;
    return CustomIconWrapper;
  }, []);

  const iconFor = useCallback((key?: string): React.FC => {
    // Handle legacy icon keys for backward compatibility
    switch (key) {
      case 'home': return HomeIcon;
      case 'explore': return ExploreIcon;
      case 'notifications': return NotificationsIcon;
      case 'search': return SearchIcon;
      case 'space': return RocketIcon;
      case 'robot': return RobotIcon;
      default: {
        if (!key) {
          return HomeIcon;
        }

        // Check cache first
        const cached = iconWrapperCacheRef.current.get(key);
        if (cached) {
          return cached;
        }

        // Handle react-icons names (e.g., 'FaHouse', 'FaRss')
        // Use w-5 h-5 (20px) to match visual size of standard nav icons (w-6 h-6 custom SVGs)
        if (iconPack[key as keyof typeof iconPack]) {
          const IconComponent = iconPack[key as keyof typeof iconPack] as IconType;
          const ReactIconWrapper = React.memo(() => (
            <IconComponent className="w-5 h-5" aria-hidden="true" />
          ));
          ReactIconWrapper.displayName = `ReactIcon(${key})`;
          
          // Evict oldest entry if cache exceeds max size
          if (iconWrapperCacheRef.current.size >= MAX_ICON_CACHE) {
            const oldestKey = iconWrapperCacheRef.current.keys().next().value;
            if (oldestKey) {
              iconWrapperCacheRef.current.delete(oldestKey);
            }
          }
          iconWrapperCacheRef.current.set(key, ReactIconWrapper);
          return ReactIconWrapper;
        }

        // Handle custom icon URLs
        if (key.startsWith('http://') || key.startsWith('https://')) {
          const CustomIconWrapper = createUrlIconWrapper(key);
          
          // Evict oldest entry if cache exceeds max size
          if (iconWrapperCacheRef.current.size >= MAX_ICON_CACHE) {
            const oldestKey = iconWrapperCacheRef.current.keys().next().value;
            if (oldestKey) {
              iconWrapperCacheRef.current.delete(oldestKey);
            }
          }
          iconWrapperCacheRef.current.set(key, CustomIconWrapper);
          return CustomIconWrapper;
        }

        // Default fallback
        return HomeIcon;
      }
    }
  }, [iconPack, createUrlIconWrapper]);

  // Clear icon cache on navigation/route changes to prevent memory growth
  useEffect(() => {
    iconWrapperCacheRef.current.clear();
  }, [pathname]);
  
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
  
  // Get store functions for editor
  const { deleteNavigationItem, renameNavigationItem } = useAppStore((state) => ({
    deleteNavigationItem: state.navigation.deleteNavigationItem,
    renameNavigationItem: state.navigation.renameNavigationItem,
  }));

  /**
   * Handles deletion of a navigation item
   * If the current pathname matches the deleted item, navigates to the closest nav item
   */
  const handleDeleteItem = useCallback((itemId: string) => {
    const itemToDelete = localNavigation.find(item => item.id === itemId);
    if (!itemToDelete) {
      console.warn('[Navigation] Item not found for deletion:', itemId);
      deleteNavigationItem(itemId);
      return;
    }

    // Check if current pathname matches the deleted item's href
    const isCurrentItem = pathname !== null && (
      pathname === itemToDelete.href ||
      (itemToDelete.href.startsWith('/') && pathname.startsWith(itemToDelete.href + '/'))
    );

    // Find the closest item BEFORE deleting (if we're on the deleted item)
    let closestItem: NavigationItem | undefined;
    if (isCurrentItem && localNavigation.length > 1) {
      const currentIndex = localNavigation.findIndex(item => item.id === itemId);
      
      // Find the closest item: try previous, then next, otherwise first
      if (currentIndex > 0) {
        // Use previous item
        closestItem = localNavigation[currentIndex - 1];
      } else if (currentIndex < localNavigation.length - 1) {
        // Use next item
        closestItem = localNavigation[currentIndex + 1];
      } else {
        // Use first item (shouldn't happen if length > 1, but just in case)
        closestItem = localNavigation[0];
      }
    }

    // Delete the item
    deleteNavigationItem(itemId);

    // Navigate to the closest item if we were on the deleted item
    if (closestItem && closestItem.href) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Navigation] Navigating to closest nav item after deletion:', closestItem.href);
      }
      router.push(closestItem.href);
    }
  }, [localNavigation, pathname, deleteNavigationItem, router]);

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
        "border-r",
        mobile
          ? "w-[270px]"
          : "w-full transition-transform -translate-x-full sm:translate-x-0"
      )}
      aria-label="Sidebar"
      style={{ ...navTextStyle, borderColor: NAV_BORDER_COLOR }}
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
              systemConfig={systemConfig}
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
          {!mobile && !navEditMode && (
            <button
              onClick={toggleSidebar}
              className="absolute right-0 top-4 transform translate-x-1/2 rounded-full border border-gray-200 shadow-sm p-2 sidebar-expand-button z-50"
              style={{
                backgroundColor: uiColors.backgroundColor,
                borderColor: NAV_BORDER_COLOR,
              }}
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
              "flex flex-col text-lg font-medium pb-3 overflow-auto transition-all duration-300 pt-[18px]",
              shrunk ? "px-1" : "pl-1 pr-4"
            )}
          >
            <div className="flex-auto">
              {navEditMode && isNavigationEditable ? (
                <NavigationErrorBoundary
                  onError={(error, errorInfo) => {
                    // Log to error service in production
                    if (process.env.NODE_ENV === "production") {
                      // TODO: Integrate with error logging service
                      // logErrorToService(error, errorInfo);
                    }
                  }}
                >
                  <NavigationEditor
                  items={navItemsToDisplay}
                  isShrunk={shrunk}
                  isLoggedIn={isLoggedIn}
                  isInitializing={isInitializing}
                  username={username ? username : undefined}
                  notificationBadgeText={notificationBadgeText}
                  systemConfig={systemConfig}
                  localNavigation={localNavigation}
                  pathname={pathname}
                  iconFor={iconFor}
                  CurrentUserImage={CurrentUserImage}
                  onReorder={debouncedUpdateOrder}
                  onRename={renameNavigationItem}
                  onDelete={handleDeleteItem}
                  onCreate={handleCreateItem}
                  onCommit={handleCommit}
                  onCancel={handleCancel}
                  hasUncommittedChanges={hasUncommittedChanges}
                  isCommitting={isCommitting}
                  onOpenSearch={openSearchModal}
                  onLogout={handleLogout}
                  onLogin={openModal}
                  />
                </NavigationErrorBoundary>
              ) : (
                // Normal mode: show regular navigation items
                <ul className="space-y-2">
                  {allNavItems.filter(item => item.id !== 'notifications').map((item) => {
                    if (item.requiresAuth && !isLoggedIn) return null;
                    const IconComp = iconFor(item.icon);
                    return (
                      <NavItemComponent
                        key={item.id}
                        label={item.label}
                        Icon={IconComp}
                        href={item.href}
                        onClick={() => {
                          if (item.id === 'explore') trackAnalyticsEvent(AnalyticsEvent.CLICK_EXPLORE);
                          if (item.id === 'home') trackAnalyticsEvent(AnalyticsEvent.CLICK_HOMEBASE);
                          if (item.id === 'space-token') trackAnalyticsEvent(AnalyticsEvent.CLICK_SPACE_FAIR_LAUNCH);
                        }}
                        openInNewTab={item.openInNewTab}
                        shrunk={shrunk}
                        systemConfig={systemConfig}
                        onNavigate={onNavigate}
                        showText={showExpandedText}
                      />
                    );
                  })}
                  {isLoggedIn && (
                    <NavItemComponent
                      label="Notifications"
                      Icon={NotificationsIcon}
                      href="/notifications"
                      onClick={() => trackAnalyticsEvent(AnalyticsEvent.CLICK_NOTIFICATIONS)}
                      badgeText={notificationBadgeText}
                      shrunk={shrunk}
                      systemConfig={systemConfig}
                      onNavigate={onNavigate}
                      showText={showExpandedText}
                    />
                  )}
                <NavigationButton
                  label="Search"
                  Icon={SearchIcon}
                  onClick={() => {
                    openSearchModal();
                    trackAnalyticsEvent(AnalyticsEvent.CLICK_SEARCH);
                  }}
                  shrunk={shrunk}
                  systemConfig={systemConfig}
                  showText={showExpandedText}
                />
                {isLoggedIn && (
                  <NavItemComponent
                    label="My Space"
                    Icon={CurrentUserImage}
                    href={`/s/${username}`}
                    onClick={() =>
                      trackAnalyticsEvent(AnalyticsEvent.CLICK_MY_SPACE)
                    }
                    shrunk={shrunk}
                    systemConfig={systemConfig}
                    onNavigate={onNavigate}
                    showText={showExpandedText}
                  />
                )}
                {isLoggedIn && (
                  <NavigationButton
                    label="Logout"
                    Icon={LogoutIcon}
                    onClick={handleLogout}
                    shrunk={shrunk}
                    systemConfig={systemConfig}
                    showText={showExpandedText}
                  />
                )}
                {!isLoggedIn && (
                  <NavigationButton
                    label={isInitializing ? "Complete Signup" : "Login"}
                    Icon={LoginIcon}
                    onClick={openModal}
                    shrunk={shrunk}
                    systemConfig={systemConfig}
                    showText={showExpandedText}
                  />
                )}
                {/* Edit Navigation Button - only show if user is admin */}
                {isNavigationEditable && !mobile && (
                  <NavigationButton
                    label={navEditMode ? "Exit Edit" : "Edit Nav"}
                    Icon={navEditMode ? LogoutIcon : () => (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <FaPencil className="w-4 h-4" />
                      </div>
                    )}
                    onClick={() => {
                      setNavEditMode(!navEditMode);
                    }}
                    shrunk={shrunk}
                    systemConfig={systemConfig}
                    showText={showExpandedText}
                  />
                )}
              </ul>
              )}
            </div>
          </div>
          <div
            className="flex flex-col flex-auto justify-between border-t px-4"
            style={{ borderColor: NAV_BORDER_COLOR }}
          >
            {navigation?.showMusicPlayer !== false && (
              <div
                className={mergeClasses("mt-8 px-2", shrunk ? "px-0" : "px-2")}
              >
                <Player
                  url={userTheme?.properties?.musicURL || NOUNISH_LOWFI_URL}
                  shrunk={shrunk}
                  fontColor={uiColors.fontColor}
                  fontFamily={uiColors.fontFamily}
                  borderColor={NAV_BORDER_COLOR}
                />
              </div>
            )}
            {isLoggedIn && (
              <div
                className={mergeClasses(
                  "pt-3 flex items-center gap-2",
                  navEditMode && isNavigationEditable ? "" : "justify-center",
                  shrunk ? "flex-col gap-1" : ""
                )}
              >
                {navEditMode && isNavigationEditable ? (
                  showConfirmCancel ? (
                    // Confirmation state - Back and Exit buttons
                    <div className="w-full flex flex-col gap-2">
                      <p className="w-full text-center text-xs pt-1 pl-8 pr-8">
                        If you exit, any changes made will not be saved.
                      </p>
                      <div className="gap-2 flex items-center w-full">
                        <Button
                          onClick={() => setShowConfirmCancel(false)}
                          size="icon"
                          variant="secondary"
                        >
                          <FaChevronLeft aria-hidden="true" />
                        </Button>
                        <Button
                          onClick={handleConfirmedCancel}
                          variant="destructive"
                          className="flex-1"
                          withIcon
                        >
                          <FaTriangleExclamation
                            className="h-8l shrink-0"
                            aria-hidden="true"
                          />
                          <span>Exit</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Always show X and Save buttons
                    <div className="gap-2 flex items-center w-full">
                      <Button
                        onClick={handleCancelClick}
                        size="icon"
                        variant="secondary"
                      >
                        <FaX aria-hidden="true" />
                      </Button>
                      <Button
                        onClick={handleCommit}
                        disabled={isCommitting}
                        variant="primary"
                        className="flex-1"
                        withIcon
                      >
                        {isCommitting ? (
                          <>
                            <FaSpinner className="animate-spin" aria-hidden="true" />
                            <span>Committing...</span>
                          </>
                        ) : (
                          <>
                            <FaFloppyDisk aria-hidden="true" />
                            <span>Save</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )
                ) : (
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
                    <span
                      className={mergeClasses(
                        "transition-opacity duration-200",
                        showExpandedText ? "opacity-100" : "opacity-0 invisible absolute"
                      )}
                    >
                      Cast
                    </span>
                    {!showExpandedText && (
                      <span className="text-lg font-bold">
                        <RiQuillPenLine />
                      </span>
                    )}
                  </Button>
                )}
              </div>
            )}
            {!isLoggedIn && (
              <div className="flex flex-col items-center gap-2">
                {navigation?.showSocials !== false && (
                  <Link
                    href={discordUrl}
                    className="flex items-center p-0 text-inherit rounded-lg dark:text-white group w-full text-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[40px]"
                    style={navTextStyle}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="w-[82px] flex justify-center shrink-0">
                      <FaDiscord className="text-[#5865f2] w-6 h-6" />
                    </div>
                    <span
                      className={mergeClasses(
                        "whitespace-nowrap transition-opacity duration-200 -ml-3",
                        showExpandedText ? "opacity-100" : "opacity-0 invisible"
                      )}
                    >
                      Join
                    </span>
                  </Link>
                )}
                <div
                  className="flex flex-col items-center text-xs text-inherit mt-5"
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
