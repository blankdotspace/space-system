# Component Architecture

Blankspace follows atomic design principles with a modular component architecture that promotes reusability, maintainability, and scalability.

## Atomic Design Structure

### 1. Atoms
Basic building blocks that cannot be broken down further:

```typescript
// Button atom
export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "medium",
  children,
  onClick,
  disabled = false,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  };
  
  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-11 px-8",
    icon: "h-10 w-10",
  };
  
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size])}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
```

### 2. Molecules
Simple combinations of atoms that form functional units:

```typescript
// SearchInput molecule
export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search...",
  value,
  onChange,
  onSearch,
  className,
}) => {
  const [inputValue, setInputValue] = useState(value || "");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(inputValue);
  };
  
  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange?.(e.target.value);
        }}
        className="pr-10"
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        className="absolute right-0 top-0 h-full px-3"
      >
        <SearchIcon className="h-4 w-4" />
      </Button>
    </form>
  );
};
```

### 3. Organisms
Complex components that form distinct sections:

```typescript
// Navigation organism
export const Navigation: React.FC<NavigationProps> = ({
  currentSpace,
  spaces,
  onSpaceChange,
  onThemeToggle,
  theme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Logo className="h-8 w-8" />
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <SpaceSelector
                currentSpace={currentSpace}
                spaces={spaces}
                onSpaceChange={onSpaceChange}
              />
            </div>
          </div>
          <div className="flex items-center">
            <ThemeToggle
              theme={theme}
              onToggle={onThemeToggle}
            />
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
};
```

### 4. Templates
Page-level components that define layout structure:

```typescript
// Space template
export const SpaceTemplate: React.FC<SpaceTemplateProps> = ({
  space,
  theme,
  children,
}) => {
  return (
    <div className="min-h-screen" style={{ background: theme.background }}>
      <Navigation
        currentSpace={space}
        theme={theme}
      />
      <main className="flex-1">
        <SpaceLayout
          space={space}
          theme={theme}
        >
          {children}
        </SpaceLayout>
      </main>
      <Footer theme={theme} />
    </div>
  );
};
```

## Component Patterns

### 1. Compound Components
Components that work together as a cohesive unit:

```typescript
// Tabs compound component
export const Tabs = ({ children, defaultValue, value, onValueChange }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    onValueChange?.(tabValue);
  };
  
  return (
    <TabsContext.Provider value={{ activeTab, onTabChange: handleTabChange }}>
      {children}
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className }) => (
  <div className={cn("flex space-x-1", className)}>
    {children}
  </div>
);

export const TabsTrigger = ({ value, children, className }) => {
  const { activeTab, onTabChange } = useContext(TabsContext);
  
  return (
    <button
      className={cn(
        "px-3 py-2 text-sm font-medium rounded-md transition-colors",
        activeTab === value
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={() => onTabChange(value)}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children, className }) => {
  const { activeTab } = useContext(TabsContext);
  
  if (activeTab !== value) return null;
  
  return (
    <div className={cn("mt-4", className)}>
      {children}
    </div>
  );
};
```

### 2. Render Props
Components that accept functions as children:

```typescript
// DataProvider with render props
export const DataProvider: React.FC<DataProviderProps> = ({
  children,
  data,
  loading,
  error,
}) => {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <DataContext.Provider value={data}>
      {typeof children === 'function' ? children(data) : children}
    </DataContext.Provider>
  );
};

// Usage
<DataProvider data={userData} loading={isLoading} error={error}>
  {(data) => (
    <div>
      <h1>Welcome, {data.name}!</h1>
      <p>Your spaces: {data.spaces.length}</p>
    </div>
  )}
</DataProvider>
```

### 3. Higher-Order Components
Components that enhance other components:

```typescript
// withTheme HOC
export const withTheme = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const theme = useTheme();
    
    return (
      <div style={{ ...theme.styles }}>
        <Component {...props} theme={theme} />
      </div>
    );
  };
};

// Usage
const ThemedButton = withTheme(Button);
```

