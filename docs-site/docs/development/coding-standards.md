# Coding Standards

This document outlines the coding standards and best practices for the Nounspace codebase to ensure consistency, maintainability, and code quality.

## TypeScript Standards

### 1. Type Safety
- **Strict TypeScript** - Use strict mode with all type checking enabled
- **Explicit Types** - Define types for all function parameters and return values
- **Interface Definitions** - Use interfaces for object shapes and component props
- **Generic Types** - Use generics for reusable type-safe code

```typescript
// Good: Explicit types
interface UserProps {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

const User: React.FC<UserProps> = ({ id, name, email, isActive }) => {
  return (
    <div>
      <h2>{name}</h2>
      <p>{email}</p>
      <span>{isActive ? 'Active' : 'Inactive'}</span>
    </div>
  );
};

// Good: Generic types
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

const fetchUser = async (id: string): Promise<ApiResponse<UserProps>> => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};
```

### 2. Type Definitions
- **Centralized Types** - Define types in dedicated files
- **Reusable Types** - Create shared types for common patterns
- **Type Guards** - Use type guards for runtime type checking
- **Discriminated Unions** - Use discriminated unions for complex state

```typescript
// types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type UserRole = 'admin' | 'user' | 'guest';

export interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Type guard
export const isUser = (value: any): value is User => {
  return value && typeof value.id === 'string' && typeof value.name === 'string';
};
```

## React Standards

### 1. Component Structure
- **Functional Components** - Use functional components with hooks
- **Component Props** - Define clear prop interfaces
- **Default Props** - Use default parameters instead of defaultProps
- **Component Composition** - Prefer composition over inheritance

```typescript
// Good: Functional component with clear props
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### 2. Hooks Usage
- **Custom Hooks** - Extract reusable logic into custom hooks
- **Hook Dependencies** - Always include all dependencies in useEffect
- **Hook Rules** - Follow the rules of hooks consistently
- **Hook Optimization** - Use useMemo and useCallback appropriately

```typescript
// Good: Custom hook with proper dependencies
export const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const userData = await api.getUser(userId);
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]); // Include all dependencies

  return { user, loading, error };
};
```

### 3. State Management
- **Local State** - Use useState for component-local state
- **Global State** - Use Zustand for global state management
- **State Updates** - Use functional updates for state that depends on previous state
- **State Normalization** - Keep state normalized and flat

```typescript
// Good: Functional state updates
const [count, setCount] = useState(0);

const increment = () => {
  setCount(prevCount => prevCount + 1);
};

// Good: Normalized state
interface AppState {
  users: Record<string, User>;
  spaces: Record<string, Space>;
  currentUserId: string | null;
}
```

## Code Organization

### 1. File Structure
- **Atomic Design** - Organize components by atomic design principles
- **Feature-based** - Group related functionality together
- **Barrel Exports** - Use index files for clean imports
- **Co-location** - Keep related files close together

```
src/
├── components/
│   ├── atoms/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── molecules/
│   └── organisms/
├── hooks/
├── utils/
├── types/
└── constants/
```

### 2. Import/Export Standards
- **Named Exports** - Use named exports for better tree shaking
- **Barrel Exports** - Use index files for clean imports
- **Import Order** - Organize imports in a consistent order
- **Absolute Imports** - Use absolute imports for better refactoring

```typescript
// Good: Import order
// 1. React and external libraries
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@mui/material';

// 2. Internal imports (absolute paths)
import { useUser } from '@/hooks/useUser';
import { User } from '@/types/user';
import { api } from '@/utils/api';

// 3. Relative imports
import './Button.css';
```

### 3. Naming Conventions
- **PascalCase** - Use PascalCase for components and types
- **camelCase** - Use camelCase for variables and functions
- **kebab-case** - Use kebab-case for file names
- **Descriptive Names** - Use descriptive names that explain intent

```typescript
// Good: Naming conventions
// Components
export const UserProfile: React.FC<UserProfileProps> = () => {};

