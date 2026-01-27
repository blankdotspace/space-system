# Public Spaces Pattern

This document describes the architectural pattern used for public spaces in Nounspace, including how different space types are structured and how common functionality is shared.

## Overview

The public spaces pattern follows a clear separation of concerns between server-side data loading and client-side interactivity. This ensures consistency across different space types while maintaining clean, maintainable code and proper serialization between server and client.

## Architecture

### Core Components

1. **Page Components** - Server-side data loading and routing
2. **Utils Files** - Data loading functions and space data creators
3. **Space Components** - Client-side type-specific logic and editability
4. **PublicSpace** - Common functionality shared across all space types
5. **Layout Components** - Space-specific layouts and providers

### Data Flow

```
Server-side data loading (Utils Functions)
    ↓
Omit<SpaceData, 'isEditable'> (Serializable data)
    ↓
Page Component (Routes and renders)
    ↓
Client-side space component (Adds isEditable function)
    ↓
Common space management (PublicSpace)
    ↓
Space rendering and interaction
```

### Key Pattern: Omit<SpaceData, 'isEditable'>

The pattern uses TypeScript's `Omit` utility to separate server-side data from client-side functionality:

- **Server-side**: Creates `Omit<SpaceData, 'isEditable'>` (no functions, fully serializable)
- **Client-side**: Adds `isEditable` function where user state is available
- **Type Safety**: Explicit about what's missing from server-side data

## Space Types

### 1. Profile Spaces (`/s/[handle]`)

**Purpose**: User profile spaces for Farcaster users

**Components**:
- `src/app/(spaces)/s/[handle]/page.tsx` - Page component (routing)
- `src/app/(spaces)/s/[handle]/utils.ts` - Data loading functions
- `src/app/(spaces)/s/[handle]/ProfileSpace.tsx` - Client-side space component
- `src/app/(spaces)/s/[handle]/layout.tsx` - Space-specific layout

**Data Flow**:
```typescript
// Utils - Data loading functions
export const loadUserSpaceData = async (handle, tabNameParam) => {
  // Load user metadata, create space data
  return createProfileSpaceData(spaceId, spaceName, fid, tabName);
};

// Page Component - Routing and rendering
export default async function ProfileSpacePage({ params }) {
  const profileSpaceData = await loadUserSpaceData(handle, tabNameParam);
  
  if (!profileSpaceData) {
    return <SpaceNotFound />;
  }
  
  return (
    <ProfileSpace
      spaceData={profileSpaceData} // Omit<ProfileSpaceData, 'isEditable'>
      tabName={profileSpaceData.config.tabNames?.[0] || "Profile"}
    />
  );
}

// Space Component - Client-side editability logic
export default function ProfileSpace({ spaceData, tabName }: ProfileSpaceProps) {
  const spaceDataWithEditability = useMemo(() => ({
    ...spaceData,
    isEditable: (currentUserFid: number | undefined) => 
      isProfileSpaceEditable(spaceData.fid, currentUserFid),
  }), [spaceData]);

  return (
    <PublicSpace
      spaceData={spaceDataWithEditability}
      tabName={tabName}
    />
  );
}
```

**Key Features**:
- Server-side data loading with `loadUserSpaceData()`
- Client-side editability based on FID comparison
- Type-safe `Omit<ProfileSpaceData, 'isEditable'>` pattern

### 2. Token Spaces (`/t/[network]/[contractAddress]`)

**Purpose**: Token/contract spaces for ERC-20 tokens and NFTs

**Components**:
- `src/app/(spaces)/t/[network]/[contractAddress]/page.tsx` - Page component (routing)
- `src/app/(spaces)/t/[network]/[contractAddress]/utils.ts` - Data loading functions
- `src/app/(spaces)/t/[network]/TokenSpace.tsx` - Client-side space component
- `src/app/(spaces)/t/[network]/[contractAddress]/layout.tsx` - Space-specific layout

