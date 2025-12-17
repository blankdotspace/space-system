import { FidgetInstanceData } from '@/common/fidgets';
import { CompleteFidgets } from '@/fidgets';
import { PlacedGridItem } from '@/fidgets/layout/Grid';
import { v4 as uuidv4 } from 'uuid';

// Fidget types that are good for filling empty spaces (small, simple, versatile)
const FILLER_FIDGET_TYPES = ['text', 'gallery', 'links'] as const;
type FillerFidgetType = typeof FILLER_FIDGET_TYPES[number];

/**
 * Finds empty spaces in the grid and generates fidgets to fill them
 * @param layout Current layout items
 * @param fidgetInstanceDatums Current fidget data
 * @param hasProfile Whether the space has a profile fidget
 * @param hasFeed Whether the space has a feed fidget
 * @returns Updated layout and fidgetInstanceDatums with new filler fidgets
 */
export function fillEmptySpaces(
  layout: PlacedGridItem[],
  fidgetInstanceDatums: { [key: string]: FidgetInstanceData },
  hasProfile: boolean,
  hasFeed: boolean
): {
  filledLayout: PlacedGridItem[];
  filledFidgetInstanceDatums: { [key: string]: FidgetInstanceData };
  addedCount: number;
} {
  const cols = hasFeed ? 6 : 12;
  const maxRows = hasProfile ? 8 : 10;
  const filledLayout = [...layout];
  const filledFidgetInstanceDatums = { ...fidgetInstanceDatums };
  let addedCount = 0;

  // Helper to check if a space is available and within boundaries
  const isSpaceAvailable = (
    x: number,
    y: number,
    w: number,
    h: number
  ): boolean => {
    // Strict boundary check - must be completely within grid
    if (x < 0 || y < 0 || x + w > cols || y + h > maxRows) {
      return false;
    }

    // Check for overlaps with existing items
    for (const item of filledLayout) {
      const horizontalOverlap = !(x + w <= item.x || x >= item.x + item.w);
      const verticalOverlap = !(y + h <= item.y || y >= item.y + item.h);
      
      if (horizontalOverlap && verticalOverlap) {
        return false;
      }
    }
    return true;
  };

  // Helper to check if there's any available space left in the grid
  const hasAvailableSpace = (): boolean => {
    const minSize = 2; // Minimum space size to consider
    for (let y = 0; y <= maxRows - minSize; y++) {
      for (let x = 0; x <= cols - minSize; x++) {
        // Check if this position is occupied
        let isOccupied = false;
        for (const item of filledLayout) {
          if (x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h) {
            isOccupied = true;
            break;
          }
        }
        if (!isOccupied && isSpaceAvailable(x, y, minSize, minSize)) {
          return true;
        }
      }
    }
    return false;
  };

  // Helper to find the best fidget type for a given space
  const getBestFidgetForSpace = (w: number, h: number): FillerFidgetType | null => {
    // Try to find a fidget that fits well in this space
    for (const fidgetType of FILLER_FIDGET_TYPES) {
      const fidget = CompleteFidgets[fidgetType];
      if (!fidget) continue;

      const minW = fidget.properties.size.minWidth;
      const minH = fidget.properties.size.minHeight;
      const maxW = fidget.properties.size.maxWidth;
      const maxH = fidget.properties.size.maxHeight;

      // Check if this fidget can fit in the space
      if (w >= minW && h >= minH && w <= maxW && h <= maxH) {
        return fidgetType;
      }
    }
    return null;
  };

  // Helper to create a default fidget instance
  const createFidgetInstance = (fidgetType: FillerFidgetType, id: string): FidgetInstanceData => {
    const fidget = CompleteFidgets[fidgetType];
    const defaultSettings: Record<string, any> = {};

    // Get default settings from fidget properties
    if (fidget?.properties?.fields) {
      fidget.properties.fields.forEach((field: any) => {
        if (field.default !== undefined) {
          defaultSettings[field.fieldName] = field.default;
        }
      });
    }

    return {
      id,
      fidgetType,
      config: {
        editable: true,
        data: {},
        settings: defaultSettings,
      },
    };
  };

  // Scan the grid for empty spaces more efficiently
  // We'll look for spaces that are at least 2x2 to make it worthwhile
  const minSpaceSize = 2;
  
  // Limit the number of fidgets we add to avoid overcrowding
  // Add at most 4-6 additional fidgets depending on grid size
  const maxAdditionalFidgets = cols === 12 ? 6 : 4;
  
  // Helper to find the largest available space starting from a position
  const findLargestAvailableSpace = (startX: number, startY: number): { w: number; h: number } | null => {
    let bestW = 0;
    let bestH = 0;

    // Calculate maximum possible size that fits within grid boundaries
    const maxPossibleW = cols - startX;
    const maxPossibleH = maxRows - startY;

    // Try expanding horizontally first, then vertically
    // But never exceed grid boundaries
    for (let w = minSpaceSize; w <= Math.min(6, maxPossibleW); w++) {
      for (let h = minSpaceSize; h <= Math.min(6, maxPossibleH); h++) {
        // Double-check boundaries before checking availability
        if (startX + w <= cols && startY + h <= maxRows && isSpaceAvailable(startX, startY, w, h)) {
          const area = w * h;
          const currentBestArea = bestW * bestH;
          if (area > currentBestArea) {
            bestW = w;
            bestH = h;
          }
        } else {
          // If this size doesn't fit, larger sizes won't either
          break;
        }
      }
    }

    return bestW >= minSpaceSize && bestH >= minSpaceSize ? { w: bestW, h: bestH } : null;
  };

  // Check if there's any space available before starting
  if (!hasAvailableSpace()) {
    return { filledLayout, filledFidgetInstanceDatums, addedCount: 0 };
  }

  // Scan grid positions
  for (let y = 0; y <= maxRows - minSpaceSize && addedCount < maxAdditionalFidgets; y++) {
    for (let x = 0; x <= cols - minSpaceSize && addedCount < maxAdditionalFidgets; x++) {
      // Check if grid is completely full
      if (!hasAvailableSpace()) {
        return { filledLayout, filledFidgetInstanceDatums, addedCount };
      }
      // Check if this position is already occupied
      let isOccupied = false;
      for (const item of filledLayout) {
        if (x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h) {
          isOccupied = true;
          // Skip to the end of this item
          x = item.x + item.w - 1;
          break;
        }
      }
      
      if (isOccupied) continue;

      // Find the largest available space starting from this position
      const space = findLargestAvailableSpace(x, y);
      if (space) {
        // Try to find a suitable fidget for this space
        const fidgetType = getBestFidgetForSpace(space.w, space.h);
        if (fidgetType) {
          // Create a new fidget
          const newId = `${fidgetType}:${uuidv4()}`;
          const newFidget = createFidgetInstance(fidgetType, newId);
          
          // Get the fidget's size constraints
          const fidget = CompleteFidgets[fidgetType];
          const minW = fidget.properties.size.minWidth;
          const minH = fidget.properties.size.minHeight;
          
          // Calculate final size ensuring it fits within grid boundaries
          // Use the minimum size or the available space, whichever fits better
          // But ensure it never exceeds grid boundaries
          const maxAllowedW = Math.min(space.w, cols - x, fidget.properties.size.maxWidth || cols);
          const maxAllowedH = Math.min(space.h, maxRows - y, fidget.properties.size.maxHeight || maxRows);
          
          const finalW = Math.max(minW, Math.min(maxAllowedW, space.w));
          const finalH = Math.max(minH, Math.min(maxAllowedH, space.h));

          // Double-check: ensure final position is within grid boundaries
          const isWithinBounds = 
            x >= 0 && 
            y >= 0 && 
            x + finalW <= cols && 
            y + finalH <= maxRows;

          // Verify the space is still available with the final size and within bounds
          if (isWithinBounds && isSpaceAvailable(x, y, finalW, finalH)) {
            // Add to layout
            const newItem: PlacedGridItem = {
              i: newId,
              x,
              y,
              w: finalW,
              h: finalH,
              minW,
              minH,
              maxW: Math.min(fidget.properties.size.maxWidth || finalW, cols - x),
              maxH: Math.min(fidget.properties.size.maxHeight || finalH, maxRows - y),
              resizeHandles: ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'],
              isBounded: false,
            };

            filledLayout.push(newItem);
            filledFidgetInstanceDatums[newId] = newFidget;
            addedCount++;

            // Skip the space we just filled
            x += finalW - 1;
          }
        }
      }
    }
  }

  // Final validation: ensure ALL fidgets in filled layout are within grid boundaries
  const finalValidatedLayout: typeof filledLayout = [];
  const finalValidatedFidgetInstanceDatums = { ...filledFidgetInstanceDatums };

  for (const item of filledLayout) {
    const isValid = 
      item.x >= 0 && 
      item.y >= 0 && 
      item.x + item.w <= cols && 
      item.y + item.h <= maxRows;
    
    if (isValid) {
      finalValidatedLayout.push(item);
    } else {
      // Remove fidget data for invalid items
      delete finalValidatedFidgetInstanceDatums[item.i];
      console.warn(
        `Removed invalid fidget ${item.i} from fillEmptySpaces: ` +
        `x=${item.x}, y=${item.y}, w=${item.w}, h=${item.h}, ` +
        `cols=${cols}, maxRows=${maxRows}`
      );
    }
  }

  return {
    filledLayout: finalValidatedLayout,
    filledFidgetInstanceDatums: finalValidatedFidgetInstanceDatums,
    addedCount,
  };
}

