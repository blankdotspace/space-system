# Navigation System Overview

## Executive Summary

The Navigation System provides an admin interface for managing navigation items (navigation bar links) for a community. Navigation items are stored in the `community_configs.navigation_config` JSONB column in the database, and each navigation item can reference a Space stored in Supabase Storage.

## Core Concepts

### Navigation Items

Navigation items are the links that appear in the navigation bar. Each item can:
- Have a label (display text)
- Have an href (URL path)
- Have an icon (from react-icons or custom URL)
- Reference a Space (for navigation pages like `/home`, `/explore`)

### Navigation Editor

The Navigation Editor is an admin-only interface that allows authorized users to:
- Create new navigation items
- Edit existing navigation items (rename, change icon, reorder)
- Delete navigation items
- Commit changes to the database
- Cancel changes and revert to the last committed state

### Local-First Architecture

Navigation changes follow a local-first pattern:
1. Changes are staged locally in the Zustand store
2. Users can preview changes before committing
3. Changes are committed to the database when the user clicks "Save"
4. Changes can be cancelled to revert to the last committed state

## Architecture

### Data Flow

```
User edits navigation in NavigationEditor (Client Component)
  ↓
Changes stored in Zustand store (localNavigation)
  ↓
User clicks "Save"
  ↓
commitNavigationChanges() in navigationStore
  ├─ Creates/registers spaces for new items
  ├─ Prepares navigation config with updated items
  ├─ Signs request with user's identity key
  └─ Sends PUT request to /api/navigation/config
  ↓
API endpoint (/api/navigation/config)
  ├─ Validates admin permissions
  ├─ Validates request signature
  ├─ Merges new items with existing config
  ├─ Updates community_configs.navigation_config
  └─ Returns success
  ↓
Store updates remoteNavigation to match localNavigation
```

### Components

#### NavigationEditor

**Location**: `src/common/components/organisms/navigation/NavigationEditor.tsx`

The main editor component that provides:
- Drag-and-drop reordering (using Framer Motion Reorder)
- Inline editing (using EditableText component)
- Icon selection (using IconSelector component)
- Create/delete buttons
- Save/Cancel buttons

**Features**:
- Only renders when `navEditMode` is true
- Shows editable items (excludes system items like "notifications")
- Provides drag handles for reordering
- Allows inline editing of labels
- Provides icon selector for each item
- Shows loading indicator on commit button
- Shows confirmation dialog when canceling with uncommitted changes

#### useNavigation Hook

**Location**: `src/common/components/organisms/navigation/useNavigation.ts`

Custom React hook that encapsulates navigation state and operations:
- Loads navigation from SystemConfig
- Manages local navigation state
- Provides handlers for create, rename, delete, reorder, commit, cancel
- Handles debounced reordering
- Manages navigation completion tracking for cancel operations

#### NavigationStore

**Location**: `src/common/data/stores/app/navigation/navigationStore.ts`

Zustand store that manages navigation state:
- `remoteNavigation`: Items from the database (committed state)
- `localNavigation`: Items with uncommitted changes (staged state)
- `hrefMappings`: Temporary mappings for URL updates during renames

**Actions**:
- `loadNavigation`: Loads items from SystemConfig
- `createNavigationItem`: Creates a new item with validation and auto-generated href
- `renameNavigationItem`: Renames an item with validation and href regeneration
- `deleteNavigationItem`: Removes an item
- `updateNavigationOrder`: Updates the order of items
- `commitNavigationChanges`: Commits local changes to the database
- `resetNavigationChanges`: Reverts local changes to match remote

### API Endpoint

#### PUT /api/navigation/config

**Location**: `src/pages/api/navigation/config.ts`

Updates the navigation configuration in the database.

**Request**:
```typescript
{
  communityId: string;
  navigationConfig: NavigationConfig;
  publicKey: string;
  timestamp: string;
  signature: string;
}
```

**Validation**:
- Admin permissions (checks `admin_identity_public_keys` in community_configs)
- Request signature (validates cryptographic signature)
- Navigation item validation (label and href validation)

**Response**:
```typescript
{
  result: "success" | "error";
  error?: { message: string };
}
```

## Data Structure

