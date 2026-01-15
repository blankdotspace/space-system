import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { debounce } from "lodash";
import { toast } from "sonner";
import { useAppStore } from "@/common/data/stores/app";
import { SystemConfig, NavigationItem } from "@/config/systemConfig";
import { NAVIGATION_REORDER_DEBOUNCE_MS } from "./constants";
import { normalizeNavigationError, getUserFriendlyMessage } from "./errorHandling";
import { DEFAULT_COMMUNITY_ID } from "@/config/loaders/registry";

export interface UseNavigationReturn {
  localNavigation: NavigationItem[];
  hasUncommittedChanges: boolean;
  navItemsToDisplay: NavigationItem[];
  debouncedUpdateOrder: (newOrder: NavigationItem[]) => void;
  handleCommit: () => Promise<void>;
  handleCancel: () => void;
  handleCreateItem: () => Promise<void>;
  isCommitting: boolean;
}

/**
 * Custom hook for managing navigation state and operations
 * 
 * Encapsulates all navigation-related Zustand store interactions and provides
 * a clean API for navigation management. Handles loading, creating, deleting,
 * renaming, reordering, and committing navigation items.
 * 
 * @param systemConfig - System configuration containing navigation items and community settings
 * @param setNavEditMode - Callback function to toggle navigation edit mode
 * @returns Navigation state and handler functions
 * 
 * @example
 * ```tsx
 * const { localNavigation, handleCommit, handleCreateItem } = useNavigation(
 *   systemConfig,
 *   setNavEditMode
 * );
 * ```
 */
