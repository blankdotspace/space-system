# Space Architecture Overview

Spaces are the core organizational unit in Blankspace, representing customizable hubs that users can personalize with themes, tabs, and fidgets. The system supports both public and private spaces with different data patterns and access controls.

**Related Documentation:**
- [Space Architecture](SPACE_ARCHITECTURE.md) - Detailed architecture and tab management
- [Public Spaces Pattern](PUBLIC_SPACES_PATTERN.md) - Deep dive into public space implementation
- [Configuration System](../CONFIGURATION/ARCHITECTURE_OVERVIEW.md) - How navigation pages are stored as Spaces

## Core Concepts

### Space Types

1. **Public Spaces** - Discoverable, read-only spaces
2. **Private Spaces (Homebase)** - User-owned, editable spaces
3. **System Spaces** - Special spaces like homebase feed

### Space Components

- **Tabs** - Organizational units within spaces
- **Fidgets** - Mini-applications within tabs
- **Themes** - Visual customization
- **Layouts** - Multiple layout support

## Data Patterns

### Public Spaces

Public spaces use a server/client separation pattern:

```typescript
// Public space data omits editable fields
export type DatabaseWritableSpaceConfig = Omit<
  SpaceConfig,
  "fidgetInstanceDatums" | "isEditable"
> & {
  fidgetInstanceDatums: {
    [key: string]: Omit<FidgetInstanceData, "config"> & {
      config: Omit<FidgetConfig, "data">;
    };
  };
};
```

**Key Characteristics:**
- Read-only access
- Server-synchronized
- No local editing
- Public discovery

### Private Spaces (Homebase)

Private spaces use optimistic updates with local/remote state:

```typescript
// Homebase store manages private spaces
export type HomeBaseStore = {
  homebaseConfig: SpaceConfig | null;
  remoteHomebaseConfig: SpaceConfig | null;
  tabs: Record<string, HomebaseTab>;
  // ... other properties
};
```

**Key Characteristics:**
- Full editing capabilities
- Optimistic updates
- Local state management
- Encrypted storage

## Space Lifecycle

### 1. Creation

```typescript
// Create new space
const createSpace = async (spaceData: SpaceData) => {
  // Validate space data
  const validatedSpace = validateSpaceData(spaceData);
  
  // Create in store
  set((draft) => {
    draft.homebase.spaces[validatedSpace.id] = validatedSpace;
  }, "createSpace");
  
  // Sync with server
  await syncSpaceWithServer(validatedSpace);
};
```

### 2. Loading

```typescript
// Load space from server
const loadSpace = async (spaceId: string) => {
  const supabase = createClient();
  const { data: { publicUrl } } = await supabase.storage
    .from("spaces")
    .getPublicUrl(`${spaceId}/tabs/${tabName}`);
  
  const { data } = await axios.get<Blob>(publicUrl, {
    responseType: "blob",
    headers: { "Cache-Control": "no-cache" }
  });
  
  const fileData = JSON.parse(await data.text()) as SignedFile;
  const spaceConfig = JSON.parse(
    await decryptEncryptedSignedFile(fileData)
  ) as DatabaseWritableSpaceConfig;
  
  return spaceConfig;
};
```

### 3. Updates

```typescript
// Update space with optimistic updates
const updateSpace = async (spaceId: string, updates: Partial<SpaceData>) => {
  const originalSpace = get().homebase.spaces[spaceId];
  
  // Apply optimistic update
  set((draft) => {
    draft.homebase.spaces[spaceId] = { ...originalSpace, ...updates };
  }, "updateSpace");
  
  try {
    await syncSpaceWithServer(spaceId, updates);
  } catch (error) {
    // Rollback on error
    set((draft) => {
      draft.homebase.spaces[spaceId] = originalSpace;
    }, "rollbackUpdateSpace");
  }
};
```

## Storage Patterns

### 1. Public Space Storage

```typescript
// Public spaces stored in Supabase storage
const publicSpacePath = `spaces/${spaceId}/tabs/${tabName}`;

// Upload public space
const uploadPublicSpace = async (spaceId: string, tabName: string, config: DatabaseWritableSpaceConfig) => {
  const supabase = createClient();
  const fileData = JSON.stringify(config);
  
  await supabase.storage
    .from("spaces")
    .upload(publicSpacePath, fileData, {
      contentType: "application/json",
      upsert: true
    });
};
```

### 2. Private Space Storage

```typescript
// Private spaces stored encrypted
const privateSpacePath = `private/${identityKey}/homebase`;

// Upload private space
const uploadPrivateSpace = async (config: SpaceConfig) => {
  const supabase = createClient();
  const encryptedData = await encryptSpaceConfig(config);
  
  await supabase.storage
    .from("private")
    .upload(privateSpacePath, encryptedData, {
      contentType: "application/json",
      upsert: true
    });
};
```

