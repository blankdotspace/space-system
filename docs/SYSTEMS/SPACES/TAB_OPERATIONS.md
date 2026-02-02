# Tab Operations

This document explains how tab operations work in Blankspace, including the staged/batch pattern that ensures data consistency.

## Overview

Tabs are the pages within a space. Each space can have multiple tabs, and users can:
- Create new tabs
- Delete existing tabs
- Rename tabs
- Reorder tabs

All tab operations follow a **staged pattern** where changes are held locally until explicitly saved.

## The Staged Pattern

### Why Staged Changes?

Tab operations use a staged/batch pattern rather than immediate persistence for several important reasons:

1. **Navigation Spaces**: Navigation page spaces don't exist in the database until the navigation editor saves. Immediate commits would fail for these spaces.

2. **Atomic Operations**: Users often make multiple changes (reorder tabs, rename one, delete another) before saving. Batching ensures all changes succeed or fail together.

3. **Optimistic UI**: Changes appear immediately in the UI while the actual save happens in the background when the user clicks "Save".

4. **Rollback Support**: If a save fails, the local state can be reset to match the remote state.

### Data Flow

```
User Action (create/delete/rename/reorder)
    ↓
Update localSpaces (immediate, optimistic)
    ↓
UI reflects changes instantly
    ↓
User clicks "Save" button
    ↓
commitAllSpaceChanges() called
    ↓
All pending changes written to Supabase Storage
    ↓
remoteSpaces updated to match
```

## Local vs Remote State

The space store maintains two parallel state trees:

### `localSpaces`
The working copy that reflects the user's current edits:
```typescript
localSpaces: {
  [spaceId]: {
    id: string;
    order: string[];        // Current tab order
    tabs: {                 // Tab configurations
      [tabName]: SpaceConfig;
    };
    deletedTabs: string[];  // Tabs pending deletion
  }
}
```

### `remoteSpaces`
The database state (source of truth):
```typescript
remoteSpaces: {
  [spaceId]: {
    id: string;
    order: string[];        // Tab order from database
    tabs: {                 // Only tabs that have been loaded
      [tabName]: SpaceConfig;
    };
  }
}
```

### Key Differences

| Aspect | localSpaces | remoteSpaces |
|--------|-------------|--------------|
| Updated by | User actions | Database loads/commits |
| Contains | All pending changes | Last known DB state |
| `deletedTabs` | Tracks deletions | Not present |
| `tabs` | All edited tabs | Only loaded tabs |

## Tab Operations in Detail

### Creating a Tab

```typescript
// 1. User clicks "New Tab"
createSpaceTab(spaceId, tabName, config)

// 2. Optimistically update localSpaces
localSpaces[spaceId].order.push(tabName);
localSpaces[spaceId].tabs[tabName] = config;

// 3. UI shows new tab immediately

// 4. On "Save", commitAllSpaceChanges() uploads:
//    - Tab config to spaces/{spaceId}/tabs/{tabName}
//    - Updated tabOrder to spaces/{spaceId}/tabOrder
```

### Deleting a Tab

```typescript
// 1. User clicks delete on a tab
deleteSpaceTab(spaceId, tabName)

// 2. Check if tab exists in database
const existsInDb = remoteSpaces[spaceId]?.order?.includes(tabName);

// 3. Update localSpaces
localSpaces[spaceId].order = order.filter(t => t !== tabName);
delete localSpaces[spaceId].tabs[tabName];

// 4. If exists in DB, mark for deletion
if (existsInDb) {
  localSpaces[spaceId].deletedTabs.push(tabName);
}

// 5. On "Save", commitAllSpaceChanges():
//    - Deletes tab files for items in deletedTabs
//    - Updates tabOrder file
//    - Clears deletedTabs array
```

### Renaming a Tab

```typescript
// 1. User renames tab
renameSpaceTab(spaceId, oldName, newName, config)

// 2. Update localSpaces order
const index = order.indexOf(oldName);
order[index] = newName;

// 3. Move tab config to new key
localSpaces[spaceId].tabs[newName] = config;
delete localSpaces[spaceId].tabs[oldName];

// 4. Mark old name for deletion (if it existed in DB)
if (remoteSpaces[spaceId]?.order?.includes(oldName)) {
  localSpaces[spaceId].deletedTabs.push(oldName);
}

// 5. On "Save", commitAllSpaceChanges():
//    - Uploads new tab file
//    - Deletes old tab file
//    - Updates tabOrder
```