export function useNavigation(
  systemConfig: SystemConfig,
  setNavEditMode: (value: boolean) => void
): UseNavigationReturn {
  const router = useRouter();
  const pathname = usePathname();
  const [isCommitting, setIsCommitting] = useState(false);
  
  // Track pending cancel operation - reset will happen after navigation completes
  const pendingCancelTargetRef = useRef<string | null>(null);
  
  const {
    loadNavigation,
    localNavigation,
    hasUncommittedChanges,
    createNavigationItem,
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

  /**
   * Load navigation from config only once on initial mount
   * 
   * Prevents reloading after commits - the store manages its own state.
   * systemConfig.navigation may update after commits, but we shouldn't
   * overwrite committed changes with potentially stale config data.
   */
  const hasLoadedNavigationRef = useRef(false);
  const initialNavigationConfigRef = useRef(systemConfig.navigation);
  
  useEffect(() => {
    // Only load on initial mount when store is empty, and only load once
    if (!hasLoadedNavigationRef.current && localNavigation.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNavigation] Loading navigation from config:', {
          itemCount: initialNavigationConfigRef.current?.items?.length || 0,
          items: initialNavigationConfigRef.current?.items?.map(i => ({ id: i.id, label: i.label, href: i.href }))
        });
      }
      loadNavigation(initialNavigationConfigRef.current);
      hasLoadedNavigationRef.current = true;
    }
  }, [loadNavigation, localNavigation.length]);

  /**
   * Debounced reorder handler
   * 
   * Debounces navigation item reordering to avoid excessive store updates
   * while users drag items. Uses NAVIGATION_REORDER_DEBOUNCE_MS constant
   * for consistent timing across the application.
   */
  const debouncedUpdateOrder = useMemo(
    () => debounce((newOrder: NavigationItem[]) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNavigation] Updating navigation order:', {
          itemCount: newOrder.length,
          order: newOrder.map(i => ({ id: i.id, label: i.label }))
        });
      }
      updateNavigationOrder(newOrder);
    }, NAVIGATION_REORDER_DEBOUNCE_MS),
    [updateNavigationOrder]
  );

  // Cleanup debounced function on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      debouncedUpdateOrder.cancel();
    };
  }, [debouncedUpdateOrder]);

  /**
   * Watch for navigation completion after cancel
   * 
   * When cancel is triggered, we navigate first and keep localNavigation intact
   * until navigation completes. Once pathname matches the target, we can safely
   * reset localNavigation without causing a 404 flash.
   */
  useEffect(() => {
    if (!pendingCancelTargetRef.current) {
      return;
    }

    // Check if we've reached the target (or if we were already there)
    if (pathname === pendingCancelTargetRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNavigation] Navigation completed, resetting navigation changes:', {
          target: pendingCancelTargetRef.current,
          currentPathname: pathname
        });
      }
      
      // Navigation completed - safe to reset now
      pendingCancelTargetRef.current = null; // Clear before reset to avoid loops
      
      resetNavigationChanges();
      toast.info("Navigation changes cancelled");
      setNavEditMode(false);
    }
  }, [pathname, resetNavigationChanges, setNavEditMode]);

  // Cleanup: clear pending cancel on unmount
  useEffect(() => {
    return () => {
      pendingCancelTargetRef.current = null;
    };
  }, []);

  /**
   * Commits local navigation changes to the database
   * 
   * Validates that there are uncommitted changes before attempting commit.
   * On success, exits edit mode. On error, displays user-friendly message
   * and re-throws critical errors for error boundaries.
   */
  const handleCommit = useCallback(async () => {
    if (!hasUncommittedChanges()) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNavigation] Commit skipped: no uncommitted changes');
      }
      toast.info("No changes to commit");
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[useNavigation] Starting commit:', {
        communityId: systemConfig.communityId || DEFAULT_COMMUNITY_ID,
        localItemCount: localNavigation.length,
        items: localNavigation.map(i => ({ id: i.id, label: i.label, href: i.href, spaceId: i.spaceId }))
      });
    }
    
    setIsCommitting(true);
    try {
      // Pass existing navigation config to preserve fields like logoTooltip, showMusicPlayer, showSocials
      // Reconstruct from systemConfig.navigation which has the current values
      await commitNavigationChanges(
        systemConfig.communityId || DEFAULT_COMMUNITY_ID,
        systemConfig.navigation
      );
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNavigation] Commit successful');
      }
      toast.success("Navigation changes committed");
      setNavEditMode(false);
    } catch (error: unknown) {
      const navError = normalizeNavigationError(error);
      const userMessage = getUserFriendlyMessage(navError);
      
      console.error('[useNavigation] Commit failed:', {
        error: navError,
        errorType: navError.type,
        message: userMessage,
        originalError: error
      });
      
      toast.error(userMessage);
      
      // Re-throw for error boundaries if it's a critical error
      if (navError.type === 'UNKNOWN') {
        throw error;
      }
    } finally {
      setIsCommitting(false);
    }
  }, [
    hasUncommittedChanges,
    commitNavigationChanges,
    systemConfig.communityId,
    systemConfig.navigation,
    setNavEditMode,
    localNavigation,
  ]);

  /**
   * Cancels navigation changes and resets to remote state
   * 
   * First navigates to the first navigation item (from committed config),
   * then waits for navigation to complete before discarding local changes.
   * This prevents a 404 flash by keeping uncommitted items available during navigation.
   */
  const handleCancel = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useNavigation] Canceling navigation changes:', {
        localItemCount: localNavigation.length,
        remoteItemCount: systemConfig.navigation?.items?.length || 0
      });
    }
    
    // Navigate to first navigation item before canceling
    // Use systemConfig.navigation which has the committed/remote state
    const navItems = systemConfig.navigation?.items || [];
    const firstNavItem = navItems[0];
    
    if (firstNavItem?.href) {
      // If we're already on the target path, reset immediately
      if (pathname === firstNavItem.href) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[useNavigation] Already on target path, resetting immediately');
        }
        resetNavigationChanges();
        toast.info("Navigation changes cancelled");
        setNavEditMode(false);
        return;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNavigation] Navigating to first item before cancel:', firstNavItem.href);
      }
      
      // Store the target - reset will happen in useEffect once navigation completes
      // This ensures uncommitted items remain available during navigation transition
      pendingCancelTargetRef.current = firstNavItem.href;
      
      // Navigate first - localNavigation will remain intact until pathname matches target
      router.push(firstNavItem.href);
      
      // Note: resetNavigationChanges will be called in useEffect once pathname === firstNavItem.href
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNavigation] No navigation items found, resetting immediately');
      }
      // If no navigation items, just reset immediately (no navigation needed)
      resetNavigationChanges();
      toast.info("Navigation changes cancelled");
      setNavEditMode(false);
    }
  }, [resetNavigationChanges, setNavEditMode, systemConfig.navigation, router, pathname, localNavigation.length]);

  /**
   * Creates a new navigation item and navigates to it
   * 
   * Creates a new navigation item with default label "New Item" and
   * automatically navigates to the newly created item's href.
   * The href is auto-generated from the label if not provided.
   */
  const handleCreateItem = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useNavigation] Creating new navigation item');
    }
    try {
      const newItem = await createNavigationItem({
        label: "New Item",
        // href will be auto-generated from label if not provided
        icon: "custom",
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNavigation] Navigation item created:', {
          id: newItem.id,
          label: newItem.label,
          href: newItem.href,
          spaceId: newItem.spaceId
        });
      }
      toast.success("Navigation item created");
      // Automatically navigate to the new item
      if (newItem?.href) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[useNavigation] Navigating to new item:', newItem.href);
        }
        router.push(newItem.href);
      }
    } catch (error: unknown) {
      const navError = normalizeNavigationError(error);
      const userMessage = getUserFriendlyMessage(navError);
      
      console.error('[useNavigation] Failed to create navigation item:', {
        error: navError,
        errorType: navError.type,
        message: userMessage,
        originalError: error
      });
      
      toast.error(userMessage);
      
      // Re-throw for error boundaries if it's a critical error
      if (navError.type === 'UNKNOWN') {
        throw error;
      }
    }
  }, [createNavigationItem, router]);

  return {
    localNavigation,
    hasUncommittedChanges: hasUncommittedChanges(),
    navItemsToDisplay: localNavigation, // Use localNavigation directly, no need for alias
    debouncedUpdateOrder,
    handleCommit,
    handleCancel,
    handleCreateItem,
    isCommitting,
  };
}