// Hooks
export const useUserProfile = () => {};

// Types
interface UserProfileProps {
  userId: string;
  showAvatar?: boolean;
}

// Files: user-profile.tsx, use-user-profile.ts
```

## Error Handling

### 1. Error Boundaries
- **Error Boundaries** - Use error boundaries to catch component errors
- **Fallback UI** - Provide meaningful fallback UI for errors
- **Error Logging** - Log errors for debugging and monitoring
- **User-friendly Messages** - Show user-friendly error messages

```typescript
// Error boundary
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>Please refresh the page or try again later.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 2. Async Error Handling
- **Try-Catch** - Use try-catch for async operations
- **Error States** - Handle error states in components
- **Retry Logic** - Implement retry logic for failed operations
- **Loading States** - Show loading states during async operations

```typescript
// Good: Async error handling
export const useAsyncOperation = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (operation: () => Promise<any>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
};
```

## Performance Standards

### 1. Optimization Techniques
- **Memoization** - Use React.memo, useMemo, and useCallback appropriately
- **Lazy Loading** - Implement lazy loading for heavy components
- **Code Splitting** - Split code into smaller chunks
- **Bundle Analysis** - Regularly analyze bundle size

```typescript
// Good: Memoization
export const ExpensiveComponent = React.memo<ExpensiveComponentProps>(({
  data,
  onUpdate,
}) => {
  const processedData = useMemo(() => {
    return data.map(item => processItem(item));
  }, [data]);

  const handleUpdate = useCallback((id: string, updates: any) => {
    onUpdate(id, updates);
  }, [onUpdate]);

  return (
    <div>
      {processedData.map(item => (
        <Item
          key={item.id}
          data={item}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
});
```

### 2. Bundle Optimization
- **Tree Shaking** - Use named exports for better tree shaking
- **Dynamic Imports** - Use dynamic imports for code splitting
- **Bundle Analysis** - Use tools like webpack-bundle-analyzer
- **Dependency Management** - Keep dependencies up to date

```typescript
// Good: Dynamic imports
const LazyComponent = lazy(() => import('./HeavyComponent'));

export const App = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <LazyComponent />
  </Suspense>
);
```

## Testing Standards

### 1. Test Structure
- **AAA Pattern** - Arrange, Act, Assert pattern for tests
- **Test Isolation** - Each test should be independent
- **Descriptive Names** - Use descriptive test names
- **Test Coverage** - Aim for high test coverage

```typescript
// Good: Test structure
describe('UserProfile', () => {
  it('should display user information when user is loaded', () => {
    // Arrange
    const mockUser: User = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user'
    };
    
    // Act
    render(<UserProfile user={mockUser} />);
    
    // Assert
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

### 2. Test Types
- **Unit Tests** - Test individual components and functions
- **Integration Tests** - Test component interactions
- **E2E Tests** - Test complete user workflows
- **Accessibility Tests** - Test accessibility compliance

```typescript
// Good: Integration test
describe('User Management', () => {
  it('should allow user to update profile', async () => {
    render(
      <UserProvider>
        <UserProfile />
      </UserProvider>
    );
    
    const nameInput = screen.getByLabelText('Name');
    const saveButton = screen.getByText('Save');
    
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Profile updated')).toBeInTheDocument();
    });
  });
});
```

## Documentation Standards

### 1. Code Comments
- **JSDoc Comments** - Use JSDoc for function documentation
- **Inline Comments** - Use inline comments for complex logic
- **TODO Comments** - Use TODO comments for future improvements
- **Deprecation Comments** - Mark deprecated code clearly

```typescript
/**
 * Fetches user data from the API
 * @param userId - The unique identifier for the user
 * @param options - Optional configuration for the request
 * @returns Promise that resolves to user data
 * @throws {Error} When the user is not found or API request fails
 */
