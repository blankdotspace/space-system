# Testing Guide

This guide covers testing strategies, patterns, and best practices for the Blankspace codebase to ensure code quality and reliability.

## Testing Philosophy

### 1. Testing Pyramid
- **Unit Tests** - Test individual components and functions in isolation
- **Integration Tests** - Test component interactions and data flow
- **E2E Tests** - Test complete user workflows and scenarios
- **Visual Tests** - Test visual appearance and behavior

### 2. Testing Principles
- **Test Behavior** - Test what the code does, not how it does it
- **Test Isolation** - Each test should be independent and isolated
- **Test Clarity** - Tests should be clear and easy to understand
- **Test Coverage** - Aim for high test coverage with meaningful tests

## Testing Setup

### 1. Testing Framework
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 2. Test Setup
```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock global objects
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

## Unit Testing

### 1. Component Testing
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies correct variant classes', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });
});
```

### 2. Hook Testing
```typescript
// useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '@/hooks/useCounter';

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('should initialize with custom value', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current.count).toBe(5);
  });

  it('should increment count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });

  it('should decrement count', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.decrement();
    });
    
    expect(result.current.count).toBe(4);
  });

  it('should reset count', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.count).toBe(0);
  });
});
```

### 3. Utility Function Testing
```typescript
// utils.test.ts
import { formatDate, validateEmail, debounce } from '@/utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2023-12-25');
    expect(formatDate(date)).toBe('Dec 25, 2023');
  });

  it('should handle invalid date', () => {
    expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
  });
});

describe('validateEmail', () => {
  it('should validate correct email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});

describe('debounce', () => {
  it('should debounce function calls', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);
    
    debouncedFn();
    debouncedFn();
    debouncedFn();
    
    expect(mockFn).not.toHaveBeenCalled();
    
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
```

## Integration Testing

### 1. Component Integration
```typescript
// UserProfile.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProfile } from '@/components/UserProfile';
import { UserProvider } from '@/contexts/UserContext';

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user'
};

describe('UserProfile Integration', () => {
  it('should display user information', () => {
    render(
      <UserProvider value={mockUser}>
        <UserProfile />
      </UserProvider>
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should allow editing user information', async () => {
    const mockUpdate = vi.fn();
    
    render(
      <UserProvider value={mockUser}>
        <UserProfile onUpdate={mockUpdate} />
      </UserProvider>
    );
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        ...mockUser,
        name: 'Jane Doe'
      });
    });
  });
});
```

### 2. Store Integration
```typescript
// userStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { create } from 'zustand';
import { userStore } from '@/stores/userStore';

describe('UserStore Integration', () => {
  it('should manage user state', () => {
    const { result } = renderHook(() => userStore());
    
    act(() => {
      result.current.setUser(mockUser);
    });
    
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle user logout', () => {
    const { result } = renderHook(() => userStore());
    
    act(() => {
      result.current.setUser(mockUser);
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    
    act(() => {
      result.current.logout();
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

## End-to-End Testing

### 1. E2E Test Setup
```typescript
// e2e/user-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Authentication Flow', () => {
  test('should allow user to login and access dashboard', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Submit form
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
    
    // Verify dashboard content
    expect(await page.textContent('[data-testid="welcome-message"]')).toContain('Welcome');
  });
});
```

### 2. E2E Test Scenarios
```typescript
// e2e/space-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Space Creation Flow', () => {
  test('should create a new space', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to spaces
    await page.goto('/spaces');
    
    // Click create space button
    await page.click('[data-testid="create-space-button"]');
    
    // Fill space form
    await page.fill('[data-testid="space-name-input"]', 'My New Space');
    await page.fill('[data-testid="space-description-input"]', 'A test space');
    
    // Submit form
    await page.click('[data-testid="create-space-submit"]');
    
    // Verify space was created
    await page.waitForSelector('[data-testid="space-card"]');
    expect(await page.textContent('[data-testid="space-name"]')).toBe('My New Space');
  });
});
```

## Visual Testing

### 1. Visual Regression Testing
```typescript
// visual/button.visual.test.ts
import { test, expect } from '@playwright/test';

