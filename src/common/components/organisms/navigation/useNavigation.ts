import { useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { debounce } from "lodash";
import { toast } from "sonner";
import { useAppStore } from "@/common/data/stores/app";
import { SystemConfig, NavigationItem } from "@/config/systemConfig";

export interface UseNavigationReturn {
  localNavigation: NavigationItem[];
  hasUncommittedChanges: boolean;
  navItemsToDisplay: NavigationItem[];
  debouncedUpdateOrder: (newOrder: NavigationItem[]) => void;
  handleCommit: () => Promise<void>;
  handleCancel: () => void;
  handleCreateItem: () => Promise<void>;
}

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

  // Load navigation from config only once on initial mount
  // Don't reload after commits - the store manages its own state
  // systemConfig.navigation may update after commits, but we shouldn't overwrite committed changes
  const hasLoadedNavigationRef = useRef(false);
  const initialNavigationConfigRef = useRef(systemConfig.navigation);
  
  useEffect(() => {
    // Only load on initial mount when store is empty, and only load once
    if (!hasLoadedNavigationRef.current && localNavigation.length === 0) {
      loadNavigation(initialNavigationConfigRef.current);
      hasLoadedNavigationRef.current = true;
    }
  }, [loadNavigation, localNavigation.length]);

  // Debounced reorder handler - use useMemo to properly memoize the debounced function
  const debouncedUpdateOrder = useMemo(
    () => debounce((newOrder: NavigationItem[]) => {
      updateNavigationOrder(newOrder);
    }, 300),
    [updateNavigationOrder]
  );

  // Handle commit
  const handleCommit = useCallback(async () => {
    if (!hasUncommittedChanges()) {
      toast.info("No changes to commit");
      return;
    }
    
    try {
      await commitNavigationChanges(systemConfig.community?.type || "nouns");
      toast.success("Navigation changes committed");
      setNavEditMode(false);
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to commit navigation changes:", error);
      }
      toast.error("Failed to commit navigation changes");
    }
  }, [hasUncommittedChanges, commitNavigationChanges, systemConfig.community?.type, setNavEditMode]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    resetNavigationChanges();
    toast.info("Navigation changes cancelled");
    setNavEditMode(false);
  }, [resetNavigationChanges, setNavEditMode]);

  // Handle create new item
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
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to create navigation item:", error);
      }
      toast.error("Failed to create navigation item");
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

