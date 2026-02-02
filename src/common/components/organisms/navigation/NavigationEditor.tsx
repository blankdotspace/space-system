"use client";

import React, { useMemo, useState, useRef, startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reorder } from "framer-motion";
import { map } from "lodash";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import { SystemConfig, NavigationItem } from "@/config/systemConfig";
import { FaPlus } from "react-icons/fa6";
import { toast } from "sonner";
import EditableText from "@/common/components/atoms/editable-text";
import { CloseIcon } from "@/common/components/atoms/icons/CloseIcon";
import { IconSelector } from "@/common/components/molecules/IconSelector";
import * as FaIcons from "react-icons/fa6";
import * as BsIcons from "react-icons/bs";
import * as GiIcons from "react-icons/gi";
import * as LuIcons from "react-icons/lu";
import type { IconType } from "react-icons";
import {
  validateNavItemLabel,
} from "@/common/utils/navUtils";
import { NAVIGATION_MAX_LABEL_LENGTH } from "./constants";
import { NavigationItem as NavItemComponent, NavigationButton } from "./NavigationItem";
import HomeIcon from "@/common/components/atoms/icons/HomeIcon";
import ExploreIcon from "@/common/components/atoms/icons/ExploreIcon";
import NotificationsIcon from "@/common/components/atoms/icons/NotificationsIcon";
import SearchIcon from "@/common/components/atoms/icons/SearchIcon";
import RocketIcon from "@/common/components/atoms/icons/RocketIcon";
import RobotIcon from "@/common/components/atoms/icons/RobotIcon";
import LogoutIcon from "@/common/components/atoms/icons/LogoutIcon";
import LoginIcon from "@/common/components/atoms/icons/LoginIcon";

const LEGACY_ICONS: Record<string, React.FC> = {
  home: HomeIcon,
  explore: ExploreIcon,
  notifications: NotificationsIcon,
  search: SearchIcon,
  space: RocketIcon,
  robot: RobotIcon,
};
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";
import { trackAnalyticsEvent } from "@/common/lib/utils/analyticsUtils";

interface NavigationEditorProps {
  items: NavigationItem[];
  isShrunk: boolean;
  isLoggedIn: boolean;
  isInitializing: boolean;
  username?: string;
  notificationBadgeText?: string | null;
  systemConfig: SystemConfig;
  localNavigation: NavigationItem[];
  pathname: string | null;
  iconFor: (key?: string) => React.FC;
  CurrentUserImage: React.FC;
  onReorder: (newOrder: NavigationItem[]) => void;
  onRename: (itemId: string, updates: { label?: string; icon?: string }) => string | undefined;
  onDelete: (itemId: string) => void;
  onCreate: () => void;
  onCommit: () => void;
  onCancel: () => void;
  hasUncommittedChanges: boolean;
  isCommitting: boolean;
  onOpenSearch: () => void;
  onLogout: () => void;
  onLogin: () => void;
}

/**
 * Navigation editor component implementation
 * 
 * Provides drag-and-drop reordering, inline editing, and item management.
 * See NavigationEditor (memoized export) for component documentation.
 */