### 4. Custom Hooks
Reusable logic that can be shared between components:

```typescript
// useLocalStorage hook
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };
  
  return [storedValue, setValue] as const;
};

// Usage
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

## Component Composition

### 1. Composition over Inheritance
```typescript
// Flexible component composition
export const Card = ({ children, className, ...props }) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }) => (
  <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props}>
    {children}
  </h3>
);

// Usage
<Card>
  <CardHeader>
    <CardTitle>Space Settings</CardTitle>
  </CardHeader>
  <CardContent>
    <SpaceSettingsForm />
  </CardContent>
</Card>
```

### 2. Slot-based Composition
```typescript
// Slot-based component
export const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {children}
      </div>
    </div>
  );
};

// Usage with slots
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalHeader>
    <ModalTitle>Confirm Action</ModalTitle>
  </ModalHeader>
  <ModalContent>
    <p>Are you sure you want to delete this space?</p>
  </ModalContent>
  <ModalFooter>
    <Button variant="outline" onClick={onClose}>Cancel</Button>
    <Button variant="destructive" onClick={onConfirm}>Delete</Button>
  </ModalFooter>
</Modal>
```

## State Management Patterns

### 1. Local State
```typescript
// Component with local state
export const Counter = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
    </div>
  );
};
```

### 2. Lifted State
```typescript
// State lifted to parent
export const ParentComponent = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <Counter count={count} onIncrement={() => setCount(count + 1)} />
      <Display count={count} />
    </div>
  );
};
```

### 3. Global State
```typescript
// Global state with Zustand
export const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

// Usage in component
export const Counter = () => {
  const { count, increment } = useCounterStore();
  
  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={increment}>Increment</Button>
    </div>
  );
};
```

## Performance Optimization

### 1. Memoization
```typescript
// Memoized component
export const ExpensiveComponent = React.memo(({ data, onUpdate }) => {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: expensiveCalculation(item)
    }));
  }, [data]);
  
  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} data={item} onUpdate={onUpdate} />
      ))}
    </div>
  );
});
```

### 2. Lazy Loading
```typescript
// Lazy loaded component
const LazyComponent = lazy(() => import('./HeavyComponent'));

export const App = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <LazyComponent />
  </Suspense>
);
```

### 3. Virtual Scrolling
```typescript
// Virtual scrolling for large lists
export const VirtualList = ({ items, itemHeight, containerHeight }) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length
  );
  
  const visibleItems = items.slice(visibleStart, visibleEnd);
  
  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Testing Patterns

### 1. Component Testing
```typescript
// Component test
describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 2. Hook Testing
```typescript
// Hook test
describe('useLocalStorage', () => {
  it('returns initial value when no stored value', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'initial'));
    expect(result.current[0]).toBe('initial');
  });
  
  it('updates stored value', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'initial'));
    act(() => {
      result.current[1]('updated');
    });
    expect(result.current[0]).toBe('updated');
  });
});
```

## Best Practices

### 1. Component Design
- **Single Responsibility** - Each component should have one clear purpose
- **Composition over Inheritance** - Use composition to build complex components
- **Props Interface** - Define clear prop interfaces with TypeScript
- **Default Props** - Provide sensible defaults for optional props

### 2. State Management
- **Local State First** - Use local state when possible
- **Lift State Up** - Move shared state to common parent
- **Global State** - Use global state for truly global data
- **State Normalization** - Keep state normalized and flat

### 3. Performance
- **Memoization** - Use React.memo, useMemo, and useCallback appropriately
- **Lazy Loading** - Load components and data on demand
- **Virtual Scrolling** - Use virtual scrolling for large lists
- **Bundle Splitting** - Split code into smaller chunks

### 4. Testing
- **Unit Tests** - Test individual components in isolation
- **Integration Tests** - Test component interactions
- **Accessibility Tests** - Ensure components are accessible
- **Visual Tests** - Test visual appearance and behavior
