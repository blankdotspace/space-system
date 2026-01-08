import { describe, it, expect } from 'vitest';
import axios from 'axios';

/**
 * Tests for error handling utilities
 * These test the error normalization logic extracted from useNavigation
 */

type NavigationError = 
  | { type: 'VALIDATION'; message: string }
  | { type: 'NETWORK'; message: string; retryable: boolean }
  | { type: 'PERMISSION'; message: string }
  | { type: 'UNKNOWN'; message: string; originalError: unknown };

function normalizeNavigationError(error: unknown): NavigationError {
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
      const isRetryable = error.response?.status && error.response.status >= 500;
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

function getUserFriendlyMessage(error: NavigationError): string {
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

describe('Navigation Error Handling', () => {
  describe('normalizeNavigationError', () => {
    it('should normalize validation errors', () => {
      const error = new Error('Invalid label for item');
      const normalized = normalizeNavigationError(error);
      
      expect(normalized.type).toBe('VALIDATION');
      expect(normalized.message).toBe('Invalid label for item');
    });

    it('should normalize duplicate errors', () => {
      const error = new Error('duplicate navigation label found');
      const normalized = normalizeNavigationError(error);
      
      expect(normalized.type).toBe('VALIDATION');
      expect(normalized.message).toBe('duplicate navigation label found');
    });

    it('should normalize permission errors', () => {
      const error = new Error('Identity is not an admin');
      const normalized = normalizeNavigationError(error);
      
      expect(normalized.type).toBe('PERMISSION');
    });

    it('should normalize network errors from axios', () => {
      // Create a proper axios error - axios.isAxiosError checks for the isAxiosError property
      const axiosError = Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: { message: 'Internal server error' } },
          headers: {},
          config: {} as any,
        },
      }) as axios.AxiosError;
      
      // Mock axios.isAxiosError to return true for our test error
      const originalIsAxiosError = axios.isAxiosError;
      (axios as any).isAxiosError = (error: any) => error === axiosError || originalIsAxiosError(error);
      
      try {
        const normalized = normalizeNavigationError(axiosError);
        
        expect(normalized.type).toBe('NETWORK');
        expect(normalized.retryable).toBe(true);
      } finally {
        (axios as any).isAxiosError = originalIsAxiosError;
      }
    });

    it('should normalize non-retryable network errors', () => {
      const axiosError = Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: { message: 'Bad request' } },
          headers: {},
          config: {} as any,
        },
      }) as axios.AxiosError;
      
      const originalIsAxiosError = axios.isAxiosError;
      (axios as any).isAxiosError = (error: any) => error === axiosError || originalIsAxiosError(error);
      
      try {
        const normalized = normalizeNavigationError(axiosError);
        
        expect(normalized.type).toBe('NETWORK');
        expect(normalized.retryable).toBe(false);
      } finally {
        (axios as any).isAxiosError = originalIsAxiosError;
      }
    });

    it('should normalize unknown errors', () => {
      const error = new Error('Some other error');
      const normalized = normalizeNavigationError(error);
      
      expect(normalized.type).toBe('UNKNOWN');
      expect(normalized.originalError).toBe(error);
    });

    it('should handle non-Error objects', () => {
      const error = { some: 'object' };
      const normalized = normalizeNavigationError(error);
      
      expect(normalized.type).toBe('UNKNOWN');
      expect(normalized.message).toBe('An unexpected error occurred');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return validation message as-is', () => {
      const error: NavigationError = {
        type: 'VALIDATION',
        message: 'Invalid label',
      };
      
      expect(getUserFriendlyMessage(error)).toBe('Invalid label');
    });

    it('should return retryable network message', () => {
      const error: NavigationError = {
        type: 'NETWORK',
        message: 'Server error',
        retryable: true,
      };
      
      expect(getUserFriendlyMessage(error)).toBe('Network error. Please try again.');
    });

    it('should return non-retryable network message', () => {
      const error: NavigationError = {
        type: 'NETWORK',
        message: 'Bad request',
        retryable: false,
      };
      
      expect(getUserFriendlyMessage(error)).toBe('Bad request');
    });

    it('should return permission message', () => {
      const error: NavigationError = {
        type: 'PERMISSION',
        message: 'Not an admin',
      };
      
      expect(getUserFriendlyMessage(error)).toBe('You do not have permission to perform this action.');
    });

    it('should return unknown error message', () => {
      const error: NavigationError = {
        type: 'UNKNOWN',
        message: 'Something went wrong',
        originalError: new Error('test'),
      };
      
      expect(getUserFriendlyMessage(error)).toBe('Something went wrong');
    });
  });
});

