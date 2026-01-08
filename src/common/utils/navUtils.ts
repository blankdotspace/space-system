/**
 * Navigation item management utilities
 * Reuses tab validation utilities where applicable, adds nav-specific validation
 */

import { isDuplicateTabName, generateUniqueName } from "./tabUtils";
import { NavigationItem } from "@/config/systemConfig";

/**
 * Validates a navigation item label
 * Allows letters, numbers, hyphens, underscores, spaces, and $ (for token symbols)
 * @param label The navigation label to validate
 * @returns Error message string if invalid, null if valid
 */
export function validateNavItemLabel(label: string): string | null {
  if (!label || !label.trim()) {
    return "Navigation label cannot be empty.";
  }
  
  // Allow letters, numbers, hyphens, underscores, spaces, and $ (for token symbols like $SPACE)
  if (/[^a-zA-Z0-9-_ $]/.test(label)) {
    return "The navigation label contains invalid characters. Only letters, numbers, hyphens, underscores, spaces, and $ are allowed.";
  }
  
  // Additional length check for nav labels
  if (label.trim().length > 50) {
    return "Navigation label is too long. Maximum 50 characters.";
  }
  
  return null;
}

/**
 * Validates a navigation item href (path or URL)
 * @param href The navigation href to validate
 * @returns Error message string if invalid, null if valid
 */
export function validateNavItemHref(href: string): string | null {
  if (!href || !href.trim()) {
    return "Navigation href cannot be empty.";
  }
  
  const trimmedHref = href.trim();
  
  // Internal routes (must start with /)
  if (trimmedHref.startsWith("/")) {
    // Validate path: only allow URL-safe characters
    if (!/^\/[a-zA-Z0-9\-_/]*$/.test(trimmedHref)) {
      return "Invalid path format. Use only letters, numbers, hyphens, underscores, and slashes.";
    }
    // Prevent double slashes (except at start for protocol-relative URLs)
    if (trimmedHref.includes("//") && !trimmedHref.startsWith("//")) {
      return "Invalid path format. Remove double slashes.";
    }
  } else {
    // External URLs - validate URL format
    try {
      const url = new URL(trimmedHref);
      if (!["http:", "https:"].includes(url.protocol)) {
        return "External URLs must use http:// or https://";
      }
    } catch {
      return "Invalid URL format.";
    }
  }
  
  return null;
}

/**
 * Checks if a navigation label would create a duplicate (case-insensitive)
 * Reuses tab duplicate checking logic
 * @param newLabel New label to check
 * @param existingItems List of existing navigation items
 * @param currentItemId Current item ID (to exclude from duplicate check)
 * @returns Boolean indicating if duplicate exists
 */
export function isDuplicateNavLabel(
  newLabel: string,
  existingItems: NavigationItem[],
  currentItemId?: string
): boolean {
  const existingLabels = existingItems.map((item) => item.label);
  const currentLabel = existingItems.find((item) => item.id === currentItemId)?.label;
  return isDuplicateTabName(newLabel, existingLabels, currentLabel);
}

/**
 * Checks if a navigation href would create a duplicate (case-sensitive for URLs)
 * @param newHref New href to check
 * @param existingItems List of existing navigation items
 * @param currentItemId Current item ID (to exclude from duplicate check)
 * @returns Boolean indicating if duplicate exists
 */
export function isDuplicateNavHref(
  newHref: string,
  existingItems: NavigationItem[],
  currentItemId?: string
): boolean {
  const normalizedNewHref = newHref.trim();
  return existingItems
    .filter((item) => item.id !== currentItemId)
    .some((item) => item.href.trim() === normalizedNewHref);
}

/**
 * Generates a unique href from a label, appending numbers if needed
 * Converts label to URL-friendly format and ensures uniqueness
 * @param label The label to generate href from
 * @param existingItems List of existing navigation items to check against
 * @param currentItemId Optional item ID to exclude from duplicate check (for renames)
 * @returns Unique href path (e.g., "About Us" -> "/about-us" or "/about-us-1" if duplicate)
 */
export function generateUniqueHrefFromLabel(
  label: string,
  existingItems: NavigationItem[],
  currentItemId?: string
): string {
  // Exclude current item from duplicate check if provided (for renames)
  const itemsToCheck = currentItemId
    ? existingItems.filter((item) => item.id !== currentItemId)
    : existingItems;
  
  const existingHrefs = itemsToCheck.map((item) => item.href.trim());
  
  // Convert label to URL-friendly slug
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
  
  // Generate base href
  const baseHref = `/${slug}`;
  
  // Check if base href is unique
  if (!existingHrefs.includes(baseHref)) {
    return baseHref;
  }
  
  // Generate unique href by appending numbers
  let uniqueHref = baseHref;
  let iter = 1;
  
  while (existingHrefs.includes(uniqueHref) && iter <= 100) {
    uniqueHref = `/${slug}-${iter++}`;
  }
  
  return iter > 100 ? `/${slug}-${Date.now()}` : uniqueHref;
}

/**
 * Generates a unique navigation label by appending numbers
 * Reuses generic generateUniqueName utility
 * @param baseLabel Base label to make unique
 * @param existingItems List of existing navigation items
 * @param currentItemId Optional item ID to exclude from duplicate check (for renames)
 * @returns Unique label
 */
export function generateUniqueNavLabel(
  baseLabel: string,
  existingItems: NavigationItem[],
  currentItemId?: string
): string {
  // Exclude current item from duplicate check if provided (for renames)
  const itemsToCheck = currentItemId
    ? existingItems.filter((item) => item.id !== currentItemId)
    : existingItems;
  
  const existingLabels = itemsToCheck.map((item) => item.label);
  const uniqueName = generateUniqueName(baseLabel.trim(), existingLabels);
  
  // Fallback if max iterations exceeded
  return uniqueName || `Nav Item ${Date.now()}`;
}