const NavigationEditorComponent: React.FC<NavigationEditorProps> = ({
  items,
  isShrunk,
  isLoggedIn,
  isInitializing,
  username,
  notificationBadgeText,
  systemConfig,
  localNavigation,
  pathname,
  iconFor,
  CurrentUserImage,
  onReorder,
  onRename,
  onDelete,
  onCreate,
  onCommit,
  onCancel,
  hasUncommittedChanges,
  isCommitting,
  onOpenSearch,
  onLogout,
  onLogin,
}) => {
  const router = useRouter();
  
  // Memoize filtered items to avoid recalculating on every render
  const editableItems = useMemo(
    () => items.filter((item) => item.id !== "notifications"),
    [items]
  );

  // Icon pack mapping for react-icons (matches IconSelector)
  const iconPack = useMemo(() => ({
    ...FaIcons,
    ...BsIcons,
    ...GiIcons,
    ...LuIcons,
  }), []);

  // Track which item's icon selector is open (by itemId)
  const [openIconSelectorId, setOpenIconSelectorId] = useState<string | null>(null);
  const iconButtonRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});

  // Helper to get or create ref for an item's icon button
  const getIconButtonRef = (itemId: string) => {
    if (!iconButtonRefs.current[itemId]) {
      iconButtonRefs.current[itemId] = React.createRef<HTMLButtonElement>();
    }
    return iconButtonRefs.current[itemId];
  };

  // Helper to render icon component (matches IconSelector format)
  // Uses w-5 h-5 (20px) to match visual size of standard nav icons (w-6 h-6 custom SVGs)
  const getIconComponent = (iconName?: string) => {
    if (!iconName) {
      return (
        <div className="w-5 h-5 bg-gray-100 flex items-center justify-center rounded">?</div>
      );
    }

    // Handle legacy navigation icon keys (home, explore, etc.)
    const LegacyIcon = LEGACY_ICONS[iconName];
    if (LegacyIcon) {
      return <LegacyIcon />;
    }

    // Handle custom icon URLs
    if (iconName.startsWith('http://') || iconName.startsWith('https://')) {
      return (
        <img src={iconName} alt="icon" className="w-5 h-5 rounded object-contain" />
      );
    }

    // Handle react-icons names (e.g., 'FaHouse', 'FaRss')
    const Icon = iconPack[iconName as keyof typeof iconPack] as IconType | undefined;
    if (Icon) {
      return <Icon className="w-5 h-5" />;
    }

    // Fallback for unknown icons
    return (
      <div className="w-5 h-5 bg-gray-100 flex items-center justify-center rounded">?</div>
    );
  };

  // Handle icon selection
  const handleIconSelect = (itemId: string, iconName: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NavigationEditor] Icon selected:', {
        itemId,
        iconName
      });
    }
    try {
      onRename(itemId, { icon: iconName });
      setOpenIconSelectorId(null);
      toast.success("Icon updated");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to update icon";
      console.error('[NavigationEditor] Icon update failed:', {
        itemId,
        iconName,
        error: errorMessage
      });
      toast.error(errorMessage);
      
      // Re-throw for error boundaries
      if (error instanceof Error) {
        throw error;
      }
    }
  };

  /**
   * Updates URL when the currently viewed navigation item's href changes
   * 
   * This effect watches for changes in localNavigation and updates the browser URL
   * if the current pathname matches an item that has been renamed. This ensures
   * the URL stays in sync with navigation item changes without requiring a page reload.
   * 
   * Uses a ref to track the previous pathname to avoid unnecessary updates and
   * prevent race conditions where the effect might run before the store has fully updated.
   */

  /**
   * Handles renaming a navigation item
   * 
   * Validates the new label, updates the item in the store (which handles
   * href regeneration), and immediately updates the URL if we're on that
   * page. This matches the pattern used by tab renaming.
   * 
   * @param itemId - ID of the item to rename
   * @param oldLabel - Current label
   * @param newLabel - New label to apply
   */
  const handleRename = React.useCallback(
    (itemId: string, oldLabel: string, newLabel: string) => {
      if (oldLabel !== newLabel) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[NavigationEditor] Renaming navigation item:', {
            itemId,
            oldLabel,
            newLabel,
            currentPathname: pathname
          });
        }
        try {
          const item = localNavigation.find((i) => i.id === itemId);
          if (!item) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[NavigationEditor] Rename failed: item not found', itemId);
            }
            return;
          }

          const oldHref = item.href;

          // Perform the rename - store handles validation, uniqueness, and updates href
          // Returns the new href so we can update the URL immediately
          const newHref = onRename(itemId, { label: newLabel });
          if (process.env.NODE_ENV === 'development') {
            console.log('[NavigationEditor] Rename successful:', {
              itemId,
              oldHref,
              newHref,
              willUpdateURL: newHref && pathname === oldHref && newHref !== oldHref
            });
          }

          // Immediately update the URL if we're currently on this item's page
          // Handle both base URLs (e.g., /new-item) and tab URLs (e.g., /new-item/Settings)
          // This matches the tab rename pattern (see TabBar.tsx switchTabTo)
          if (newHref && pathname && newHref !== oldHref) {
            let newUrl: string | null = null;
            
            if (pathname === oldHref) {
              // Exact match: update base URL
              newUrl = newHref;
            } else if (pathname.startsWith(oldHref + '/')) {
              // Tab URL: preserve the tab part (e.g., /new-item/Settings -> /renamed-item/Settings)
              const remainingPath = pathname.slice(oldHref.length);
              newUrl = newHref + remainingPath;
            }
            
            if (newUrl) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[NavigationEditor] Updating URL from', pathname, 'to', newUrl);
              }
              // Use startTransition to make the navigation non-blocking
              // This prevents UI blocking and reduces the chance of 404 flashes
              // The router.replace() ensures Next.js re-resolves the route with the new navSlug
              startTransition(() => {
                router.replace(newUrl);
              });
            }
          }

          toast.success("Navigation item updated");
        } catch (error: unknown) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : "Failed to update navigation item";
          console.error('[NavigationEditor] Rename failed:', {
            itemId,
            oldLabel,
            newLabel,
            error: errorMessage
          });
          toast.error(errorMessage);
          
          // Re-throw for error boundaries
          if (error instanceof Error) {
            throw error;
          }
        }
      }
    },
    [localNavigation, onRename, pathname, router]
  );

  return (
    <>
      <div className="space-y-2">
        <Reorder.Group
          axis="y"
          onReorder={onReorder}
          values={editableItems}
          className="space-y-2"
        >
          {map(
            editableItems,
            (item) => {
              if (item.requiresAuth && !isLoggedIn) return null;

              const IconComp = iconFor(item.icon);
              // Match if pathname exactly equals href, or if pathname starts with href + "/"
              // This allows tabs like /home/Settings to match the /home navigation item
              const isSelected = pathname !== null && (
                pathname === item.href || 
                (item.href.startsWith('/') && pathname.startsWith(item.href + '/'))
              );

              return (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className="relative"
                  whileDrag={{ backgroundColor: "#e3e3e3" }}
                  dragListener={true}
                >
                <Link
                  href={isSelected ? "#" : item.href}
                  className={mergeClasses(
                    "flex relative items-center p-2 rounded-lg w-full group",
                    isSelected ? "bg-[rgba(128,128,128,0.2)]" : "hover:bg-[rgba(128,128,128,0.15)]",
                    "cursor-grab active:cursor-grabbing",
                    isShrunk ? "justify-center" : ""
                  )}
                  onClick={(e) => {
                    // Prevent navigation for selected items (matches reorderable-tab pattern)
                    // Allow normal Link navigation for non-selected items
                    if (isSelected) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onDoubleClick={(e) => {
                    // Prevent navigation on double-click for selected items
                    if (isSelected) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onDragStart={(e) => e.preventDefault()}
                  draggable={false}
                  aria-label={isShrunk ? item.label : undefined}
                  aria-current={isSelected ? "page" : undefined}
                >
                    <div className="flex-shrink-0">
                      {!isShrunk ? (
                        <button
                          ref={getIconButtonRef(item.id)}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenIconSelectorId(openIconSelectorId === item.id ? null : item.id);
                          }}
                          className="flex items-center justify-center rounded hover:bg-[rgba(128,128,128,0.2)] transition-colors p-0"
                          aria-label={`Change icon for ${item.label}`}
                          title={`Change icon for ${item.label}`}
                        >
                          {getIconComponent(item.icon)}
                        </button>
                      ) : (
                        <IconComp />
                      )}
                    </div>
                    {!isShrunk && (
                      <div className="ms-3 flex-1 flex items-center min-w-0">
                        {isSelected ? (
                          <div className="cursor-text">
                            <EditableText
                              initialText={item.label}
                              updateMethod={(oldLabel, newLabel) =>
                                handleRename(item.id, oldLabel, newLabel)
                              }
                              validateInput={validateNavItemLabel}
                              maxLength={NAVIGATION_MAX_LABEL_LENGTH}
                            />
                          </div>
                        ) : (
                          <span className="whitespace-nowrap">{item.label}</span>
                        )}
                      </div>
                    )}
                    {!isShrunk && openIconSelectorId === item.id && (
                      <IconSelector
                        onSelectIcon={(iconName) => handleIconSelect(item.id, iconName)}
                        triggerRef={getIconButtonRef(item.id)}
                        onClose={() => setOpenIconSelectorId(null)}
                      />
                    )}
                  {!isShrunk && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (process.env.NODE_ENV === 'development') {
                          console.log('[NavigationEditor] Deleting navigation item:', {
                            itemId: item.id,
                            label: item.label,
                            href: item.href
                          });
                        }
                        onDelete(item.id);
                        toast.success("Navigation item deleted");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          if (process.env.NODE_ENV === 'development') {
                            console.log('[NavigationEditor] Deleting navigation item (keyboard):', {
                              itemId: item.id,
                              label: item.label,
                              href: item.href
                            });
                          }
                          onDelete(item.id);
                          toast.success("Navigation item deleted");
                        }
                      }}
                      className="p-1 hover:bg-[rgba(239,68,68,0.2)] rounded opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                      aria-label={`Delete ${item.label}`}
                      title={`Delete ${item.label}`}
                    >
                      <CloseIcon aria-hidden="true" />
                    </button>
                  )}
                  </Link>
                </Reorder.Item>
              );
            }
          )}
        </Reorder.Group>

        {/* Add new item button */}
        <button
          onClick={onCreate}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onCreate();
            }
          }}
          className={mergeClasses(
            "flex items-center gap-2 p-2 rounded-lg hover:bg-[rgba(128,128,128,0.15)] w-full text-gray-600",
            isShrunk ? "justify-center" : "text-left"
          )}
          aria-label="Add navigation item"
        >
          <FaPlus size={14} aria-hidden="true" />
          {!isShrunk && <span className="text-sm">Add Navigation Item</span>}
        </button>

      </div>

      {/* Show other nav items but greyed out/inactive */}
      <ul className="space-y-2 mt-4 pt-4 border-t">
        {isLoggedIn && (
          <NavItemComponent
            label="Notifications"
            Icon={NotificationsIcon}
            href="/notifications"
            onClick={() => trackAnalyticsEvent(AnalyticsEvent.CLICK_NOTIFICATIONS)}
            badgeText={notificationBadgeText}
            disable={true}
            shrunk={isShrunk}
            systemConfig={systemConfig}
          />
        )}
        <NavigationButton
          label="Search"
          Icon={SearchIcon}
          onClick={() => {
            onOpenSearch();
            trackAnalyticsEvent(AnalyticsEvent.CLICK_SEARCH);
          }}
          disable={true}
          shrunk={isShrunk}
          systemConfig={systemConfig}
        />
        {isLoggedIn && (
          <NavItemComponent
            label="My Space"
            Icon={CurrentUserImage}
            href={`/s/${username}`}
            onClick={() => trackAnalyticsEvent(AnalyticsEvent.CLICK_MY_SPACE)}
            disable={true}
            shrunk={isShrunk}
            systemConfig={systemConfig}
          />
        )}
        {isLoggedIn && (
          <NavigationButton
            label="Logout"
            Icon={LogoutIcon}
            onClick={onLogout}
            disable={true}
            shrunk={isShrunk}
            systemConfig={systemConfig}
          />
        )}
        {!isLoggedIn && (
          <NavigationButton
            label={isInitializing ? "Complete Signup" : "Login"}
            Icon={LoginIcon}
            onClick={onLogin}
            disable={true}
            shrunk={isShrunk}
            systemConfig={systemConfig}
          />
        )}
      </ul>
    </>
  );
};

NavigationEditorComponent.displayName = 'NavigationEditor';

export const NavigationEditor = React.memo(NavigationEditorComponent);