**Data Flow**:
```typescript
// Utils - Data loading functions
export const loadTokenSpaceData = async (params, tabNameParam) => {
  const spaceMetadata = await loadTokenSpaceMetadata(params);
  const tokenData = await loadTokenData(contractAddress, network);
  return createTokenSpaceData(spaceId, spaceName, contractAddress, network, ownerId, ownerIdType, tokenData, tabName);
};

// Page Component - Routing and rendering with TokenProvider
export default async function ContractPrimarySpace({ params }) {
  const tokenSpaceData = await loadTokenSpaceData(resolvedParams, decodedTabNameParam);
  
  if (!tokenSpaceData) {
    return <ContractNotFound />;
  }
  
  return (
    <TokenProvider
      contractAddress={tokenSpaceData.contractAddress}
      network={tokenSpaceData.network}
      defaultTokenData={tokenSpaceData.tokenData}
    >
      <TokenSpace
        spaceData={tokenSpaceData} // Omit<TokenSpaceData, 'isEditable'>
        tabName={finalTabName}
      />
    </TokenProvider>
  );
}

// Space Component - Client-side editability logic
export default function TokenSpace({ spaceData, tabName }: TokenSpaceProps) {
  const { tokenData } = useToken(); // Uses TokenProvider context
  
  const updatedSpaceData: TokenSpaceData = useMemo(() => ({
    ...spaceData,
    tokenData: tokenData || spaceData.tokenData,
    isEditable: (currentUserFid: number | undefined, wallets?: { address: Address }[]) => 
      checkTokenSpaceEditability(spaceData.ownerAddress, tokenData || spaceData.tokenData, currentUserFid, wallets || []),
  }), [spaceData, tokenData]);

  return (
    <PublicSpace
      spaceData={updatedSpaceData}
      tabName={tabName}
    />
  );
}
```

**Key Features**:
- Server-side data loading with `loadTokenSpaceMetadata()` and `loadTokenData()`
- Client-side token data updates via `TokenProvider`
- Complex editability logic (FID + wallet address ownership)
- Type-safe `Omit<TokenSpaceData, 'isEditable'>` pattern

### 3. Proposal Spaces (`/p/[proposalId]`)

**Purpose**: DAO proposal spaces for Nouns governance

**Components**:
- `src/app/(spaces)/p/[proposalId]/page.tsx` - Page component (routing)
- `src/app/(spaces)/p/[proposalId]/utils.ts` - Data loading functions
- `src/app/(spaces)/p/[proposalId]/ProposalSpace.tsx` - Client-side space component
- `src/app/(spaces)/p/[proposalId]/layout.tsx` - Space-specific layout

**Data Flow**:
```typescript
// Utils - Data loading functions
export const loadProposalSpaceData = async (proposalId, tabNameParam) => {
  const proposalData = await loadProposalData(proposalId);
  return createProposalSpaceData(spaceId, spaceName, proposalId, ownerAddress, tabName);
};

// Page Component - Routing and rendering
export default async function ProposalSpacePage({ params }) {
  const proposalSpaceData = await loadProposalSpaceData(proposalId, tabNameParam);
  
  if (!proposalSpaceData) {
    return <SpaceNotFound />;
  }
  
  return (
    <ProposalSpace
      spaceData={proposalSpaceData} // Omit<ProposalSpaceData, 'isEditable'>
      tabName={proposalSpaceData.config.tabNames?.[0] || "Overview"}
    />
  );
}

// Space Component - Client-side editability logic
export default function ProposalSpace({ spaceData, tabName }: ProposalSpaceProps) {
  const spaceDataWithEditability = useMemo(() => ({
    ...spaceData,
    isEditable: (currentUserFid: number | undefined, wallets?: { address: Address }[]) => 
      isProposalSpaceEditable(spaceData.ownerAddress, currentUserFid, wallets),
  }), [spaceData]);

  return (
    <PublicSpace
      spaceData={spaceDataWithEditability}
      tabName={tabName}
    />
  );
}
```

**Key Features**:
- Server-side data loading with `loadProposalSpaceData()`
- Client-side editability based on wallet address ownership
- 404 handling for invalid proposal IDs
- Type-safe `Omit<ProposalSpaceData, 'isEditable'>` pattern

### 4. Channel Spaces (`/c/[channelId]`)

**Purpose**: Farcaster channel spaces for community channels