## State Management

### 1. Space Store

```typescript
// Space store manages public spaces
export type SpaceStore = {
  spaces: Record<string, Omit<SpaceData, 'isEditable'>>;
  addSpace: (space: Omit<SpaceData, 'isEditable'>) => void;
  updateSpace: (id: string, updates: Partial<Omit<SpaceData, 'isEditable'>>) => void;
  removeSpace: (id: string) => void;
  getSpace: (id: string) => Omit<SpaceData, 'isEditable'> | null;
};
```

### 2. Homebase Store

```typescript
// Homebase store manages private spaces
export type HomeBaseStore = {
  homebaseConfig: SpaceConfig | null;
  remoteHomebaseConfig: SpaceConfig | null;
  tabs: Record<string, HomebaseTab>;
  loadHomebase: () => Promise<SpaceConfig>;
  saveHomebase: (config: SpaceConfig) => Promise<void>;
  // ... other methods
};
```

## Access Control

### 1. Public Space Access

```typescript
// Public spaces are read-only
const canEditSpace = (space: PublicSpaceData): boolean => {
  return false; // Public spaces are never editable
};
```

### 2. Private Space Access

```typescript
// Private spaces are editable by owner
const canEditSpace = (space: PrivateSpaceData): boolean => {
  return space.ownerId === getCurrentUserId();
};
```

## Performance Optimizations

### 1. Lazy Loading

```typescript
// Load space tabs on demand
const loadSpaceTab = async (spaceId: string, tabName: string) => {
  if (get().space.spaces[spaceId]?.tabs[tabName]) {
    return; // Already loaded
  }
  
  const tabConfig = await fetchSpaceTab(spaceId, tabName);
  set((draft) => {
    draft.space.spaces[spaceId].tabs[tabName] = tabConfig;
  }, "loadSpaceTab");
};
```

### 2. Caching

```typescript
// Cache space data
const cacheSpace = (spaceId: string, data: SpaceData) => {
  set((draft) => {
    draft.space.cache[spaceId] = {
      data,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes
    };
  }, "cacheSpace");
};
```

## Error Handling

### 1. Network Errors

```typescript
// Handle network failures
const loadSpaceWithRetry = async (spaceId: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await loadSpace(spaceId);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 2. Data Corruption

```typescript
// Handle corrupted data
const loadSpaceSafely = async (spaceId: string) => {
  try {
    const data = await loadSpace(spaceId);
    return validateSpaceData(data);
  } catch (error) {
    console.error('Failed to load space:', error);
    return getDefaultSpaceConfig();
  }
};
```

## Development Patterns

### 1. Creating Spaces

```typescript
// Create new space
const createNewSpace = async (spaceData: Partial<SpaceData>) => {
  const newSpace: SpaceData = {
    id: generateId(),
    name: spaceData.name || 'New Space',
    tabs: {},
    theme: getDefaultTheme(),
    ...spaceData
  };
  
  await addSpace(newSpace);
  return newSpace;
};
```

### 2. Updating Spaces

```typescript
// Update space with validation
const updateSpaceSafely = async (spaceId: string, updates: Partial<SpaceData>) => {
  const currentSpace = get().homebase.spaces[spaceId];
  if (!currentSpace) throw new Error('Space not found');
  
  const updatedSpace = { ...currentSpace, ...updates };
  const validatedSpace = validateSpaceData(updatedSpace);
  
  await updateSpace(spaceId, validatedSpace);
};
```

## Testing

### 1. Unit Tests

```typescript
// Test space operations
describe('Space Store', () => {
  it('should create space', () => {
    const store = createTestStore();
    const space = createTestSpace();
    
    store.getState().addSpace(space);
    expect(store.getState().spaces[space.id]).toEqual(space);
  });
});
```

### 2. Integration Tests

```typescript
// Test space synchronization
describe('Space Synchronization', () => {
  it('should sync space with server', async () => {
    const space = createTestSpace();
    await syncSpaceWithServer(space);
    
    const serverSpace = await loadSpaceFromServer(space.id);
    expect(serverSpace).toEqual(space);
  });
});
```

## Troubleshooting

### Common Issues

1. **Space Not Loading**: Check network connection and space ID
2. **Update Failures**: Verify space permissions and data validity
3. **Sync Issues**: Check server connectivity and data format
4. **Performance Issues**: Implement lazy loading and caching

### Debug Tools

- Use React DevTools to inspect space state
- Check browser console for space errors
- Verify space data format and permissions
- Test space operations in isolation

## Future Considerations

- Enhanced space discovery
- Advanced permission system
- Space collaboration features
- Performance monitoring
