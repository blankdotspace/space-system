# Mini-App Context System

## Overview

Nounspace implements a comprehensive context system that enables it to operate as both:
1. **A Mini-App**: When embedded in Farcaster clients (Base App, Warpcast, etc.)
2. **A Mini-App Host**: When embedding other mini-apps as Fidgets within Spaces

This system provides rich context information throughout the application hierarchy, allowing embedded mini-apps to understand their environment and respond appropriately.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Farcaster Client (Base App, Warpcast, etc.)           │
│  Provides: user, location, client, features context      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Nounspace (Mini-App)                                   │
│  - Receives context from host                           │
│  - Combines with Nounspace-specific context             │
│  - Provides to embedded Fidgets                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Embedded Mini-App (Fidget)                             │
│  - Receives context via official SDK API (sdk.context) │
│  - SDK communicates with parent via Comlink/postMessage │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. MiniAppSdkProvider

The base provider that initializes the Farcaster Mini App SDK and provides raw host context.

**Location**: `src/common/providers/MiniAppSdkProvider.tsx`

**Usage**:
```tsx
import { MiniAppSdkProvider } from "@/common/providers/MiniAppSdkProvider";

// Already included in the app's provider tree
```

**Provides**:
- `context`: Raw `MiniAppContext` from the Farcaster SDK
- `sdk`: SDK instance for actions (ready, close, signIn, etc.)
- `isReady`: Whether SDK is initialized
- `error`: Any initialization errors

### 2. MiniAppContextProvider

Combines host context with Nounspace-specific context (space, tab, etc.).

**Location**: `src/common/providers/MiniAppContextProvider.tsx`

**Usage**:
```tsx
import { MiniAppContextProvider } from "@/common/providers/MiniAppContextProvider";

<MiniAppContextProvider
  spaceId="space-123"
  spaceHandle="my-space"
  tabName="home"
  spaceType="profile"
  isEditable={true}
  ownerFid={1234}
>
  {/* Your space content */}
</MiniAppContextProvider>
```

**Props**:
- `spaceId` (required): Unique identifier for the space
- `spaceHandle` (optional): Human-readable space identifier
- `tabName` (optional): Current tab name
- `spaceType` (optional): Type of space (profile, token, proposal, channel, navPage)
- `isEditable` (optional): Whether the space is editable
- `ownerFid` (optional): FID of the space owner

### 3. ContextTransformer

Service for transforming and propagating context between layers.

**Location**: `src/common/lib/services/contextTransformer.ts`

**Key Methods**:

#### `transformForEmbedded(hostContext, nounspaceContext, fidgetId?)`

Transforms host context + Nounspace context into a format suitable for embedded mini-apps.

```typescript
const transformed = ContextTransformer.transformForEmbedded(
  hostContext,
  nounspaceContext,
  "fidget-123"
);
```

Returns `TransformedMiniAppContext` matching the official SDK `MiniAppContext` type:
- Official SDK fields only (user, location, client, features)
- No custom extensions (matches SDK exactly)

#### `buildUrlWithContext(baseUrl, context, nounspaceContext?)`

Builds a URL (returns base URL unchanged - official SDK does not use URL parameters for context).

```typescript
const url = ContextTransformer.buildUrlWithContext(
  "https://example.com",
  hostContext,
  nounspaceContext
);
// Returns: "https://example.com" (no parameters added)
```

#### `parseUrlContext(searchParams)`

Parses context from URL search parameters (returns empty values - official SDK does not use URL parameters).

```typescript
const parsed = ContextTransformer.parseUrlContext(new URLSearchParams(window.location.search));
// Returns: { from: undefined, castHash: null, ... } (all null/undefined)
```

## Hooks

### useMiniAppSdk

Direct access to the Farcaster Mini App SDK.

**Location**: `src/common/lib/hooks/useMiniAppSdk.ts`