### Reordering Tabs

```typescript
// 1. User drags tab to new position
updateLocalSpaceOrder(spaceId, newOrder)

// 2. Update localSpaces immediately
localSpaces[spaceId].order = newOrder;

// 3. On "Save", commitAllSpaceChanges():
//    - Updates tabOrder file only
//    - No tab files modified
```

## The Commit Process

When `commitAllSpaceChanges(spaceId, network?)` is called:

```typescript
async function commitAllSpaceChanges(spaceId: string, network?: string) {
  const localSpace = localSpaces[spaceId];

  // 1. Delete tabs marked for deletion
  for (const tabName of localSpace.deletedTabs) {
    await deleteTabFromStorage(spaceId, tabName, network);
  }

  // 2. Upload all modified tabs
  for (const [tabName, config] of Object.entries(localSpace.tabs)) {
    if (tabWasModified(tabName)) {
      await uploadTabToStorage(spaceId, tabName, config, network);
    }
  }

  // 3. Upload updated tab order
  await uploadTabOrder(spaceId, localSpace.order);

  // 4. Update remoteSpaces to match
  remoteSpaces[spaceId] = {
    ...localSpace,
    deletedTabs: undefined  // Not stored in remote
  };

  // 5. Clear deletedTabs
  localSpace.deletedTabs = [];
}
```

## Storage Structure

Tab data is stored in Supabase Storage:

```
spaces/
└── {spaceId}/
    ├── tabOrder           # JSON: { spaceId, tabOrder: string[], timestamp }
    └── tabs/
        ├── {tabName1}     # SignedFile containing SpaceConfig
        ├── {tabName2}     # SignedFile containing SpaceConfig
        └── ...
```

### tabOrder File Format

```json
{
  "spaceId": "uuid-here",
  "tabOrder": ["Home", "Gallery", "Links"],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Tab File Format

Tab files are wrapped in a `SignedFile` format (see [SignedFile Format](../STORAGE/SIGNED_FILE_FORMAT.md)):

```json
{
  "publicKey": "user-public-key",
  "fileData": "{...SpaceConfig JSON...}",
  "fileType": "json",
  "isEncrypted": false,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "signature": "ed25519-signature"
}
```

## Detecting What Exists in Database

A key challenge is knowing whether a tab exists in the database:

- `remoteSpaces[spaceId].tabs` only contains tabs that have been **loaded/viewed**
- `remoteSpaces[spaceId].order` contains **all tabs that exist in the database**

When determining if a deleted tab needs to be removed from storage:

```typescript
// WRONG: Only checks loaded tabs
const existsInDb = remoteSpaces[spaceId]?.tabs?.[tabName] !== undefined;

// CORRECT: Checks the authoritative order list
const existsInDb = remoteSpaces[spaceId]?.order?.includes(tabName);
```

## Reset/Cancel Changes

When the user cancels their edits:

```typescript
function resetConfig() {
  // Reset local state to match remote
  localSpaces[spaceId] = {
    ...remoteSpaces[spaceId],
    deletedTabs: []
  };
}
```

## Error Handling

If a commit fails partway through:

1. Some tabs may have been saved, others not
2. The `deletedTabs` array is NOT cleared
3. User can retry the save
4. Or reset to abandon changes

Future improvement: Implement transaction-like semantics with rollback.

## Related Files

- `src/common/data/stores/app/space/spaceStore.ts` - Core store implementation
- `src/app/(spaces)/PublicSpace.tsx` - Public space tab bar wiring
- `src/common/components/organisms/TabBar.tsx` - Tab bar UI component

## Related Documentation

- [Space Architecture](SPACE_ARCHITECTURE.md) - Overall space system
- [SignedFile Format](../STORAGE/SIGNED_FILE_FORMAT.md) - File wrapper format
- [State Management](../../ARCHITECTURE/STATE_MANAGEMENT.md) - Store patterns
