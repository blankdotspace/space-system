export type GridSizeMetadata = {
  columns: number;
  rows: number;
  rowHeight?: number;
  margin?: [number, number];
  containerPadding?: [number, number];
  hasFeed?: boolean;
  hasProfile?: boolean;
  isInferred?: boolean;
};

type LayoutDimensions = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  i?: string; // item id
  [key: string]: any; // allow other properties
};

const cloneTuple = (tuple?: [number, number]): [number, number] | undefined =>
  Array.isArray(tuple) ? [tuple[0], tuple[1]] : undefined;

const normalizeBaseSize = (input: GridSizeMetadata): GridSizeMetadata => ({
  columns: input.columns ?? DEFAULT_GRID_SIZE.columns,
  rows: input.rows ?? DEFAULT_GRID_SIZE.rows,
  rowHeight: input.rowHeight ?? DEFAULT_GRID_SIZE.rowHeight,
  margin: cloneTuple(input.margin) ?? cloneTuple(DEFAULT_GRID_SIZE.margin),
  containerPadding:
    cloneTuple(input.containerPadding) ?? cloneTuple(DEFAULT_GRID_SIZE.containerPadding),
  hasFeed: input.hasFeed,
  hasProfile: input.hasProfile,
  isInferred: input.isInferred ?? true,
});

export const DEFAULT_GRID_SIZE: GridSizeMetadata = {
  columns: 12,
  rows: 10,
  rowHeight: 70,
  margin: [16, 16],
  containerPadding: [16, 16],
  isInferred: true,
};

export const FEED_GRID_COLUMNS = 6;
export const PROFILE_GRID_ROWS = 8;

/**
 * Detect space type from fidgetInstanceDatums.
 * Profile spaces have "feed:profile" fidget, Channel spaces have "feed:channel" fidget.
 */
export function detectSpaceTypeFromFidgets(
  fidgetInstanceDatums?: Record<string, any> | null
): "Profile" | "Channel" | null {
  if (!fidgetInstanceDatums) return null;
  
  const fidgetIds = Object.keys(fidgetInstanceDatums);
  if (fidgetIds.includes("feed:profile")) {
    return "Profile";
  }
  if (fidgetIds.includes("feed:channel")) {
    return "Channel";
  }
  
  return null;
}

/**
 * Get grid size based on space type (tab name or detected from fidgets).
 * 
 * TODO: Consider making this dynamic in the future instead of hardcoding.
 * For now, all space types use full grid size (12x10) except:
 * - Profile spaces: 12 columns, 8 rows (due to immutable profile fidget)
 * - Channel spaces: 12 columns, 8 rows (due to immutable channel fidget)
 * 
 * When adding new space types that don't use full-size grid, add them here.
 */
export function getGridSizeForSpaceType(
  tabName?: string | null,
  fidgetInstanceDatums?: Record<string, any> | null
): GridSizeMetadata {
  // First try to detect from tab name
  let spaceType: "Profile" | "Channel" | null = null;
  
  if (tabName === "Profile" || tabName === "Channel") {
    spaceType = tabName as "Profile" | "Channel";
  } else {
    // Fallback: detect from fidgetInstanceDatums
    spaceType = detectSpaceTypeFromFidgets(fidgetInstanceDatums);
  }
  
  // Profile and Channel spaces have reduced row count due to immutable fidgets
  if (spaceType === "Profile" || spaceType === "Channel") {
    return {
      columns: 12,
      rows: 8,
      rowHeight: 70,
      margin: [16, 16],
      containerPadding: [16, 16],
      hasProfile: spaceType === "Profile",
      hasFeed: false,
      isInferred: false,
    };
  }

  // All other space types use full grid size
  return DEFAULT_GRID_SIZE;
}

