# Mini-App Context Format Validation

## Overview

This document validates that our context implementation matches the official Farcaster Mini-App SDK requirements.

## Official SDK Types (from `@farcaster/miniapp-core`)

### UserContext
```typescript
export type UserContext = {
  fid: number;                    // REQUIRED
  username?: string;              // Optional
  displayName?: string;           // Optional
  pfpUrl?: string;                // Optional
  location?: AccountLocation;     // Optional
}
```

### ClientContext
```typescript
export type ClientContext = {
  platformType?: MiniAppPlatformType;  // Optional ('web' | 'mobile')
  clientFid: number;                    // REQUIRED
  added: boolean;                       // REQUIRED
  notificationDetails?: MiniAppNotificationDetails;  // Optional
  safeAreaInsets?: SafeAreaInsets;      // Optional
}
```

### MiniAppContext
```typescript
export type MiniAppContext = {
  client: ClientContext;    // REQUIRED
  user: UserContext;        // REQUIRED
  location?: LocationContext;  // Optional
  features?: ClientFeatures;   // Optional
}
```

## Our Implementation

### TransformedMiniAppContext

Our `TransformedMiniAppContext` type is an alias for the official SDK `MiniAppContext`:

```typescript
// TransformedMiniAppContext matches the official SDK exactly
export type TransformedMiniAppContext = Context.MiniAppContext;

// Which is:
type MiniAppContext = {
  user: UserContext;        // ✅ Required
  client: ClientContext;    // ✅ Required
  location?: LocationContext;  // ✅ Optional
  features?: ClientFeatures;   // ✅ Optional
}
```

**Note**: No custom extensions. Only official SDK fields are included.

### Validation in `transformForEmbedded()`

We now validate that required fields are present:

1. **User Context**: Must have either `hostContext.user` or `fallbackUser`
   - ✅ Validates `fid` is present (required by SDK)

2. **Client Context**: Must have either `hostContext.client` or `fallbackClient`
   - ✅ Validates `clientFid` is present (required by SDK)
   - ✅ Validates `added` is present (required by SDK)

3. **Location & Features**: Optional fields, can be null/undefined
   - ✅ Correctly handled as optional

## Context Delivery Method

### Official SDK API (sdk.context)

Context is provided exclusively via the official SDK API. The SDK uses Comlink to communicate with the parent window via postMessage.

**How it works:**
1. Mini-app imports `@farcaster/miniapp-sdk`
2. SDK uses `windowEndpoint(window.parent)` to communicate with parent
3. SDK sends Comlink postMessage requests for context
4. Parent window (Nounspace) responds with transformed context
5. Mini-app accesses context via `sdk.context`

```javascript
// In embedded mini-app
import { sdk } from '@farcaster/miniapp-sdk';

const context = await sdk.context;
console.log('User:', context.user);
console.log('Location:', context.location);
```

**Note**: This is the only supported method. No custom extensions or alternative methods are used.

## Compliance Checklist

### ✅ Required Fields
- [x] `user.fid` - Always provided (from host or fallback)
- [x] `client.clientFid` - Always provided (from host or fallback)
- [x] `client.added` - Always provided (from host or fallback)

### ✅ Optional Fields
- [x] `user.username` - Optional, may be undefined
- [x] `user.displayName` - Optional, may be undefined
- [x] `user.pfpUrl` - Optional, may be undefined
- [x] `client.platformType` - Optional, may be undefined
- [x] `location` - Optional, can be null
- [x] `features` - Optional, may be undefined

### ✅ Type Safety
- [x] All types match official SDK types exactly
- [x] Required fields are validated before creating context
- [x] Optional fields are correctly typed as optional

### ✅ Fallback Support
- [x] Provides fallback `UserContext` when host doesn't provide it
- [x] Provides fallback `ClientContext` when host doesn't provide it
- [x] Returns `null` if required fields cannot be provided

## Potential Issues

### 1. Comlink Communication
**Issue**: The SDK uses Comlink to communicate with the parent via postMessage. The parent window must handle these Comlink requests.

**Impact**: If the parent window doesn't handle Comlink messages correctly, embedded mini-apps won't receive context.

**Mitigation**: 
- Ensure the parent window listens for Comlink postMessage requests
- Respond with the transformed context in the correct Comlink format
- Test with actual mini-apps to verify communication works

### 2. Missing User Details
**Issue**: When using fallback context, we only provide `fid`, not `username`, `displayName`, or `pfpUrl`.

**Impact**: Embedded mini-apps may not have full user information.

**Mitigation**:
- Consider fetching user details from Neynar API when fallback is used
- Document that full user info is only available when running in a mini-app host

### 3. Client Context Assumptions
**Issue**: In fallback mode, we set `added: false` and use user's FID as `clientFid`.

**Impact**: May not accurately represent the actual client state.

**Mitigation**:
- Document this limitation
- Consider if we can detect actual client state

## Recommendations

1. **Handle Comlink Messages**: Ensure the parent window properly handles Comlink postMessage requests from embedded mini-apps.

2. **Enhance Fallback Context**: When in standalone mode, fetch additional user details from Neynar API to provide richer context.

3. **Documentation**: Create clear documentation for embedded mini-app developers on how to use the official SDK API.

4. **Testing**: Test with actual mini-apps to verify that context is properly provided via the SDK API.

## Conclusion

Our implementation correctly follows the official SDK type requirements. All required fields are validated and provided. Context is delivered exclusively via the official SDK API (`sdk.context`), which uses Comlink to communicate with the parent window via postMessage. No custom extensions or alternative methods are used.

