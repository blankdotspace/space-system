# State Management Architecture

Blankspace uses a sophisticated Zustand-based state management system with store composition, persistence, and optimistic updates.

## Architecture Overview

The state management system is built on several key principles:

- **Store Composition** - Multiple specialized stores combined into a single app store
- **Persistence** - Selective persistence with merge strategies
- **Optimistic Updates** - Immediate UI updates with server synchronization
- **Type Safety** - Full TypeScript support with strict typing

## Core Store Architecture

### 1. Store Composition

The main app store combines multiple specialized stores:

```typescript
export type AppStore = {
  account: AccountStore;        // Authentication & identity
  setup: SetupStore;           // Onboarding flow
  homebase: HomeBaseStore;     // Private spaces
  space: SpaceStore;           // Public spaces
  currentSpace: CurrentSpaceStore; // Current space context
  checkpoints: CheckpointStore; // State snapshots
  chat: ChatStore;             // Chat functionality
  logout: () => void;
  getIsAccountReady: () => boolean;
  getIsInitializing: () => boolean;
  clearLocalSpaces: () => void;
};
```

### 2. Store Creation System

The `createStore` utility provides a standardized way to create stores:

```typescript
export function createStore<T>(
  store: any,
  persistArgs: PersistOptions<any, any>,
) {
  return create<T>()(devtools(persist(mutative(store), persistArgs)));
}
```

**Key Features:**
- **Mutative Integration** - Immutable updates with performance
- **DevTools Support** - Redux DevTools integration
- **Persistence** - Configurable persistence strategies
- **Type Safety** - Full TypeScript support

### 3. Store Bindings

The `createStoreBindings` system provides React context integration:

```typescript
export function createStoreBindings<T = unknown>(
  storeName: string,
  createStoreFunc: () => StoreApi<T>,
) {
  const storeContext = createContext<StoreApi<T> | null>(null);
  
  const provider: React.FC<StoreProviderProps> = ({ children }) => {
    const storeRef = useRef<StoreApi<T>>();
    if (!storeRef.current) {
      storeRef.current = createStoreFunc();
    }
    return React.createElement(storeContext.Provider, { value: storeRef.current }, children);
  };
  
  function useTStore<S>(fn: (state: T) => S): S {
    const context = useContext(storeContext);
    if (!context) {
      throw new Error(`use${storeName} must be use within ${storeName}Provider`);
    }
    return useStore(context, fn);
  }
  
  return { provider, context: storeContext, useStore: useTStore };
}
```

## Store Types

### 1. Account Store

Manages authentication and identity:

```typescript
export type AccountStore = IdentityStore &
  AuthenticatorStore &
  PreKeyStore &
  FarcasterStore &
  PrivyStore & {
    reset: () => void;
    hasNogs: boolean;
    setHasNogs: (v: boolean) => void;
  };
```

**Features:**
- Multi-identity support
- Authenticator management
- Farcaster integration
- Cryptographic key management

### 2. Homebase Store

Manages private spaces:

```typescript
export type HomeBaseStore = {
  spaces: Record<string, SpaceData>;
  addSpace: (space: SpaceData) => void;
  updateSpace: (id: string, updates: Partial<SpaceData>) => void;
  removeSpace: (id: string) => void;
  getSpace: (id: string) => SpaceData | null;
  getAllSpaces: () => SpaceData[];
};
```

**Features:**
- Local space management
- Optimistic updates
- Persistence
- Space synchronization

### 3. Space Store

Manages public spaces:

```typescript
export type SpaceStore = {
  spaces: Record<string, Omit<SpaceData, 'isEditable'>>;
  addSpace: (space: Omit<SpaceData, 'isEditable'>) => void;
  updateSpace: (id: string, updates: Partial<Omit<SpaceData, 'isEditable'>>) => void;
  removeSpace: (id: string) => void;
  getSpace: (id: string) => Omit<SpaceData, 'isEditable'> | null;
};
```

**Features:**
- Public space management
- Server synchronization
- Read-only operations
- Space discovery

### 4. Current Space Store

Manages current space context:

```typescript
export type CurrentSpaceStore = {
  currentSpaceId: string | null;
  currentTabName: string | null;
  setCurrentSpace: (spaceId: string | null) => void;
  setCurrentTab: (tabName: string | null) => void;
  getCurrentSpace: () => SpaceData | null;
  getCurrentTab: () => TabData | null;
};
```

**Features:**
- Current space tracking
- Tab management
- Context switching
- State synchronization

## Persistence Strategy

### 1. Selective Persistence

Only specific parts of the store are persisted:

```typescript
partialize: (state: AppStore) => ({
  account: partializedAccountStore(state),
  homebase: partializedHomebaseStore(state),
  space: partializedSpaceStore(state),
  checkpoints: partializedCheckpointStore(state),
  chat: partializedChatStore(state),
}),
```

### 2. Merge Strategy

Persisted state is merged with current state:

```typescript
merge: (persistedState, currentState: AppStore) => {
  return merge(currentState, persistedState);
},
```

### 3. Storage Configuration

```typescript
const LOCAL_STORAGE_LOCATION = "nounspace-app-store";

export function createAppStore() {
  return createStore<AppStore>(makeStoreFunc, {
    name: LOCAL_STORAGE_LOCATION,
    storage: createJSONStorage(() => localStorage),
    // ... persistence configuration
  });
}
```

## Optimistic Updates

### 1. Immediate UI Updates

Stores support optimistic updates for better UX:

```typescript
// Example: Adding a space optimistically
const addSpace = (space: SpaceData) => {
  set((draft) => {
    draft.homebase.spaces[space.id] = space;
  }, "addSpace");
  
  // Sync with server in background
  syncSpaceWithServer(space);
};
```

### 2. Error Handling

Failed optimistic updates are rolled back:

```typescript
const updateSpace = async (id: string, updates: Partial<SpaceData>) => {
  const originalSpace = get().homebase.spaces[id];
  
  // Apply optimistic update
  set((draft) => {
    draft.homebase.spaces[id] = { ...originalSpace, ...updates };
  }, "updateSpace");
  
  try {
    await syncSpaceWithServer(id, updates);
  } catch (error) {
    // Rollback on error
    set((draft) => {
      draft.homebase.spaces[id] = originalSpace;
    }, "rollbackUpdateSpace");
  }
};
```

## Development Patterns

### 1. Creating New Stores

```typescript
// Define store type
export type MyStore = {
  data: MyData[];
  addData: (item: MyData) => void;
  updateData: (id: string, updates: Partial<MyData>) => void;
  removeData: (id: string) => void;
};

// Create store function
export const createMyStoreFunc: MatativeConfig<MyStore> = (set, get) => ({
  data: [],
  addData: (item) => {
    set((draft) => {
      draft.data.push(item);
    }, "addData");
  },
  updateData: (id, updates) => {
    set((draft) => {
      const index = draft.data.findIndex(item => item.id === id);
      if (index !== -1) {
        Object.assign(draft.data[index], updates);
      }
    }, "updateData");
  },
  removeData: (id) => {
    set((draft) => {
      draft.data = draft.data.filter(item => item.id !== id);
    }, "removeData");
  },
});
```

### 2. Using Stores in Components

```typescript
// Use app store
const { homebase, addSpace } = useAppStore((state) => ({
  homebase: state.homebase,
  addSpace: state.homebase.addSpace,
}));

// Use specific store
const { spaces } = useHomebaseStore((state) => ({
  spaces: state.spaces,
}));
```

### 3. Store Composition

```typescript
// Combine multiple stores
export const createCombinedStoreFunc: MatativeConfig<CombinedStore> = (set, get) => ({
  ...createStoreAFunc(set, get),
  ...createStoreBFunc(set, get),
  // Combined actions
  resetAll: () => {
    get().storeA.reset();
    get().storeB.reset();
  },
});
```

## Performance Considerations

### 1. Selective Subscriptions

```typescript
// Good: Subscribe to specific state
const spaces = useAppStore((state) => state.homebase.spaces);

// Avoid: Subscribe to entire store
const store = useAppStore();
```

### 2. Memoization

```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(store.data);
}, [store.data]);
```

### 3. Store Splitting

```typescript
// Split large stores into smaller ones
export type LargeStore = {
  sectionA: SectionAStore;
  sectionB: SectionBStore;
  sectionC: SectionCStore;
};
```

## Testing

### 1. Store Testing

```typescript
// Test store actions
const store = createTestStore();
store.getState().addData(testData);
expect(store.getState().data).toContain(testData);
```

### 2. Integration Testing

```typescript
// Test store interactions
const appStore = createAppStore();
appStore.getState().homebase.addSpace(space);
appStore.getState().currentSpace.setCurrentSpace(space.id);
```

## Troubleshooting

### Common Issues

1. **Store Not Updating**: Check if component is subscribed to store
2. **Persistence Issues**: Verify partialize function includes required state
3. **Type Errors**: Ensure store types match implementation
4. **Performance Issues**: Check for unnecessary re-renders

### Debug Tools

- Use Redux DevTools to inspect store state
- Check browser console for store errors
- Verify store subscriptions in React DevTools
- Test store actions in isolation

## Future Considerations

- Enhanced persistence strategies
- Advanced optimistic update patterns
- Store middleware system
- Performance monitoring
