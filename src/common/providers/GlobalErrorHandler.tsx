"use client";

import { useEffect } from "react";

/**
 * Global error handler that filters out known browser extension errors
 * to reduce console noise in development.
 * 
 * Browser extensions (React DevTools, Redux DevTools, etc.) inject code
 * that can cause errors like "Failed to create PluginFactory" which are
 * harmless but noisy.
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Store original error handler
    const originalError = window.console.error;
    const originalWarn = window.console.warn;

    // List of known browser extension error patterns to filter
    const browserExtensionErrorPatterns = [
      /Failed to create PluginFactory/i,
      /installHook/i,
      /overrideMethod/i,
      /chrome-extension:/i,
      /moz-extension:/i,
      /safari-extension:/i,
      /React DevTools/i,
      /Redux DevTools/i,
    ];

    // Helper to check if error is from browser extension
    const isBrowserExtensionError = (args: any[]): boolean => {
      const errorString = args
        .map((arg) => {
          if (typeof arg === "string") return arg;
          if (arg?.message) return arg.message;
          if (arg?.stack) return arg.stack;
          if (arg?.toString) return arg.toString();
          return String(arg);
        })
        .join(" ");

      return browserExtensionErrorPatterns.some((pattern) =>
        pattern.test(errorString)
      );
    };

    // Override console.error to filter browser extension errors
    window.console.error = (...args: any[]) => {
      // In development, only filter if it's clearly a browser extension error
      // In production, we might want to be more aggressive
      if (process.env.NODE_ENV === "development" && isBrowserExtensionError(args)) {
        // Silently ignore browser extension errors in development
        return;
      }
      // Otherwise, log normally
      originalError.apply(console, args);
    };

    // Override console.warn similarly (some extensions use warn)
    window.console.warn = (...args: any[]) => {
      if (process.env.NODE_ENV === "development" && isBrowserExtensionError(args)) {
        return;
      }
      originalWarn.apply(console, args);
    };

    // Cleanup on unmount
    return () => {
      window.console.error = originalError;
      window.console.warn = originalWarn;
    };
  }, []);

  return null;
}

