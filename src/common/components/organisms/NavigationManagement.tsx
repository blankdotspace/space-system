"use client";

import React, { useCallback, useState } from "react";
import { Reorder } from "framer-motion";
import { map, debounce } from "lodash";
import { NavigationItem } from "@/config/systemConfig";
import { useAppStore } from "@/common/data/stores/app";
import { Button } from "../atoms/button";
import { FaPlus, FaCheck, FaXmark } from "react-icons/fa6";
import { toast } from "sonner";
import EditableText from "../atoms/editable-text";
import { CloseIcon } from "../atoms/icons/CloseIcon";
import { TooltipProvider } from "../atoms/tooltip";

interface NavigationManagementProps {
  navigationItems: NavigationItem[];
  isEditable: boolean;
  communityId: string;
  onCommit?: () => void;
  onCancel?: () => void;
}

export default function NavigationManagement({
  navigationItems,
  isEditable,
  communityId,
  onCommit,
  onCancel,
}: NavigationManagementProps) {
  const {
    localNavigation,
    hasUncommittedChanges,
    createNavigationItem,
    deleteNavigationItem,
    renameNavigationItem,
    updateNavigationOrder,
    commitNavigationChanges,
    resetNavigationChanges,
  } = useAppStore((state) => ({
    localNavigation: state.navigation.localNavigation,
    hasUncommittedChanges: state.navigation.hasUncommittedChanges,
    createNavigationItem: state.navigation.createNavigationItem,
    deleteNavigationItem: state.navigation.deleteNavigationItem,
    renameNavigationItem: state.navigation.renameNavigationItem,
    updateNavigationOrder: state.navigation.updateNavigationOrder,
    commitNavigationChanges: state.navigation.commitNavigationChanges,
    resetNavigationChanges: state.navigation.resetNavigationChanges,
  }));

  const [isCommitting, setIsCommitting] = useState(false);

  // Use local navigation items if available, otherwise fall back to props
  // Only use localNavigation if it has items (not empty array from initial state)
  const items = localNavigation.length > 0 || navigationItems.length === 0
    ? localNavigation.length > 0 ? localNavigation : navigationItems
    : navigationItems;

  const debouncedUpdateOrder = useCallback(
    debounce((newOrder: NavigationItem[]) => {
      updateNavigationOrder(newOrder);
    }, 300),
    [updateNavigationOrder]
  );

  const handleCreateItem = useCallback(async () => {
    try {
      await createNavigationItem({
        label: "New Item",
        // href will be auto-generated from label if not provided
        icon: "custom",
      });
      toast.success("Navigation item created");
    } catch (error: any) {
      console.error("Failed to create navigation item:", error);
      toast.error(error.message || "Failed to create navigation item");
    }
  }, [createNavigationItem]);

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      deleteNavigationItem(itemId);
      toast.success("Navigation item deleted");
    },
    [deleteNavigationItem]
  );

  const handleRenameItem = useCallback(
    (itemId: string, newLabel: string) => {
      renameNavigationItem(itemId, { label: newLabel });
    },
    [renameNavigationItem]
  );

  const handleCommit = useCallback(async () => {
    if (!hasUncommittedChanges()) {
      toast.info("No changes to commit");
      return;
    }

    setIsCommitting(true);
    try {
      await commitNavigationChanges(communityId);
      toast.success("Navigation changes committed (local only - API endpoints pending)");
      onCommit?.();
    } catch (error: any) {
      console.error("Failed to commit navigation changes:", error);
      // For local testing, still show success if it's just a 404 (API not implemented)
      if (error?.response?.status === 404) {
        toast.success("Navigation changes staged locally (API endpoints not yet implemented)");
        onCommit?.();
      } else {
        toast.error("Failed to commit navigation changes");
      }
    } finally {
      setIsCommitting(false);
    }
  }, [hasUncommittedChanges, commitNavigationChanges, communityId, onCommit]);

  const handleCancel = useCallback(() => {
    resetNavigationChanges();
    toast.info("Navigation changes cancelled");
    onCancel?.();
  }, [resetNavigationChanges, onCancel]);

  if (!isEditable) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Manage Navigation
          </h3>
          <Button
            onClick={handleCreateItem}
            className="flex items-center gap-2 rounded-lg p-2 bg-[#F3F4F6] hover:bg-sky-100 text-[#1C64F2] font-semibold text-xs"
          >
            <FaPlus size={12} />
            <span>Add</span>
          </Button>
        </div>

        <Reorder.Group
          axis="y"
          onReorder={debouncedUpdateOrder}
          values={items}
          className="flex flex-col gap-2"
        >
          {map(items, (item) => (
            <Reorder.Item
              key={item.id}
              value={item}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing"
            >
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-gray-500">⋮⋮</span>
                <EditableText
                  initialText={item.label}
                  updateMethod={(oldLabel, newLabel) => {
                    if (oldLabel !== newLabel) {
                      handleRenameItem(item.id, newLabel);
                    }
                  }}
                />
                <span className="text-xs text-gray-400">({item.href})</span>
              </div>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="p-1 hover:bg-red-100 rounded"
                aria-label="Delete item"
              >
                <CloseIcon />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {hasUncommittedChanges() && (
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleCommit}
              disabled={isCommitting}
              className="flex items-center gap-2 rounded-lg px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm flex-1"
            >
              <FaCheck size={14} />
              <span>{isCommitting ? "Committing..." : "Commit Changes"}</span>
            </Button>
            <Button
              onClick={handleCancel}
              className="flex items-center gap-2 rounded-lg px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-sm"
            >
              <FaXmark size={14} />
              <span>Cancel</span>
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