### NavigationConfig

```typescript
interface NavigationConfig {
  items: NavigationItem[];
  logoTooltip?: { text: string; href: string };
  showMusicPlayer?: boolean;
  showSocials?: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: string;  // react-icons name (e.g., "FaHome") or custom URL
  spaceId?: string;  // Reference to Space in Supabase Storage
}
```

### Database Schema

Navigation configuration is stored in the `community_configs` table:

```sql
community_configs (
  community_id VARCHAR(50),
  navigation_config JSONB,  -- Contains NavigationConfig
  ...
)
```

### Storage Structure

Navigation pages (referenced by `spaceId`) are stored in Supabase Storage:

```
spaces/
  {spaceId}/
    tabOrder          ← JSON: { tabOrder: ["Home", "About", ...] }
    tabs/
      Home            ← SpaceConfig JSON
      About           ← SpaceConfig JSON
      ...
```

## Key Features

### Name Validation

Navigation item labels are validated for:
- Valid characters (alphanumeric, spaces, hyphens, underscores, `$`)
- Maximum length (50 characters)
- Uniqueness (no duplicate labels or hrefs)
- Auto-generation of unique names if duplicates exist

### Href Generation

Hrefs are automatically generated from labels using slugification:
- Converts to lowercase
- Replaces spaces with hyphens
- Removes invalid characters
- Ensures uniqueness by appending numbers if needed

### Icon System

Icons can be:
- React Icons (Font Awesome 6, Bootstrap Icons, Game Icons)
- Custom URLs (external image URLs)

The icon selector system from the mobile editor settings is integrated into the navigation editor.

### Space Creation

New navigation items automatically create local spaces:
- Generates a unique `spaceId` (UUID)
- Creates a default "Home" tab configuration
- Stores space in `localSpaces` until committed
- Registers space in database when changes are committed

### URL Updates

When renaming a navigation item:
- The URL is updated immediately using `router.replace()`
- A temporary `hrefMappings` entry prevents 404 flashes
- The mapping is cleared after navigation completes

### Error Handling

- Error boundaries catch and display errors gracefully
- User-friendly error messages for API failures
- Retryable errors are identified and can be retried
- Validation errors are shown inline

## UI/UX Features

### Edit Mode

- Sidebar remains expanded during edit mode (cannot be collapsed)
- Edit button appears in navigation bar (admin only)
- Save/Cancel buttons replace cast button in header
- Confirmation dialog when canceling with uncommitted changes

### Editing Experience

- Drag-and-drop reordering with visual feedback
- Inline editing (double-click to edit, Enter to save, Escape to cancel)
- Icon selector opens in a popover
- Delete button appears on hover
- Loading indicator on commit button during save

### System Items

Certain items are system-managed and not editable:
- "notifications" - System notifications item
- "login/logout" - Authentication buttons
- "my space" - User's profile space link
- "search" - Search functionality

These items are displayed but cannot be edited or deleted.

## Memory Management

### Cache Cleanup

The SystemConfig cache (`SYSTEM_CONFIG_CACHE` in `registry.ts`) includes cleanup to prevent memory leaks:
- Expired entries are cleaned up before writes
- Cache size is monitored and cleaned when > 10 entries
- Prevents unbounded growth in long-running processes

### Debounce Cleanup

Debounced functions (navigation reordering) include cleanup:
- `debouncedUpdateOrder.cancel()` is called on unmount
- Prevents memory leaks from pending timers

## Security

### Admin Authentication

Only users whose `identityPublicKey` is in the `admin_identity_public_keys` array can:
- Enter navigation edit mode
- Create/edit/delete navigation items
- Commit navigation changes

### Request Signing

All navigation config updates are cryptographically signed:
- Uses the user's identity private key
- Signature is validated on the server
- Prevents unauthorized modifications

## Related Documentation

- [Configuration System](../CONFIGURATION/ARCHITECTURE_OVERVIEW.md) - How navigation config is stored
- [Space Architecture](../SPACES/SPACE_ARCHITECTURE.md) - How navigation pages are stored as Spaces
- [State Management](../../ARCHITECTURE/STATE_MANAGEMENT.md) - Zustand store architecture

