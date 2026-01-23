# Debugging Guide

This guide covers debugging strategies, tools, and techniques for the Blankspace codebase to help developers identify and resolve issues effectively.

## Debugging Philosophy

### 1. Debugging Principles
- **Reproduce First** - Always reproduce the issue before debugging
- **Isolate the Problem** - Narrow down the scope of the issue
- **Use the Right Tools** - Choose appropriate debugging tools for the situation
- **Document Findings** - Keep track of what you discover during debugging

### 2. Debugging Process
1. **Reproduce** - Reproduce the issue consistently
2. **Isolate** - Isolate the problematic code
3. **Analyze** - Analyze the root cause
4. **Fix** - Implement the fix
5. **Verify** - Verify the fix works
6. **Test** - Test to ensure no regressions

## Browser Debugging

### 1. Chrome DevTools
```typescript
// Console debugging
console.log('Debug info:', { user, data, state });
console.table(data); // Display data in table format
console.group('User Actions'); // Group related logs
console.log('Action 1');
console.log('Action 2');
console.groupEnd();

// Performance debugging
console.time('API Call');
await fetchUserData();
console.timeEnd('API Call');

// Memory debugging
console.memory; // Check memory usage
```

### 2. React DevTools
```typescript
// Component debugging
import { useDebugValue } from 'react';

const useUser = (userId: string) => {
  const [user, setUser] = useState(null);
  
  // Debug value for React DevTools
  useDebugValue(user, user => user ? `User: ${user.name}` : 'No user');
  
  return { user, setUser };
};

// Profiler debugging
import { Profiler } from 'react';

const onRenderCallback = (id, phase, actualDuration) => {
  console.log('Component render:', { id, phase, actualDuration });
};

<Profiler id="UserProfile" onRender={onRenderCallback}>
  <UserProfile />
</Profiler>
```

### 3. Network Debugging
```typescript
// API debugging
const fetchUser = async (userId: string) => {
  try {
    console.log('Fetching user:', userId);
    const response = await fetch(`/api/users/${userId}`);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('User data:', data);
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
```

## State Debugging

### 1. Zustand Store Debugging
```typescript
// Store debugging
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useUserStore = create(
  devtools(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,
      
      setUser: (user) => {
        console.log('Setting user:', user);
        set({ user }, false, 'setUser');
      },
      
      setLoading: (loading) => {
        console.log('Setting loading:', loading);
        set({ loading }, false, 'setLoading');
      },
      
      setError: (error) => {
        console.log('Setting error:', error);
        set({ error }, false, 'setError');
      },
    }),
    {
      name: 'user-store', // Unique name for DevTools
    }
  )
);

// Debug store state
const debugStore = () => {
  const state = useUserStore.getState();
  console.log('Current store state:', state);
};
```

### 2. State Change Tracking
```typescript
// Track state changes
const useUserStore = create((set, get) => ({
  user: null,
  setUser: (user) => {
    const prevState = get();
    console.log('Previous state:', prevState);
    
    set({ user });
    
    const newState = get();
    console.log('New state:', newState);
  },
}));

// Subscribe to state changes
const unsubscribe = useUserStore.subscribe(
  (state) => console.log('State changed:', state),
  (state) => state.user // Only log when user changes
);
```

## Component Debugging

### 1. Component Lifecycle Debugging
```typescript
// Component debugging
import { useEffect, useRef } from 'react';

const UserProfile = ({ userId }) => {
  const renderCount = useRef(0);
  renderCount.current++;
  
  console.log(`UserProfile rendered ${renderCount.current} times`);
  
  useEffect(() => {
    console.log('UserProfile mounted');
    return () => console.log('UserProfile unmounted');
  }, []);
  
  useEffect(() => {
    console.log('UserProfile userId changed:', userId);
  }, [userId]);
  
  return <div>User Profile</div>;
};
```

### 2. Props Debugging
```typescript
// Props debugging
const UserProfile = (props) => {
  console.log('UserProfile props:', props);
  
  // Debug specific prop changes
  const prevProps = useRef();
  useEffect(() => {
    if (prevProps.current) {
      const changedProps = Object.keys(props).filter(
        key => prevProps.current[key] !== props[key]
      );
      if (changedProps.length > 0) {
        console.log('Changed props:', changedProps);
      }
    }
    prevProps.current = props;
  });
  
  return <div>User Profile</div>;
};
```

## Error Debugging

### 1. Error Boundaries
```typescript
// Error boundary for debugging
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
    
    // Log to error reporting service
    this.logErrorToService(error, errorInfo);
    
    this.setState({ errorInfo });
  }
  
  logErrorToService = (error, errorInfo) => {
    // Send error to logging service
    console.log('Logging error to service:', { error, errorInfo });
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error && this.state.error.toString()}</pre>
            <pre>{this.state.errorInfo.componentStack}</pre>
          </details>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### 2. Error Handling
```typescript
// Error handling with debugging
const fetchUser = async (userId: string) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Fetch user error:', {
      userId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Re-throw with additional context
    throw new Error(`Failed to fetch user ${userId}: ${error.message}`);
  }
};
```

## Performance Debugging

### 1. Performance Monitoring
```typescript
// Performance monitoring
import { Profiler } from 'react';

