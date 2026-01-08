import { useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { debounce } from "lodash";
import { toast } from "sonner";
import { useAppStore } from "@/common/data/stores/app";
import { SystemConfig, NavigationItem } from "@/config/systemConfig";
import axios from "axios";
import { NAVIGATION_REORDER_DEBOUNCE_MS } from "./constants";

/**
 * Normalized error type for navigation operations
 */
type NavigationError = 
  | { type: 'VALIDATION'; message: string }
  | { type: 'NETWORK'; message: string; retryable: boolean }
  | { type: 'PERMISSION'; message: string }
  | { type: 'UNKNOWN'; message: string; originalError: unknown };

/**
 * Normalizes various error types into a consistent NavigationError format
 */
function normalizeNavigationError(error: unknown): NavigationError {
  if (error instanceof Error) {
    // Check for validation errors
    if (error.message.includes('Invalid') || error.message.includes('duplicate')) {
      return { type: 'VALIDATION', message: error.message };
    }
    
    // Check for permission errors
    if (error.message.includes('admin') || error.message.includes('permission')) {
      return { type: 'PERMISSION', message: error.message };
    }
    
    // Check for network errors (axios)
    if (axios.isAxiosError(error)) {
      const isRetryable = error.response?.status && error.response.status >= 500;
      return {
        type: 'NETWORK',
        message: error.response?.data?.error?.message || error.message || 'Network error occurred',
        retryable: isRetryable,
      };
    }
    
    return { type: 'UNKNOWN', message: error.message, originalError: error };
  }
  
  return {
    type: 'UNKNOWN',
    message: 'An unexpected error occurred',
    originalError: error,
  };
}

/**
 * Gets a user-friendly error message for display
 */
function getUserFriendlyMessage(error: NavigationError): string {
  switch (error.type) {
    case 'VALIDATION':
      return error.message;
    case 'NETWORK':
      return error.retryable 
        ? 'Network error. Please try again.'
        : error.message;
    case 'PERMISSION':
      return 'You do not have permission to perform this action.';
    case 'UNKNOWN':
      return error.message;
  }
}

export interface UseNavigationReturn {
  localNavigation: NavigationItem[];
  hasUncommittedChanges: boolean;
  navItemsToDisplay: NavigationItem[];
  debouncedUpdateOrder: (newOrder: NavigationItem[]) => void;
  handleCommit: () => Promise<void>;
  handleCancel: () => void;
  handleCreateItem: () => Promise<void>;
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
   * Commits local navigation changes to the database
   * 
   * Validates that there are uncommitted changes before attempting commit.
   * On success, exits edit mode. On error, displays user-friendly message
   * and re-throws critical errors for error boundaries.
   */
  const handleCommit = useCallback(async () => {
    if (!hasUncommittedChanges()) {
      toast.info("No changes to commit");
      return;
    }
    
    try {
      await commitNavigationChanges(systemConfig.community?.type || "nouns");
      toast.success("Navigation changes committed");
      setNavEditMode(false);
    } catch (error: unknown) {
      const navError = normalizeNavigationError(error);
      const userMessage = getUserFriendlyMessage(navError);
      
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to commit navigation changes:", navError);
      }
      
      toast.error(userMessage);
      
      // Re-throw for error boundaries if it's a critical error
      if (navError.type === 'UNKNOWN') {
        throw error;
      }
    }
  }, [hasUncommittedChanges, commitNavigationChanges, systemConfig.community?.type, setNavEditMode]);

  /**
   * Cancels navigation changes and resets to remote state
   * 
   * Discards all local changes and exits edit mode.
   */
  const handleCancel = useCallback(() => {
    resetNavigationChanges();
    toast.info("Navigation changes cancelled");
    setNavEditMode(false);
  }, [resetNavigationChanges, setNavEditMode]);

  /**
   * Creates a new navigation item and navigates to it
   * 
   * Creates a new navigation item with default label "New Item" and
   * automatically navigates to the newly created item's href.
   * The href is auto-generated from the label if not provided.
   */
  const handleCreateItem = useCallback(async () => {
    try {
      const newItem = await createNavigationItem({
        label: "New Item",
        // href will be auto-generated from label if not provided
        icon: "custom",
      });
      toast.success("Navigation item created");
      // Automatically navigate to the new item
      if (newItem?.href) {
        router.push(newItem.href);
      }
    } catch (error: unknown) {
      const navError = normalizeNavigationError(error);
      const userMessage = getUserFriendlyMessage(navError);
      
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to create navigation item:", navError);
      }
      
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
  };
}