export function comprehensiveCleanup(
  layout: PlacedGridItem[],
  fidgetInstanceDatums: { [key: string]: FidgetInstanceData },
  hasProfile: boolean,
  hasFeed: boolean
): { 
  cleanedLayout: PlacedGridItem[]; 
  cleanedFidgetInstanceDatums: { [key: string]: FidgetInstanceData };
  hasChanges: boolean;
} {
  let hasChanges = false;
  
  // Key migration map for settings
  const keyMap: Record<string, string> = {
    "fidget Shadow": "fidgetShadow",
    "font Color": "fontColor",
  };

  // Step 1: Remove orphaned layout items (layout items without corresponding data)
  const validLayout = layout.filter(item => fidgetInstanceDatums[item.i]);
  if (validLayout.length !== layout.length) {
    hasChanges = true;
  }

  // Step 2: Remove unused fidgets and migrate settings
  const layoutFidgetIds = new Set(validLayout.map(item => item.i));
  const cleanedFidgetInstanceDatums = { ...fidgetInstanceDatums };
  
  Object.keys(cleanedFidgetInstanceDatums).forEach(id => {
    if (!layoutFidgetIds.has(id)) {
      // Remove unused fidgets
      delete cleanedFidgetInstanceDatums[id];
      hasChanges = true;
    } else {
      // Migrate settings keys
      const settings = cleanedFidgetInstanceDatums[id].config?.settings as Record<string, unknown>;
      if (settings) {
        Object.entries(keyMap).forEach(([oldKey, newKey]) => {
          if (oldKey in settings) {
            settings[newKey] = settings[oldKey];
            delete settings[oldKey];
            hasChanges = true;
          }
        });
      }
    }
  });

  // Step 3: Handle overlapping fidgets
  const { cleanedLayout, removedFidgetIds } = resolveOverlaps(
    validLayout,
    cleanedFidgetInstanceDatums,
    hasProfile,
    hasFeed
  );

  // Remove data for fidgets that couldn't be repositioned
  if (removedFidgetIds.length > 0) {
    removedFidgetIds.forEach(id => delete cleanedFidgetInstanceDatums[id]);
    hasChanges = true;
  }

  // Check for layout position changes
  if (cleanedLayout.some((item, i) => validLayout[i] && (item.x !== validLayout[i].x || item.y !== validLayout[i].y))) {
    hasChanges = true;
  }

  // Final validation: ensure ALL fidgets are within grid boundaries
  const cols = hasFeed ? 6 : 12;
  const maxRows = hasProfile ? 8 : 10;
  const finalValidatedLayout: typeof cleanedLayout = [];
  const finalValidatedFidgetInstanceDatums = { ...cleanedFidgetInstanceDatums };

  for (const item of cleanedLayout) {
    const isValid = 
      item.x >= 0 && 
      item.y >= 0 && 
      item.x + item.w <= cols && 
      item.y + item.h <= maxRows;
    
    if (isValid) {
      finalValidatedLayout.push(item);
    } else {
      // Remove fidget data for invalid items
      delete finalValidatedFidgetInstanceDatums[item.i];
      hasChanges = true;
    }
  }

  return {
    cleanedLayout: finalValidatedLayout,
    cleanedFidgetInstanceDatums: finalValidatedFidgetInstanceDatums,
    hasChanges,
  };
}