**Usage**:
```tsx
import { useMiniAppSdk } from "@/common/lib/hooks/useMiniAppSdk";

function MyComponent() {
  const {
    context,           // Raw MiniAppContext
    featuresContext,   // Client features (haptics, etc.)
    isReady,          // SDK ready state
    castEmbedContext,  // If location is cast_embed
    castShareContext,  // If location is cast_share
    openMiniAppContext, // If location is open_miniapp
    actions,          // SDK actions (ready, close, signIn, etc.)
  } = useMiniAppSdk();
  
  // Use context...
}
```

**Available Context Accessors**:
- `context`: Full `MiniAppContext`
- `clientContext`: Client information
- `userContext`: User information
- `locationContext`: Location information
- `featuresContext`: Client features
- `castEmbedContext`: Cast embed location (if applicable)
- `castShareContext`: Cast share location (if applicable)
- `notificationContext`: Notification location (if applicable)
- `launcherContext`: Launcher location (if applicable)
- `channelContext`: Channel location (if applicable)
- `openMiniAppContext`: Open mini-app location (if applicable)

### useMiniAppContext

Access to combined context (host + Nounspace).

**Location**: `src/common/providers/MiniAppContextProvider.tsx`

**Usage**:
```tsx
import { useMiniAppContext } from "@/common/providers/MiniAppContextProvider";

function MyComponent() {
  const {
    combinedContext,      // Combined host + Nounspace context
    hostContext,          // Raw host context
    nounspaceContext,     // Nounspace-specific context
    transformForEmbedded, // Transform context for embedded apps
    getUrlContext,        // Get URL context params
    buildUrlWithContext,  // Build URL with context
    parseUrlContext,     // Parse URL context
  } = useMiniAppContext();
  
  // Use context...
}
```

### useLocationAwareNavigation

Hook for location-based navigation.

**Location**: `src/common/lib/hooks/useLocationAwareNavigation.ts`

**Usage**:
```tsx
import { useLocationAwareNavigation } from "@/common/lib/hooks/useLocationAwareNavigation";

function MyComponent() {
  const {
    navigateFromContext,  // Navigate based on location
    getNavigationTarget,  // Get target URL for location
    getLocationSummary,  // Get human-readable location summary
  } = useLocationAwareNavigation();
  
  useEffect(() => {
    navigateFromContext();
  }, []);
}
```

## Context Types

### Location Types

The system supports the following location types from the Farcaster SDK:

#### `cast_embed`
Nounspace is embedded **within** a cast. The cast object contains full data (author, text, embeds, etc.).

```typescript
{
  type: "cast_embed";
  embed: string;
  cast: {
    author: { fid: number; username?: string; displayName?: string; pfpUrl?: string };
    hash: string;
    text: string;
    embeds?: string[];
    // ... other cast fields
  };
}
```

**Note**: This means Nounspace is embedded *in* a cast, not viewing a cast. Display the containing cast, don't navigate to it.

#### `cast_share`
User shared a cast to Nounspace. Full cast data is available.

```typescript
{
  type: "cast_share";
  cast: {
    author: { fid: number; username?: string; displayName?: string; pfpUrl?: string };
    hash: string;
    text: string;
    // ... other cast fields
  };
}
```

#### `channel`
Opened from a Farcaster channel.

```typescript
{
  type: "channel";
  channel: {
    key: string;
    name: string;
    imageUrl?: string;
  };
}
```

#### `notification`
Opened from a notification.

```typescript
{
  type: "notification";
  notification: {
    notificationId: string;
    title: string;
    body: string;
  };
}
```

#### `open_miniapp`
Opened from another mini-app.

```typescript
{
  type: "open_miniapp";
  referrerDomain: string;
}
```

#### `launcher`
Opened from the launcher/home screen.

```typescript
{
  type: "launcher";
}
```

## Context Propagation to Embedded Apps

When embedding mini-apps as Fidgets, context is provided via the **official SDK API** only.

