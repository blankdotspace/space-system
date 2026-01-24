# Blankspace Architecture Documentation

## Space and Tab Management System

### Overview

Blankspace features two distinct architectural patterns for space management: **Public Spaces** and **Private Spaces** (Homebase). While they share a common presentation layer through the `SpacePage` component, they differ significantly in state management, data flow, and tab handling.

### Core Components

```
┌─────────────────────┐           ┌─────────────────────┐
│   Public Spaces     │           │   Private Spaces    │
│  (Server + Client)  │           │      (Client)       │
└─────────┬───────────┘           └──────────┬──────────┘
          │                                  │
          ▼                                  ▼
┌─────────────────────┐           ┌─────────────────────┐
│    SpacePage        │◄─────────►│   Zustand Store     │
└─────────┬───────────┘           └─────────────────────┘
          │
          ▼
┌─────────────────────┐
│       Space         │
└─────────────────────┘
```

## 1. Public Spaces Architecture

### Design Philosophy

Public spaces follow a server/client separation pattern with clear boundaries for data transmission. They implement a unified `SpacePageData` interface with type-specific extensions.

### Key Components

#### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Page (Server)  │────►│ Type Space (CL) │────►│  PublicSpace    │
│  Loads Data     │     │ Adds isEditable │     │  Renders UI     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **Server Components (`page.tsx`)**
   - Load space data without client-side functions
   - Return `Omit<SpaceData, 'isEditable' | 'spacePageUrl'>`
   - Handle 404 cases and initial data loading

2. **Type-Specific Components (`ProfileSpace.tsx`, etc.)**
   - Add client-side `isEditable` logic based on space type
   - Add `spacePageUrl` function for navigation
   - Pass complete data to `PublicSpace`

3. **Common Component (`PublicSpace.tsx`)**
   - Handles space registration if needed
   - Manages tab rendering and switching
   - Coordinates state with Zustand store for edits

### Tab Management

Public spaces store tabs as a simple string array within the space configuration:

```typescript
interface SpaceConfig {
  // ... other properties
  tabNames?: string[]; // Array of tab names in order
}
```

#### Tab Creation Process
1. Server loads initial tab configuration
2. Client adds new tab to `config.tabNames`
3. Updates are persisted through `saveConfig` and `commitConfig`

#### Tab Navigation
URLs follow predictable patterns based on space type:
- Profile: `/s/username/TabName`
- Token: `/t/network/address/TabName`
- Proposal: `/p/proposalId/TabName`

## 2. Private Spaces (Homebase) Architecture

### Design Philosophy

Private spaces use a client-side Zustand store with optimistic updates and synchronized local/remote state management.

### Key Components

#### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Zustand Store  │◄───►│  PrivateSpace   │────►│    SpacePage    │
│  State Source   │     │  Loads/Updates  │     │    Renders UI   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **Store Structure**
   - `homebaseStore.ts`: Core state and actions
   - `homebaseTabsStore.ts`: Tab-specific logic
   - `currentSpace`: Tracking and navigation

2. **Tab Management**
   - Special handling for Feed tab
   - Complex state synchronization
   - Optimistic UI updates

### Tab Management

Private spaces maintain separate structures for tab configuration and ordering:

```typescript
interface HomeBaseTabStoreState {
  tabs: {
    [tabName: string]: {
      config?: SpaceConfig;      // Local tab configuration
      remoteConfig?: SpaceConfig; // Last known server configuration
    };
  };
  tabOrdering: {
    local: string[];  // Current local order (possibly edited)
    remote: string[]; // Last known server order
  };
}
```

#### Tab Creation Process
1. Create local tab configuration
2. Update local tab ordering
3. Commit both to database separately
4. Manage optimistic updates and rollbacks

#### Tab Navigation
Uses clean URLs with special handling for the Feed tab:
- Feed: `/homebase`
- Other tabs: `/homebase/TabName`

## 3. Storage System

### Public Spaces

1. **Supabase Tables**:
   - `spaceRegistrations`: Maps `spaceId` to owner information
   - Stores type-specific metadata (fid, contract address, etc.)

2. **Supabase Storage**:
   - Path format: `spaces/${spaceId}/tabs/${tabName}`
   - Tab order: `spaces/${spaceId}/tabOrder`
   - JSON files with configuration data

3. **API Routes**:
   - `/api/space/registry`: Space registration
   - `/api/space/registry/${spaceId}/tabs`: Tab management

### Private Spaces

1. **Supabase Storage**:
   - Path format: `private/${identityPublicKey}/tabs/${tabName}`
   - Tab order: `private/${identityPublicKey}/tabOrder`
   - Feed configuration: `private/${identityPublicKey}/homebase`
   - Encrypted for privacy

2. **API Routes**:
   - `/api/space/homebase`: Feed configuration
   - `/api/space/homebase/tabs`: Tab management

## 4. Architectural Differences

| Feature | Public Spaces | Private Spaces |
|---------|--------------|----------------|
| **State Management** | Server + Client | Client-only Zustand |
| **Tab Storage** | Single `tabNames` array | Separate `tabOrdering` object |
| **Default Tab** | Type-specific (`"Profile"`, `"Token"`, etc.) | Always `"Feed"` |
| **Data Flow** | Unidirectional | Bidirectional with store |
| **Type System** | Strong interface inheritance | Loosely coupled store slices |
| **Initialization** | Server-side data loading | Client-side data fetching |
| **Editability** | Type-specific rules | Always editable by owner |
| **URL Structure** | Type-specific patterns | Homebase-specific pattern |

## 5. Common Infrastructure

Both architectures share common components:

1. **SpacePage**: Renders spaces with consistent UI
2. **TabBar**: Renders and manages tab interactions
3. **Space**: Core layout and fidget rendering
4. **Authentication**: Common authentication system

## 6. Development Guidelines

### Working with Public Spaces

1. **Add a New Public Space Type**:
   ```
   src/app/(spaces)/{type}/[param]/
   ├── page.tsx          # Server-side data loading
   ├── utils.ts          # Helper functions
   ├── {Type}Space.tsx   # Client-side component
   └── layout.tsx        # Layout component
   ```

2. **Extending Space Data**:
   ```typescript
   interface NewTypeSpaceData extends SpacePageData {
     spaceType: typeof SPACE_TYPES.NEW_TYPE;
     defaultTab: 'DefaultTabName';
     // Type-specific properties
   }
   ```

### Working with Private Spaces

1. **Modify Tab Behavior**:
   - Edit `homebaseTabsStore.ts` for tab management logic
   - Update `PrivateSpace.tsx` for tab rendering

2. **Add New Tab Actions**:
   - Add action to store
   - Update UI components to trigger action
   - Handle optimistic updates and error states

## 7. Future Architectural Considerations

For future development, consider:

1. **Unified Space Data Model**:
   - Create a `HomebaseSpaceData` interface extending `SpacePageData`
   - Adapt PrivateSpace to construct this model from store

2. **Common Tab Management**:
   - Move tab ordering to a consistent location across space types
   - Simplify TabBar to work with a unified tab interface

3. **Improved Type Safety**:
   - Add stronger typing to Zustand store slices
   - Create type guards for private spaces similar to public spaces

This architecture provides flexibility for different space types while maintaining consistent user experience through shared rendering components.