**Components**:
- `src/app/(spaces)/c/[channelId]/page.tsx` - Page component (routing)
- `src/app/(spaces)/c/[channelId]/utils.ts` - Data loading functions
- `src/app/(spaces)/c/[channelId]/ChannelSpace.tsx` - Client-side space component
- `src/app/(spaces)/c/[channelId]/layout.tsx` - Space-specific layout

**Data Flow**:
```typescript
// Utils - Data loading functions
export const loadChannelSpaceData = async (channelId, tabNameParam) => {
  const channelMetadata = await getChannelMetadata(channelId);
  return createChannelSpaceData(spaceId, channelId, displayName, description, imageUrl, followerCount, moderatorFids, tabName);
};

// Page Component - Routing and rendering
export default async function ChannelSpacePage({ params }) {
  const channelSpaceData = await loadChannelSpaceData(channelId, tabNameParam);
  
  if (!channelSpaceData) {
    return <SpaceNotFound />;
  }
  
  return (
    <ChannelSpace
      spaceData={channelSpaceData}
      tabName={tabNameParam || channelSpaceData.defaultTab}
    />
  );
}
```

**Key Features**:
- Server-side data loading with channel metadata from Neynar API
- Client-side editability based on moderator FIDs
- Channel metadata (description, image, follower count)
- Type-safe `Omit<ChannelSpacePageData, 'isEditable'>` pattern

### 5. Nav Page Spaces (`/[navSlug]`)

**Purpose**: Navigation pages (like `/home`, `/explore`) that are admin-editable spaces

**Components**:
- `src/app/[navSlug]/[[...tabName]]/page.tsx` - Page component (routing)
- `src/app/[navSlug]/[[...tabName]]/utils.ts` - Data loading functions
- `src/app/[navSlug]/[[...tabName]]/NavPageSpace.tsx` - Client-side space component

**Data Flow**:
```typescript
// Utils - Data loading functions
export const loadNavPageSpaceData = async (navSlug, tabNameParam) => {
  const config = await loadSystemConfig();
  const navItem = config.navigation?.items.find(item => item.href === `/${navSlug}`);
  
  if (!navItem || !navItem.spaceId) {
    return null;
  }
  
  return createNavPageSpaceData(navItem.spaceId, navSlug, tabNameParam, config.adminIdentityPublicKeys);
};

// Page Component - Routing and rendering
export default async function NavPage({ params }) {
  const spaceData = await loadNavPageSpaceData(navSlug, decodedTabName);
  
  return (
    <NavPageSpace
      spacePageData={spaceData}
      tabName={decodedTabName}
      navSlug={navSlug}
      adminIdentityPublicKeys={config.adminIdentityPublicKeys || []}
    />
  );
}
```

**Key Features**:
- Navigation items stored in `community_configs.navigation_config`
- Space content stored in Supabase Storage (referenced by `spaceId`)
- Editability based on `adminIdentityPublicKeys` in community config
- Dynamic routing via catch-all `[[...tabName]]` segment
- Fallback to client-side local stores if server doesn't find space

## File Structure

Each space type follows a consistent file structure:

```
src/app/(spaces)/
├── s/[handle]/                    # Profile Spaces
│   ├── page.tsx                   # Page component (routing)
│   ├── utils.ts                   # Data loading functions
│   ├── ProfileSpace.tsx           # Client-side space component
│   ├── layout.tsx                 # Space-specific layout
│   └── [tabName]/page.tsx         # Tab wrapper (re-exports main page)
├── p/[proposalId]/                # Proposal Spaces
│   ├── page.tsx                   # Page component (routing)
│   ├── utils.ts                   # Data loading functions
│   ├── ProposalSpace.tsx          # Client-side space component
│   ├── layout.tsx                 # Space-specific layout
│   └── [tabname]/page.tsx         # Tab wrapper (re-exports main page)
├── t/[network]/[contractAddress]/ # Token Spaces
│   ├── page.tsx                   # Page component (routing)
│   ├── utils.ts                   # Data loading functions
│   ├── layout.tsx                 # Space-specific layout
│   ├── [tabName]/page.tsx         # Tab wrapper (re-exports main page)
│   └── ../TokenSpace.tsx          # Client-side space component (shared)
├── c/[channelId]/                 # Channel Spaces
│   ├── page.tsx                   # Page component (routing)
│   ├── utils.ts                   # Data loading functions
│   ├── ChannelSpace.tsx           # Client-side space component
│   ├── layout.tsx                 # Space-specific layout
│   └── [tabName]/page.tsx         # Tab wrapper (re-exports main page)
└── homebase/                      # Private Spaces
    └── [[...slug]]/
        ├── page.tsx               # Client-side page (no server component)
        └── layout.tsx
        
src/app/[navSlug]/[[...tabName]]/  # Nav Page Spaces
├── page.tsx                       # Page component (routing)
├── utils.ts                       # Data loading functions
└── NavPageSpace.tsx               # Client-side space component
```

