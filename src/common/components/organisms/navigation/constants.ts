/**
 * Navigation component constants
 * 
 * These values control timing, limits, and behavior for navigation operations.
 */

/**
 * Debounce delay for reorder operations (milliseconds)
 * 
 * When users drag navigation items to reorder them, we debounce the updates
 * to avoid excessive API calls. 300ms provides a good balance between
 * responsiveness and reducing unnecessary operations.
 */
export const NAVIGATION_REORDER_DEBOUNCE_MS = 300;

/**
 * Maximum length for navigation item labels (characters)
 * 
 * Navigation labels are displayed in the sidebar and should be concise.
 * 50 characters provides enough space for descriptive names while
 * maintaining a clean UI. This matches common UX patterns for navigation.
 */
export const NAVIGATION_MAX_LABEL_LENGTH = 50;

/**
 * Maximum iterations for generating unique navigation item names
 * 
 * When auto-generating unique names (e.g., "Item", "Item - 1", "Item - 2"),
 * we limit iterations to prevent infinite loops. 100 iterations should be
 * more than sufficient for any reasonable use case.
 */
export const NAVIGATION_MAX_UNIQUE_NAME_ITERATIONS = 100;