const PerformanceProfiler = ({ children, id }) => {
  const onRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    console.log('Performance metrics:', {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    });
    
    // Log slow renders
    if (actualDuration > 100) {
      console.warn(`Slow render detected: ${id} took ${actualDuration}ms`);
    }
  };
  
  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
};
```

### 2. Memory Debugging
```typescript
// Memory debugging
const debugMemory = () => {
  if (performance.memory) {
    console.log('Memory usage:', {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
    });
  }
};

// Monitor memory leaks
const useMemoryMonitor = () => {
  useEffect(() => {
    const interval = setInterval(debugMemory, 5000);
    return () => clearInterval(interval);
  }, []);
};
```

## Network Debugging

### 1. API Debugging
```typescript
// API debugging
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);
```

### 2. WebSocket Debugging
```typescript
// WebSocket debugging
const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState('Connecting');
  
  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('WebSocket connected:', url);
      setConnectionState('Connected');
    };
    
    ws.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionState('Disconnected');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionState('Error');
    };
    
    setSocket(ws);
    
    return () => {
      ws.close();
    };
  }, [url]);
  
  return { socket, connectionState };
};
```

## Mobile Debugging

### 1. Mobile-Specific Debugging
```typescript
// Mobile debugging
const useMobileDebug = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      console.log('Mobile detection:', { isMobile: mobile, width: window.innerWidth });
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return { isMobile };
};
```

### 2. Touch Event Debugging
```typescript
// Touch event debugging
const useTouchDebug = () => {
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      console.log('Touch start:', {
        touches: e.touches.length,
        target: e.target,
        clientX: e.touches[0]?.clientX,
        clientY: e.touches[0]?.clientY
      });
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      console.log('Touch move:', {
        touches: e.touches.length,
        clientX: e.touches[0]?.clientX,
        clientY: e.touches[0]?.clientY
      });
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      console.log('Touch end:', {
        touches: e.touches.length,
        changedTouches: e.changedTouches.length
      });
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
};
```

## Debugging Tools

### 1. Custom Debug Hooks
```typescript
// Custom debug hook
const useDebug = (value: any, label: string) => {
  useEffect(() => {
    console.log(`${label}:`, value);
  }, [value, label]);
};

// Usage
const UserProfile = ({ user }) => {
  useDebug(user, 'User Profile User');
  useDebug(user?.name, 'User Name');
  
  return <div>{user?.name}</div>;
};
```

### 2. Debug Utilities
```typescript
// Debug utilities
export const debug = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DEBUG] ${message}`, data);
    }
  },
  
  error: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[DEBUG] ${message}`, data);
    }
  },
  
  group: (label: string, fn: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(label);
      fn();
      console.groupEnd();
    }
  }
};
```

## Debugging Best Practices

### 1. Debugging Strategy
- **Start Simple** - Begin with basic console.log statements
- **Use Breakpoints** - Set breakpoints in critical code paths
- **Isolate Issues** - Narrow down the problem scope
- **Document Findings** - Keep track of what you discover

### 2. Debugging Tools
- **Browser DevTools** - Use Chrome DevTools for debugging
- **React DevTools** - Use React DevTools for component debugging
- **Network Tab** - Monitor network requests and responses
- **Performance Tab** - Analyze performance bottlenecks

### 3. Debugging Techniques
- **Console Debugging** - Use console.log, console.error, etc.
- **Breakpoint Debugging** - Set breakpoints in code
- **Step-through Debugging** - Step through code line by line
- **Variable Inspection** - Inspect variable values and types

### 4. Debugging Maintenance
- **Remove Debug Code** - Clean up debug code before committing
- **Use Environment Variables** - Control debug output with env vars
- **Document Debug Process** - Keep track of debugging steps
- **Share Debug Findings** - Share debugging insights with team

## Common Debugging Scenarios

### 1. State Issues
```typescript
// Debug state issues
const useUser = (userId: string) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    console.log('User effect triggered:', { userId, user, loading, error });
    
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const userData = await api.getUser(userId);
        console.log('User fetched:', userData);
        setUser(userData);
      } catch (err) {
        console.error('User fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchUser();
    }
  }, [userId]);
  
  return { user, loading, error };
};
```

### 2. Component Issues
```typescript
// Debug component issues
const UserProfile = ({ userId }) => {
  console.log('UserProfile render:', { userId });
  
  const { user, loading, error } = useUser(userId);
  
  console.log('UserProfile state:', { user, loading, error });
  
  if (loading) {
    console.log('UserProfile loading');
    return <div>Loading...</div>;
  }
  
  if (error) {
    console.log('UserProfile error:', error);
    return <div>Error: {error}</div>;
  }
  
  if (!user) {
    console.log('UserProfile no user');
    return <div>No user found</div>;
  }
  
  console.log('UserProfile rendering user:', user);
  return <div>{user.name}</div>;
};
```

### 3. Performance Issues
```typescript
// Debug performance issues
const ExpensiveComponent = ({ data }) => {
  console.log('ExpensiveComponent render:', { dataLength: data?.length });
  
  const processedData = useMemo(() => {
    console.log('Processing data:', data);
    return data.map(item => ({
      ...item,
      processed: expensiveCalculation(item)
    }));
  }, [data]);
  
  console.log('Processed data:', processedData);
  
  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} data={item} />
      ))}
    </div>
  );
};
```