export function inferGridSizeFromLayout(
  layout?: LayoutDimensions[] | null,
  fallback: GridSizeMetadata = DEFAULT_GRID_SIZE,
): GridSizeMetadata {
  const base = normalizeBaseSize(fallback);

  if (!Array.isArray(layout) || layout.length === 0) {
    return base;
  }

  let maxColumns = 0;
  let maxRows = 0;

  for (const item of layout) {
    const width = typeof item?.w === "number" ? item.w : 0;
    const height = typeof item?.h === "number" ? item.h : 0;
    const x = typeof item?.x === "number" ? item.x : 0;
    const y = typeof item?.y === "number" ? item.y : 0;

    const columnExtent = x + width;
    const rowExtent = y + height;

    if (columnExtent > maxColumns) {
      maxColumns = columnExtent;
    }

    if (rowExtent > maxRows) {
      maxRows = rowExtent;
    }
  }

  return {
    ...base,
    columns: Math.max(maxColumns, base.columns),
    rows: Math.max(maxRows, base.rows),
  };
}

export function ensureGridSize(options: {
  existing?: GridSizeMetadata;
  layout?: LayoutDimensions[] | null;
  fallback?: GridSizeMetadata;
} = {}): GridSizeMetadata {
  const fallback = normalizeBaseSize(options.fallback ?? DEFAULT_GRID_SIZE);

  if (options.existing?.columns && options.existing?.rows) {
    return {
      ...fallback,
      ...options.existing,
      columns: options.existing.columns,
      rows: options.existing.rows,
      margin: cloneTuple(options.existing.margin) ?? fallback.margin,
      containerPadding:
        cloneTuple(options.existing.containerPadding) ?? fallback.containerPadding,
      isInferred: options.existing.isInferred ?? false,
    };
  }

  return inferGridSizeFromLayout(options.layout, fallback);
}

/**
 * Validate and fix layout items to ensure they fit within grid boundaries.
 * This is critical for Profile/Channel spaces which have reduced grid size (8 rows).
 */
export function validateAndFixLayout(
  layout: LayoutDimensions[],
  gridSize: GridSizeMetadata
): LayoutDimensions[] {
  if (!Array.isArray(layout) || layout.length === 0) {
    return layout;
  }
  
  const maxCols = gridSize.columns || 12;
  const maxRows = gridSize.rows || 10;
  
  console.log(`🔍 Validating ${layout.length} layout items against grid ${maxCols}x${maxRows}`);
  
  return layout.map((item, index) => {
    // Extract values with defaults
    const x = typeof item.x === "number" ? item.x : 0;
    const y = typeof item.y === "number" ? item.y : 0;
    const w = typeof item.w === "number" && item.w > 0 ? item.w : 1;
    const h = typeof item.h === "number" && item.h > 0 ? item.h : 1;
    
    // Check if item is out of bounds
    const outOfBoundsX = x + w > maxCols;
    const outOfBoundsY = y + h > maxRows;
    const negativeX = x < 0;
    const negativeY = y < 0;
    
    // Clamp position to valid range
    const fixedX = Math.max(0, Math.min(x, maxCols - 1));
    const fixedY = Math.max(0, Math.min(y, maxRows - 1));
    
    // Adjust size to fit within remaining space
    const fixedW = Math.max(1, Math.min(w, maxCols - fixedX));
    const fixedH = Math.max(1, Math.min(h, maxRows - fixedY));
    
    // If item was outside bounds, log a warning
    if (outOfBoundsX || outOfBoundsY || negativeX || negativeY || 
        x !== fixedX || y !== fixedY || w !== fixedW || h !== fixedH) {
      console.warn(`🔧 Fixed layout item ${item.i || `item[${index}]`} to fit grid:`, {
        original: { x, y, w, h },
        fixed: { x: fixedX, y: fixedY, w: fixedW, h: fixedH },
        gridSize: { columns: maxCols, rows: maxRows },
        issues: {
          outOfBoundsX,
          outOfBoundsY,
          negativeX,
          negativeY
        }
      });
    }
    
    // Return fixed item with all original properties preserved
    return {
      ...item,
      x: fixedX,
      y: fixedY,
      w: fixedW,
      h: fixedH,
    };
  });
}


