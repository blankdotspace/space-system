import axios from "axios";

/**
 * Normalized error type for navigation operations
 */
export type NavigationError = 
  | { type: 'VALIDATION'; message: string }
  | { type: 'NETWORK'; message: string; retryable: boolean }
  | { type: 'PERMISSION'; message: string }
  | { type: 'UNKNOWN'; message: string; originalError: unknown };

/**
 * Normalizes various error types into a consistent NavigationError format
 * 
 * @param error - The error to normalize (can be Error, AxiosError, or any unknown type)
 * @returns A normalized NavigationError with consistent structure
 */
export function normalizeNavigationError(error: unknown): NavigationError {
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
      const isRetryable = error.response?.status !== undefined && error.response.status >= 500;
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
 * 
 * @param error - The normalized navigation error
 * @returns A user-friendly message string suitable for display in the UI
 */
export function getUserFriendlyMessage(error: NavigationError): string {
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