## Utils Pattern

Each space type has a dedicated `utils.ts` file that contains:

### Data Loading Functions
- **`load{Type}SpaceData()`** - Main data loading function
- **`create{Type}SpaceData()`** - Space data creator function
- **Helper functions** - Space-specific data fetching utilities

### Example Utils Structure
```typescript
// src/app/(spaces)/s/[handle]/utils.ts
export const loadUserSpaceData = async (handle, tabNameParam) => {
  // Load user metadata, create space data
  return createProfileSpaceData(spaceId, spaceName, fid, tabName);
};

export const createProfileSpaceData = (spaceId, spaceName, fid, tabName) => {
  // Create ProfileSpaceData object
  return { id, spaceName, spaceType, updatedAt, spacePageUrl, config, fid };
};

// Helper functions
export const getUserMetadata = async (handle) => { ... };
export const getTabList = async (fid) => { ... };
```

### Benefits of Utils Pattern
1. **Separation of Concerns** - Data loading logic separated from page components
2. **Reusability** - Utils functions can be imported and reused
3. **Testability** - Data loading logic can be tested independently
4. **Consistency** - All space types follow the same pattern
5. **Maintainability** - Centralized data loading logic

## Layout Components

Each space type has a `layout.tsx` file that provides:

### Space-Specific Layouts
- **Profile Layout** - User-specific layout and providers
- **Proposal Layout** - Proposal-specific layout and providers  
- **Token Layout** - Token-specific layout and providers

### Provider Wrapping
- **TokenProvider** - For token spaces (real-time data updates)
- **Space-specific providers** - For type-specific functionality
- **Common providers** - Shared across all space types

### Example Layout Structure
```typescript
// src/app/(spaces)/t/[network]/[contractAddress]/layout.tsx
export default function TokenSpaceLayout({ children }) {
  return (
    <TokenProvider>
      <CommonProviders>
        {children}
      </CommonProviders>
    </TokenProvider>
  );
}
```

## PublicSpace Component

The `PublicSpace` component handles all common functionality shared across space types:

### Responsibilities

1. **Space Resolution**: Finds existing spaces in `localSpaces` by matching:
   - **Profile spaces**: by `fid`
   - **Token spaces**: by `contractAddress` + `network`
   - **Proposal spaces**: by `proposalId`

2. **Space Registration**: Registers new spaces if they don't exist

3. **Space State Management**: Manages `currentSpaceId` and `currentTabName`

4. **Tab Loading and Caching**: Loads and caches space tabs efficiently

5. **Editability Logic**: Calls `spaceData.isEditable()` to determine if space is editable

6. **Space Switching**: Handles switching between different spaces

7. **Loading States**: Manages loading states and error handling

### Key Features

```typescript
// Space resolution logic
if (isProposalSpace(spaceData)) {
  const existingSpace = Object.values(localSpacesSnapshot).find(
    (s) => s.proposalId === spaceData.proposalId
  );
  if (existingSpace) {
    nextSpaceId = existingSpace.id;
  }
}

// Space registration
if (!existingSpace) {
  const initialConfig = {
    fidgetInstanceDatums: {},
    layoutID: "default-layout",
    layoutDetails: { /* layout configuration */ },
    fidgetTrayContents: [],
    theme: { /* theme configuration */ },
    timestamp: new Date().toISOString(),
  };
  const newSpaceId = await registerProposalSpace(proposalId, initialConfig);
  setCurrentSpaceId(newSpaceId);
}

// Editability check
const isEditable = useMemo(() => {
  return spaceData.isEditable(currentUserFid, wallets);
}, [spaceData, currentUserFid, wallets]);
```