**IMPORTANT**: The official Farcaster mini-app SDK provides context exclusively via `sdk.context`. The SDK uses Comlink to communicate with the parent window via postMessage.

### How It Works

1. **Mini-app imports SDK**: When a mini-app imports `@farcaster/miniapp-sdk`, the SDK uses `windowEndpoint(window.parent)` to communicate with the parent.

2. **SDK requests context**: The SDK sends postMessage requests to `window.parent` using Comlink RPC.

3. **Parent responds**: The parent window (Nounspace) listens for Comlink postMessage requests and responds with the transformed context.

4. **Mini-app accesses context**: The mini-app can then access context via `sdk.context`:

```javascript
// In embedded mini-app
import { sdk } from '@farcaster/miniapp-sdk';

const context = await sdk.context;
console.log('User:', context.user);
console.log('Location:', context.location);
console.log('Client:', context.client);
```

**Note**: The parent window must handle Comlink postMessage requests to provide context to embedded mini-apps. This is handled automatically by the IFrame component.

## Usage Examples

### Example 1: Accessing Context in a Component

```tsx
import { useMiniAppContext } from "@/common/providers/MiniAppContextProvider";

function MyComponent() {
  const { combinedContext } = useMiniAppContext();
  
  if (!combinedContext) {
    return <div>Loading context...</div>;
  }
  
  const { user, location, nounspace } = combinedContext;
  
  return (
    <div>
      <p>User: {user.displayName || user.username || `FID ${user.fid}`}</p>
      <p>Space: {nounspace.spaceContext.spaceId}</p>
      <p>Tab: {nounspace.spaceContext.tabName}</p>
      {location?.type === "cast_embed" && (
        <p>Embedded in cast: {location.cast.text}</p>
      )}
    </div>
  );
}
```

### Example 2: Location-Aware Navigation

```tsx
import { useLocationAwareNavigation } from "@/common/lib/hooks/useLocationAwareNavigation";

function SpaceHeader() {
  const { getLocationSummary, navigateFromContext } = useLocationAwareNavigation();
  
  useEffect(() => {
    navigateFromContext();
  }, []);
  
  return (
    <div>
      <p>Opened from: {getLocationSummary()}</p>
    </div>
  );
}
```

### Example 3: Building URLs with Context

```tsx
import { useMiniAppContext } from "@/common/providers/MiniAppContextProvider";

function ShareButton() {
  const { buildUrlWithContext } = useMiniAppContext();
  
  const handleShare = () => {
    const url = buildUrlWithContext("https://example.com/miniapp");
    // Share URL with context preserved
    navigator.clipboard.writeText(url);
  };
  
  return <button onClick={handleShare}>Share</button>;
}
```

### Example 4: Accessing Context in Embedded Mini-App

```javascript
// In embedded mini-app (iframe)
import { sdk } from '@farcaster/miniapp-sdk';

// Access context via official SDK API
const context = await sdk.context;

console.log("User:", context.user);
console.log("Location:", context.location);
console.log("Client:", context.client);
console.log("Features:", context.features);

// Check if in mini-app
const isInMiniApp = await sdk.isInMiniApp();
if (isInMiniApp) {
  // Use context...
}
```

## Debug Tools

### ContextDebugger

A development-only component that displays all available context data.

**Location**: `src/components/debug/ContextDebugger.tsx`

**Usage**:
```tsx
import { ContextDebugger } from "@/components/debug/ContextDebugger";

// Automatically included in PublicSpace (development only)
<ContextDebugger />
```

The debugger shows:
- SDK status (ready, errors)
- Raw SDK context
- Features context
- Host context
- Nounspace context
- Combined context
- Location details
- Quick summary (User FID, Space ID, Tab, Location Type, Platform)

**Note**: Only visible in development mode (`NODE_ENV === "development"`).

## Integration Points

### PublicSpace

`PublicSpace` is wrapped with `MiniAppContextProvider` and includes location-aware navigation:

