"use client";

import React, { useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Reorder } from "framer-motion";
import { map } from "lodash";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import { SystemConfig, NavigationItem } from "@/config/systemConfig";
import { Button } from "@/common/components/atoms/button";
import { FaPlus, FaCheck, FaXmark } from "react-icons/fa6";
import { toast } from "sonner";
import EditableText from "@/common/components/atoms/editable-text";
import { CloseIcon } from "@/common/components/atoms/icons/CloseIcon";
import {
  validateNavItemLabel,
} from "@/common/utils/navUtils";
import { NAVIGATION_MAX_LABEL_LENGTH } from "./constants";
import { NavigationItem as NavItemComponent, NavigationButton } from "./NavigationItem";
import NotificationsIcon from "@/common/components/atoms/icons/NotificationsIcon";
import SearchIcon from "@/common/components/atoms/icons/SearchIcon";
import LogoutIcon from "@/common/components/atoms/icons/LogoutIcon";
import LoginIcon from "@/common/components/atoms/icons/LoginIcon";
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
  onRename: (itemId: string, updates: { label?: string }) => void;
  onDelete: (itemId: string) => void;
  onCreate: () => void;
  onCommit: () => void;
  onCancel: () => void;
  hasUncommittedChanges: boolean;
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
  onOpenSearch,
  onLogout,
  onLogin,
}) => {
  // Memoize filtered items to avoid recalculating on every render
  const editableItems = useMemo(
    () => items.filter((item) => item.id !== "notifications"),
    [items]
  );

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
  const previousPathnameRef = useRef<string | null>(pathname);
  
  useEffect(() => {
    if (pathname === null) return;

    // Find the navigation item that matches the current pathname
    const currentItem = localNavigation.find((item) => item.href === pathname);
    
    // If we found a matching item and the pathname hasn't changed externally,
    // we're good (no update needed)
    if (currentItem && pathname === previousPathnameRef.current) {
      previousPathnameRef.current = pathname;
      return;
    }

    // Check if any item's href matches the previous pathname (item was renamed)
    const renamedItem = localNavigation.find(
      (item) => item.href !== pathname && previousPathnameRef.current && item.href === previousPathnameRef.current
    );

    // If we're on a page that was renamed, update the URL
    if (renamedItem && previousPathnameRef.current === pathname) {
      window.history.replaceState(null, "", renamedItem.href);
      previousPathnameRef.current = renamedItem.href;
    } else {
      previousPathnameRef.current = pathname;
    }
  }, [localNavigation, pathname]);

  /**
   * Handles renaming a navigation item
   * 
   * Validates the new label, updates the item in the store (which handles
   * href regeneration), and shows success/error feedback. The URL update
   * is handled by the useEffect that watches localNavigation changes.
   * 
   * @param itemId - ID of the item to rename
   * @param oldLabel - Current label
   * @param newLabel - New label to apply
   */
  const handleRename = React.useCallback(
    (itemId: string, oldLabel: string, newLabel: string) => {
      if (oldLabel !== newLabel) {
        try {
          const item = localNavigation.find((i) => i.id === itemId);
          if (!item) return;

          // Perform the rename - store handles all logic (validation, uniqueness, href generation)
          // URL update is handled by the useEffect that watches localNavigation changes
          onRename(itemId, { label: newLabel });

          toast.success("Navigation item updated");
        } catch (error: unknown) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : "Failed to update navigation item";
          toast.error(errorMessage);
          
          // Re-throw for error boundaries
          if (error instanceof Error) {
            throw error;
          }
        }
      }
    },
    [localNavigation, onRename]
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
              const isSelected = pathname !== null && pathname === item.href;

              return (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className="relative"
                  whileDrag={{ backgroundColor: "#e3e3e3" }}
                  dragListener={true}
                >
                <Link
                  href={item.href}
                  className={mergeClasses(
                    "flex relative items-center p-2 rounded-lg w-full group",
                    isSelected ? "bg-gray-100" : "hover:bg-gray-100",
                    "cursor-grab active:cursor-grabbing",
                    isShrunk ? "justify-center" : ""
                  )}
                  onClick={(e) => {
                    // Prevent navigation only if clicking on delete button or input field
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button[aria-label*="Delete"]') ||
                      target.tagName === "INPUT"
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onKeyDown={(e) => {
                    // Allow keyboard navigation but prevent during drag
                    if (e.key === "Enter" && !e.currentTarget.closest('[data-dragging="true"]')) {
                      // Navigation handled by Link component
                    }
                  }}
                  draggable={false}
                  aria-label={isShrunk ? item.label : undefined}
                  aria-current={isSelected ? "page" : undefined}
                >
                    <div className="flex-shrink-0">
                      <IconComp />
                    </div>
                    {!isShrunk && (
                      <div className="ms-3 flex-1 flex items-center min-w-0">
                        <EditableText
                          initialText={item.label}
                          updateMethod={(oldLabel, newLabel) =>
                            handleRename(item.id, oldLabel, newLabel)
                          }
                          validateInput={validateNavItemLabel}
                          maxLength={NAVIGATION_MAX_LABEL_LENGTH}
                        />
                      </div>
                    )}
                  {!isShrunk && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(item.id);
                        toast.success("Navigation item deleted");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete(item.id);
                          toast.success("Navigation item deleted");
                        }
                      }}
                      className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
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
            "flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 w-full text-gray-600",
            isShrunk ? "justify-center" : "text-left"
          )}
          aria-label="Add navigation item"
        >
          <FaPlus size={14} aria-hidden="true" />
          {!isShrunk && <span className="text-sm">Add Navigation Item</span>}
        </button>

        {/* Commit/Cancel buttons */}
        {hasUncommittedChanges && !isShrunk && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button
              onClick={onCommit}
              className="flex items-center gap-2 rounded-lg px-3 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm flex-1"
            >
              <FaCheck size={12} />
              <span>Commit</span>
            </Button>
            <Button
              onClick={onCancel}
              className="flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-sm"
            >
              <FaXmark size={12} />
              <span>Cancel</span>
            </Button>
          </div>
        )}
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