test.describe('Button Visual Tests', () => {
  test('should render primary button correctly', async ({ page }) => {
    await page.goto('/components/button');
    
    const button = page.locator('[data-testid="primary-button"]');
    await expect(button).toHaveScreenshot('primary-button.png');
  });

  test('should render secondary button correctly', async ({ page }) => {
    await page.goto('/components/button');
    
    const button = page.locator('[data-testid="secondary-button"]');
    await expect(button).toHaveScreenshot('secondary-button.png');
  });
});
```

### 2. Responsive Testing
```typescript
// visual/responsive.visual.test.ts
import { test, expect } from '@playwright/test';

test.describe('Responsive Design Tests', () => {
  test('should render correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png');
  });

  test('should render correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    
    await expect(page).toHaveScreenshot('dashboard-tablet.png');
  });

  test('should render correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    
    await expect(page).toHaveScreenshot('dashboard-desktop.png');
  });
});
```

## Accessibility Testing

### 1. Accessibility Test Setup
```typescript
// a11y/accessibility.test.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should not have accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test arrow key navigation
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
  });
});
```

### 2. Screen Reader Testing
```typescript
// a11y/screen-reader.test.ts
import { test, expect } from '@playwright/test';

test.describe('Screen Reader Tests', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for ARIA labels
    const elementsWithAriaLabels = page.locator('[aria-label]');
    await expect(elementsWithAriaLabels).toHaveCount(5);
    
    // Check for ARIA roles
    const elementsWithRoles = page.locator('[role]');
    await expect(elementsWithRoles).toHaveCount(3);
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check heading hierarchy
    const h1 = page.locator('h1');
    const h2 = page.locator('h2');
    const h3 = page.locator('h3');
    
    await expect(h1).toHaveCount(1);
    await expect(h2).toHaveCount(2);
    await expect(h3).toHaveCount(3);
  });
});
```

## Performance Testing

### 1. Performance Metrics
```typescript
// performance/performance.test.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // 3 seconds
  });

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/dashboard');
    
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'cumulative-layout-shift'] });
      });
    });
    
    expect(metrics).toBeDefined();
  });
});
```

### 2. Bundle Size Testing
```typescript
// performance/bundle-size.test.ts
import { test, expect } from '@playwright/test';

test.describe('Bundle Size Tests', () => {
  test('should have acceptable bundle size', async ({ page }) => {
    await page.goto('/dashboard');
    
    const bundleSize = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('.js'))
        .reduce((total, entry) => total + entry.transferSize, 0);
    });
    
    expect(bundleSize).toBeLessThan(500000); // 500KB
  });
});
```

## Test Data Management

### 1. Test Fixtures
```typescript
// fixtures/user.fixtures.ts
export const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
};

export const mockUsers = [
  mockUser,
  {
    id: '2',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'admin',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z'
  }
];
```

### 2. Test Utilities
```typescript
// utils/test-utils.ts
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { UserProvider } from '@/contexts/UserContext';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

## Test Automation

### 1. CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Run accessibility tests
      run: npm run test:a11y
```

### 2. Test Reporting
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    },
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml'
    }
  }
});
```

## Best Practices

### 1. Test Organization
- **Group related tests** in describe blocks
- **Use descriptive test names** that explain what is being tested
- **Keep tests focused** on a single behavior
- **Use consistent naming** conventions

### 2. Test Maintenance
- **Update tests** when code changes
- **Remove obsolete tests** that are no longer relevant
- **Refactor tests** to keep them maintainable
- **Monitor test performance** and optimize slow tests

### 3. Test Quality
- **Write meaningful tests** that catch real bugs
- **Avoid testing implementation details** focus on behavior
- **Use appropriate test types** for different scenarios
- **Maintain good test coverage** without sacrificing quality

### 4. Debugging Tests
- **Use debugging tools** like browser DevTools for E2E tests
- **Add logging** to understand test failures
- **Use test utilities** to simplify test setup
- **Document test scenarios** for complex tests
