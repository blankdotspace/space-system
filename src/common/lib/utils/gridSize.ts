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