## Space Data Structure

Each space type implements a common `SpaceData` interface with type-specific fields:

```typescript
interface SpaceData {
  id?: string; // Set by PublicSpace through registration
  spaceName: string;
  spaceType: SPACE_TYPES;
  updatedAt: string;
  spacePageUrl: (tabName: string) => string;
  isEditable: (currentUserFid?: number, wallets?: { address: Address }[]) => boolean;
  defaultTab: string; // Default tab name for this space
  config: SpaceConfig;
}
```

### Default Tab Values

Each space type defines its own default tab:

- **Profile Spaces**: `"Profile"`
- **Token Spaces**: `"Token"`  
- **Proposal Spaces**: `"Overview"`
- **Channel Spaces**: `"Channel"`
- **Nav Page Spaces**: First tab in tabOrder

The `defaultTab` property is used as a fallback when no specific tab is provided in the URL, ensuring consistent behavior across all space types.

// Type-specific extensions
interface ProfileSpacePageData extends SpacePageData {
  spaceType: 'profile';
  identityPublicKey?: string;
}

interface TokenSpacePageData extends SpacePageData {
  spaceType: 'token';
  contractAddress: string;
  network: string;
  spaceOwnerAddress: Address;
  tokenData?: MasterToken;
  identityPublicKey?: string;
}

interface ProposalSpacePageData extends SpacePageData {
  spaceType: 'proposal';
  proposalId: string;
  spaceOwnerAddress: Address;
  proposalData?: ProposalData;
  identityPublicKey?: string;
}

interface ChannelSpacePageData extends SpacePageData {
  spaceType: 'channel';
  channelId: string;
  channelDisplayName?: string;
  channelDescription?: string;
  channelImageUrl?: string;
  channelFollowerCount?: number;
  moderatorFids: number[];
  identityPublicKey?: string;
}

interface NavPageSpacePageData extends SpacePageData {
  spaceType: 'navPage';
  navSlug: string;
  adminIdentityPublicKeys: string[];
}
```

### Server-Side Data Pattern

Server-side data creators return `Omit<SpaceData, 'isEditable'>` to ensure serialization safety:

```typescript
// Server-side creators
const createProfileSpaceData = (...): Omit<ProfileSpaceData, 'isEditable' | 'spacePageUrl'> => { 
  return {
    // ... other properties
    defaultTab: "Profile",
    // ...
  };
}
const createTokenSpaceData = (...): Omit<TokenSpaceData, 'isEditable' | 'spacePageUrl'> => { 
  return {
    // ... other properties
    defaultTab: "Token",
    // ...
  };
}
const createProposalSpaceData = (...): Omit<ProposalSpaceData, 'isEditable' | 'spacePageUrl'> => { 
  return {
    // ... other properties
    defaultTab: "Overview",
    // ...
  };
}