export function resolveOverlaps(
  layout: PlacedGridItem[],
  fidgetInstanceDatums: { [key: string]: FidgetInstanceData },
  hasProfile: boolean,
  hasFeed: boolean
): { cleanedLayout: PlacedGridItem[]; removedFidgetIds: string[] } {
  const cols = hasFeed ? 6 : 12;
  const maxRows = hasProfile ? 8 : 10;
  const cleanedLayout: typeof layout = [];
  const removedFidgetIds: string[] = [];

  // Helper function to check if a position is valid (no overlaps)
  const isSpaceAvailable = (
    x: number,
    y: number,
    w: number,
    h: number,
    excludeId?: string
  ): boolean => {
    for (const item of cleanedLayout) {
      if (item.i === excludeId) {
        continue;
      }
      
      // Check if rectangles overlap
      const horizontalOverlap = !(x + w <= item.x || x >= item.x + item.w);
      const verticalOverlap = !(y + h <= item.y || y >= item.y + item.h);
      
      if (horizontalOverlap && verticalOverlap) {
        return false;
      }
    }
    return true;
  };

  // Process each fidget in the layout
  for (const item of layout) {
    // Ensure item dimensions don't exceed grid size
    // Also ensure minimum size constraints are respected
    const fidgetData = fidgetInstanceDatums[item.i];
    let itemW = Math.min(item.w, cols);
    let itemH = Math.min(item.h, maxRows);
    
    // If we have fidget data, ensure we respect min/max constraints
    if (fidgetData) {
      // We can't access CompleteFidgets here easily, so we'll use item's min/max if available
      if (item.minW) itemW = Math.max(itemW, item.minW);
      if (item.minH) itemH = Math.max(itemH, item.minH);
      if (item.maxW) itemW = Math.min(itemW, item.maxW);
      if (item.maxH) itemH = Math.min(itemH, item.maxH);
    }
    
    // Final check: ensure dimensions fit within grid
    itemW = Math.min(itemW, cols);
    itemH = Math.min(itemH, maxRows);
    
    // First, check if the item is within grid boundaries
    const isWithinBounds = 
      item.x >= 0 && 
      item.y >= 0 && 
      item.x + itemW <= cols && 
      item.y + itemH <= maxRows;

    // If within bounds and no overlaps, keep the position (with corrected dimensions)
    if (isWithinBounds && isSpaceAvailable(item.x, item.y, itemW, itemH, item.i)) {
      cleanedLayout.push({
        ...item,
        w: itemW,
        h: itemH,
      });
      continue;
    }

    // If current position is invalid (out of bounds or overlapping), try to find a new position
    let found = false;
    // Search from top-left, going row by row
    for (let y = 0; y <= maxRows - itemH; y++) {
      for (let x = 0; x <= cols - itemW; x++) {
        // Double-check boundaries before checking availability
        if (x + itemW <= cols && y + itemH <= maxRows && isSpaceAvailable(x, y, itemW, itemH, item.i)) {
          cleanedLayout.push({
            ...item,
            x,
            y,
            w: itemW,
            h: itemH,
          });
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // If no valid position found, mark for removal
    if (!found) {
      removedFidgetIds.push(item.i);
    }
  }

  return { cleanedLayout, removedFidgetIds };
} 
export const cleanupLayout = comprehensiveCleanup;
