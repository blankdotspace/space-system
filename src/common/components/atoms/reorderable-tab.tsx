import * as React from "react";
import { motion, Reorder } from "framer-motion";
import { CloseIcon } from "./icons/CloseIcon";
import EditableText from "./editable-text";
import Link from "next/link";
import { useUIColors } from "@/common/lib/hooks/useUIColors";

interface Props {
  tabName: string;
  inEditMode: boolean;
  isSelected: boolean;
  onClick: (tabName: string, e?: React.MouseEvent) => void;
  removeable: boolean;
  draggable: boolean;
  renameable: boolean;
  onRemove?: () => void;
  renameTab?: (tabName: string, newName: string) => void;
  getSpacePageUrl: (tabName: string) => string;
  preloadTabData?: (tabName: string) => void;
}

export const Tab = ({
  getSpacePageUrl,
  tabName,
  inEditMode,
  isSelected,
  onClick,
  removeable,
  draggable,
  renameable,
  onRemove,
  renameTab,
  preloadTabData,
}: Props) => {
  const uiColors = useUIColors();
  return (
    <Reorder.Item
      value={tabName}
      id={tabName}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.15 },
      }}
      exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}
      whileDrag={{ backgroundColor: "#e3e3e3" }}
      className={isSelected ? "selected relative" : "relative"}
      onPointerDown={inEditMode ? undefined : (e) => e.preventDefault()}
      dragListener={draggable}
      onMouseEnter={() => preloadTabData && preloadTabData(tabName)}
      onTouchStart={() => preloadTabData && preloadTabData(tabName)}
    >
      <Link
        href={getSpacePageUrl(tabName)}
        draggable={false}
        onClick={(e) => {
          if (!inEditMode) {
            e.preventDefault();
            onClick(tabName, e);
          }
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className={`static flex md:p-2 items-center transition-colors duration-300 group`}
          style={{
            color: isSelected ? uiColors.primaryColor : undefined,
            fontWeight: isSelected ? 'bold' : undefined,
            cursor: isSelected && inEditMode ? 'grab' : isSelected ? undefined : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.color = uiColors.primaryColor;
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.color = '';
            }
          }}
        >
          {/* Text */}
          <motion.span layout="position" className="whitespace-nowrap">
            {inEditMode && renameable && isSelected ? (
              <div className="cursor-text">
                <EditableText initialText={tabName} updateMethod={renameTab} />
              </div>
            ) : (
              tabName
            )}
          </motion.span>

          {/* Close Icon */}
          {removeable && onRemove && inEditMode && isSelected && (
            <motion.div layout>
              <motion.button
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onRemove();
                }}
                initial={false}
                animate={{ color: isSelected ? "#000" : "#fff" }}
                className="flex items-center w-2"
              >
                <CloseIcon />
              </motion.button>
            </motion.div>
          )}

          {/* Selection Underline */}
          <span
            className={`absolute left-50 bottom-0 inset-x-0 origin-center h-0.5 transition-scale duration-300 z-20 ${isSelected ? "scale-50" : "scale-0"} group-hover:scale-25`}
            style={{ backgroundColor: uiColors.primaryColor }}
          />
        </div>
      </Link>
    </Reorder.Item>
  );
};