// Client-side components add isEditable and spacePageUrl
const spaceDataWithEditability = useMemo(() => ({
  ...spaceData, // Omit<SpaceData, 'isEditable' | 'spacePageUrl'>
  isEditable: (currentUserFid, wallets) => { ... },
  spacePageUrl: (tabName) => { ... }
}), [spaceData]);
```

## Benefits of the Omit Pattern

### 1. **Serialization Safety**
- Server-side data contains no functions, ensuring proper serialization
- No runtime errors from trying to serialize functions
- Clean separation between data and behavior

### 2. **Type Safety**
- `Omit<SpaceData, 'isEditable'>` explicitly shows what's missing
- TypeScript catches errors at compile time
- Clear contract between server and client

### 3. **Performance**
- Server-side data loading is optimized for initial render
- Client-side editability logic only runs when needed
- No unnecessary function serialization/deserialization

### 4. **Maintainability**
- Clear separation of concerns
- Easy to understand data flow
- Consistent pattern across all space types

### 5. **Flexibility**
- Each space type can implement its own editability logic
- Easy to add new space types following the same pattern
- Client-side logic can access user state and context

### 6. **Centralized Default Tab Management**
- Each space type defines its own default tab name
- Consistent fallback behavior across all space types
- Easy to modify default tabs without changing page components

## Naming Conventions

The codebase follows consistent naming patterns across all space types:

### Component Naming
- **Space Components**: `{Type}Space` (e.g., `ProfileSpace`, `TokenSpace`, `ProposalSpace`)
- **Files**: `{Type}Space.tsx` (e.g., `ProfileSpace.tsx`, `TokenSpace.tsx`, `ProposalSpace.tsx`)
- **Props Interfaces**: `{Type}SpaceProps` (e.g., `ProfileSpaceProps`, `TokenSpaceProps`, `ProposalSpaceProps`)

### Space Data Types
- **Base Interface**: `SpaceData`
- **Type-specific Interfaces**: `{Type}SpaceData` (e.g., `ProfileSpaceData`, `TokenSpaceData`, `ProposalSpaceData`)

### Examples
```typescript
// Profile Space
export const ProfileSpace = ({ ... }: ProfileSpaceProps) => { ... }
interface ProfileSpaceData extends SpaceData { ... }

// Token Space  
export const TokenSpace = ({ ... }: TokenSpaceProps) => { ... }
interface TokenSpaceData extends SpaceData { ... }

// Proposal Space
export const ProposalSpace = ({ ... }: ProposalSpaceProps) => { ... }
interface ProposalSpaceData extends SpaceData { ... }
```

This consistent naming makes the codebase easier to understand and maintain.

## Design Principles

### 1. Separation of Concerns

- **Page Components**: Handle server-side data loading and routing
- **Space Components**: Handle type-specific logic and configuration
- **PublicSpace**: Handle common functionality shared across all space types

### 2. Props Over Context

- Data flows down through props rather than context
- Type-specific data is loaded server-side and passed as props
- Common data (like spaceId) is managed by PublicSpace

### 3. Consistent Patterns

- All space types follow the same architectural pattern
- Common functionality is centralized in PublicSpace
- Type-specific logic is isolated in space components

### 4. Performance Optimization

- Server-side data loading for better performance
- Efficient space resolution and caching
- Lazy loading of space tabs

## Benefits

1. **Consistency**: All space types follow the same pattern
2. **Maintainability**: Common functionality is centralized
3. **Performance**: Server-side loading and efficient caching
4. **Type Safety**: Strong typing with TypeScript
5. **Scalability**: Easy to add new space types
6. **Testability**: Clear separation makes testing easier

## Adding New Space Types

To add a new space type:

1. **Create directory structure** following the pattern:
   ```
   src/app/(spaces)/{type}/[param]/
   ├── page.tsx          # Page component (routing)
   ├── utils.ts          # Data loading functions
   ├── {Type}Space.tsx   # Client-side space component
   ├── layout.tsx        # Space-specific layout
   └── [tabName]/page.tsx # Tab wrapper (re-exports main page)
   ```

2. **Create utils file** with data loading functions:
   - `load{Type}SpaceData()` - Main data loading function
   - `create{Type}SpaceData()` - Space data creator function
   - Helper functions for space-specific data fetching

3. **Create space component** with type-specific logic:
   - Accept `Omit<{Type}SpaceData, 'isEditable'>` as props
   - Add `isEditable` function using `useMemo`
   - Render `PublicSpace` with complete space data

4. **Create page component** for routing:
   - Import data loading function from utils
   - Handle 404 cases
   - Render space component with loaded data

5. **Create layout component** if needed:
   - Wrap with space-specific providers
   - Include common providers

6. **Define space data interface** extending `SpaceData`:
   ```typescript
   interface {Type}SpaceData extends SpaceData {
     // Type-specific properties
   }
   ```

7. **Add space type** to `SPACE_TYPES` enum

8. **Update PublicSpace** to handle new space type in resolution logic

9. **Add space registration** logic if needed

The pattern ensures new space types integrate seamlessly with existing functionality while maintaining consistency across the application.