```tsx
// src/app/(spaces)/PublicSpace.tsx
<LocationAwareSpaceWrapper>
  <MiniAppContextProvider {...props}>
    <SpacePage {...spaceProps} />
    <ContextDebugger /> {/* Dev only */}
  </MiniAppContextProvider>
</LocationAwareSpaceWrapper>
```

### PrivateSpace

`PrivateSpace` (Homebase) is also wrapped with `MiniAppContextProvider`:

```tsx
// src/app/(spaces)/homebase/PrivateSpace.tsx
<LocationAwarePrivateSpaceWrapper>
  <MiniAppContextProvider {...props}>
    <SpacePage {...spaceProps} />
  </MiniAppContextProvider>
</LocationAwarePrivateSpaceWrapper>
```

### IFrame Fidget

The `IFrame` fidget automatically provides context to embedded mini-apps via the official SDK API:

```tsx
// src/fidgets/ui/IFrame.tsx
// Context is provided via:
// - SDK API (sdk.context) - mini-apps import @farcaster/miniapp-sdk
// - SDK communicates with parent via Comlink/postMessage
// - Parent responds with transformed context
```

## Type Definitions

### TransformedMiniAppContext

Context format for embedded mini-apps (matches official SDK exactly):

```typescript
// TransformedMiniAppContext is an alias for the official SDK MiniAppContext
type TransformedMiniAppContext = Context.MiniAppContext;

// Which is:
type MiniAppContext = {
  user: UserContext;        // Required
  client: ClientContext;    // Required
  location?: LocationContext;  // Optional
  features?: ClientFeatures;   // Optional
};
```

**Note**: No custom extensions. Only official SDK fields are included.

### CombinedContext

Combined context available in Nounspace:

```typescript
type CombinedContext = {
  user: MiniAppContext["user"];
  location: MiniAppContext["location"] | undefined;
  client: MiniAppContext["client"];
  features: MiniAppContext["features"] | undefined;
  nounspace: NounspaceContext;
};
```

### NounspaceContext

Nounspace-specific context:

```typescript
type NounspaceContext = {
  spaceId: string;
  spaceHandle?: string;
  tabName?: string;
  spaceType?: string;
  isEditable?: boolean;
  ownerFid?: number;
  fidgetId?: string;
};
```

## Best Practices

1. **Always check for context availability**: Context may not be available immediately or in all environments.

```tsx
const { combinedContext } = useMiniAppContext();
if (!combinedContext) {
  return <Loading />;
}
```

2. **Use location-aware navigation**: Don't assume how the user arrived. Use `useLocationAwareNavigation` to handle different entry points.

3. **Use official SDK API**: Embedded mini-apps should use `sdk.context` from `@farcaster/miniapp-sdk` to access context.

5. **Type safety**: Always use the provided TypeScript types for context structures.

## Troubleshooting

### Context is null or undefined

- Ensure `MiniAppContextProvider` is wrapping your component
- Check that `MiniAppSdkProvider` is in the provider tree (should be at root)
- Verify the SDK is ready: `const { isReady } = useMiniAppSdk();`

### Embedded app not receiving context

- Verify the mini-app is importing `@farcaster/miniapp-sdk` correctly
- Check that the parent window is handling Comlink postMessage requests
- Check browser console for postMessage/Comlink errors
- Ensure iframe has `allow-same-origin` in sandbox (if using sandbox)
- Verify `sdk.context` resolves in the embedded mini-app

### Location context not working

- Verify the Farcaster client is providing location context
- Check `useMiniAppSdk().locationContext` to see what's available
- Use `ContextDebugger` to inspect all context layers

## Related Documentation

- [Farcaster Mini App SDK Documentation](https://docs.farcaster.xyz/mini-apps)
- [Base Mini Apps Documentation](https://docs.base.org/mini-apps)
- [Session Context Summary](./SESSION_CONTEXT.md) - Complete architecture overview