export const fetchUser = async (
  userId: string,
  options?: FetchOptions
): Promise<User> => {
  // TODO: Add caching mechanism
  try {
    const response = await api.get(`/users/${userId}`, options);
    return response.data;
  } catch (error) {
    // Log error for debugging
    console.error('Failed to fetch user:', error);
    throw new Error('User not found');
  }
};
```

### 2. README Files
- **Component README** - Document complex components
- **API Documentation** - Document API endpoints and usage
- **Setup Instructions** - Provide clear setup instructions
- **Examples** - Include usage examples

```markdown
# UserProfile Component

A component for displaying and editing user profile information.

## Usage

```typescript
import { UserProfile } from '@/components/UserProfile';

<UserProfile
  user={user}
  onUpdate={handleUpdate}
  showAvatar={true}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| user | User | - | User data to display |
| onUpdate | (user: User) => void | - | Callback when user is updated |
| showAvatar | boolean | true | Whether to show user avatar |

## Examples

See the examples directory for more usage examples.
```

## Security Standards

### 1. Input Validation
- **Sanitization** - Sanitize all user inputs
- **Validation** - Validate data on both client and server
- **Type Safety** - Use TypeScript for compile-time type checking
- **Error Handling** - Handle validation errors gracefully

```typescript
// Good: Input validation
export const validateUserInput = (input: any): UserInput => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().min(0).max(120),
  });
  
  return schema.parse(input);
};
```

### 2. Security Best Practices
- **HTTPS Only** - Use HTTPS for all communications
- **Input Sanitization** - Sanitize all user inputs
- **XSS Prevention** - Prevent cross-site scripting attacks
- **CSRF Protection** - Implement CSRF protection

```typescript
// Good: XSS prevention
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
  });
};
```

## Accessibility Standards

### 1. ARIA Attributes
- **Semantic HTML** - Use semantic HTML elements
- **ARIA Labels** - Provide ARIA labels for screen readers
- **Keyboard Navigation** - Ensure keyboard accessibility
- **Focus Management** - Manage focus appropriately

```typescript
// Good: Accessibility
export const AccessibleButton: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled,
  ariaLabel,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </button>
  );
};
```

### 2. Testing Accessibility
- **Screen Reader Testing** - Test with screen readers
- **Keyboard Testing** - Test keyboard navigation
- **Color Contrast** - Ensure proper color contrast
- **Focus Indicators** - Provide clear focus indicators

```typescript
// Good: Accessibility testing
describe('Accessibility', () => {
  it('should be accessible to screen readers', () => {
    render(<UserProfile user={mockUser} />);
    
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByLabelText('User name')).toBeInTheDocument();
  });
  
  it('should support keyboard navigation', () => {
    render(<UserProfile user={mockUser} />);
    
    const nameInput = screen.getByLabelText('User name');
    nameInput.focus();
    expect(nameInput).toHaveFocus();
  });
});
```

## Code Review Standards

### 1. Review Checklist
- **Functionality** - Does the code work as intended?
- **Performance** - Are there any performance issues?
- **Security** - Are there any security vulnerabilities?
- **Accessibility** - Is the code accessible?
- **Testing** - Are there adequate tests?
- **Documentation** - Is the code well documented?

### 2. Review Process
- **Self Review** - Review your own code before submitting
- **Peer Review** - Get at least one peer review
- **Automated Checks** - Ensure all automated checks pass
- **Documentation** - Update documentation as needed

## Continuous Improvement

### 1. Code Quality Metrics
- **Test Coverage** - Maintain high test coverage
- **Code Complexity** - Keep code complexity low
- **Performance Metrics** - Monitor performance metrics
- **Security Scans** - Regular security scans

### 2. Learning and Development
- **Code Reviews** - Learn from code reviews
- **Best Practices** - Stay updated with best practices
- **Tools and Techniques** - Learn new tools and techniques
- **Community** - Participate in the development community
