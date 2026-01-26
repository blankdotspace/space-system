# Authentication System

The Blankspace authentication system combines Privy for wallet-based authentication with Farcaster for social identity, creating a seamless Web3 social experience.

## Architecture Overview

The authentication system consists of several key components:

- **Privy Integration** - Primary authentication provider
- **Farcaster Integration** - Social identity and protocol access
- **Identity Management** - Multi-identity support with cryptographic keys
- **Authenticator System** - Modular authentication methods

## Core Components

### 1. Privy Integration

Privy handles the primary authentication flow:

```typescript
// Privy store manages user state
interface PrivyState {
  privyUser?: PrivyUser | null;
}

interface PrivyActions {
  setPrivyUser: (user: PrivyUser | null) => void;
}
```

**Key Features:**
- Wallet connection (MetaMask, WalletConnect, etc.)
- Social login options
- User session management
- Multi-wallet support

### 2. Farcaster Integration

Farcaster provides social identity and protocol access:

```typescript
// Farcaster store manages FID linking
type FarcasterActions = {
  getFidsForCurrentIdentity: () => Promise<void>;
  registerFidForCurrentIdentity: (
    fid: number,
    signingKey: string,
    signMessage: (messageHash: Uint8Array) => Promise<Uint8Array>,
  ) => Promise<void>;
  setFidsForCurrentIdentity: (fids: number[]) => void;
  addFidToCurrentIdentity: (fid: number) => void;
};
```

**Key Features:**
- FID (Farcaster ID) linking to identities
- Cryptographic signature verification
- Social graph access
- Cast and interaction capabilities

### 3. Identity Management

The system supports multiple identities per user:

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

**Identity Features:**
- Multiple space identities
- Cryptographic key management
- Identity switching
- Secure key storage

### 4. Authenticator System

Modular authentication methods for different services:

```typescript
// Authenticator manager handles method calls
const authenticatorManager = useMemo<AuthenticatorManager>(() => ({
  callMethod: async (
    { requestingFidgetId, authenticatorId, methodName, isLookup = false },
    ...args
  ): Promise<AuthenticatorManagerResponse> => {
    // Handle authenticator method calls
  },
  getInitializedAuthenticators: () => {
    // Return available authenticators
  }
}));
```

## Authentication Flow

### 1. Initial Setup

1. **User connects wallet** via Privy
2. **Identity creation** with cryptographic keys
3. **Farcaster linking** (optional)
4. **Authenticator setup** for services

### 2. Farcaster Integration

```typescript
// Register FID for current identity
const registerFidForCurrentIdentity = async (
  fid: number,
  signingKey: string,
  signMessage: (messageHash: Uint8Array) => Promise<Uint8Array>,
) => {
  const request: Omit<FidLinkToIdentityRequest, "signature"> = {
    fid,
    identityPublicKey: get().account.currentSpaceIdentityPublicKey!,
    timestamp: moment().toISOString(),
    signingPublicKey: signingKey,
  };
  
  const signedRequest: FidLinkToIdentityRequest = {
    ...request,
    signature: bytesToHex(await signMessage(hashObject(request))),
  };
  
  // Submit to backend
  const { data } = await axiosBackend.post<FidLinkToIdentityResponse>(
    "/api/fid-link",
    signedRequest,
  );
};
```

### 3. Identity Management

```typescript
// Identity store manages multiple identities
interface IdentityStore {
  spaceIdentities: SpaceIdentity[];
  currentSpaceIdentityPublicKey: string | null;
  getCurrentIdentity: () => SpaceIdentity | null;
  getCurrentIdentityIndex: () => number;
  setCurrentSpaceIdentityPublicKey: (key: string | null) => void;
}
```

## Security Considerations

### 1. Cryptographic Security

- **Key Generation**: Secure random key generation
- **Key Storage**: Encrypted local storage
- **Signature Verification**: Cryptographic signature validation
- **Key Rotation**: Support for key updates

### 2. Privacy Protection

- **Local Storage**: Sensitive data stored locally
- **Encryption**: Keys encrypted with user wallet
- **No Central Storage**: No centralized key storage

### 3. Access Control

- **Permission System**: Fidget-level permissions
- **Method Authorization**: Authenticator method access control
- **Identity Verification**: Cryptographic identity verification

## API Integration

### FID Linking

```typescript
// Link Farcaster FID to identity
POST /api/fid-link
{
  "fid": number,
  "identityPublicKey": string,
  "timestamp": string,
  "signingPublicKey": string,
  "signature": string
}
```

### Identity Management

```typescript
// Get FIDs for identity
GET /api/fid-link?identityPublicKey={key}
```

## Development Patterns

### 1. Adding New Authenticators

```typescript
// Create authenticator in src/authenticators/
export const newAuthenticator = (config: AuthenticatorConfig) => ({
  methods: {
    methodName: async (params) => {
      // Implementation
    }
  }
});
```

### 2. Using Authenticators in Fidgets

```typescript
// Access authenticator in fidget
const { callMethod } = useAuthenticatorManager();

const result = await callMethod({
  requestingFidgetId: 'my-fidget',
  authenticatorId: 'farcaster:nounspace',
  methodName: 'getUserInfo'
});
```

### 3. Permission Management

```typescript
// Check permissions before calling methods
const hasPermission = authenticatorConfig[authenticatorId]
  .permissions[requestingFidgetId]?.includes(methodName);
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**: Check Privy configuration
2. **FID Linking Issues**: Verify Farcaster integration
3. **Permission Denied**: Check authenticator permissions
4. **Key Management**: Ensure proper key storage

### Debug Tools

- Use React DevTools to inspect store state
- Check browser console for authentication errors
- Verify environment variables are set correctly
- Test with different wallet providers

## Future Considerations

- Enhanced permission system
- Multi-chain identity support
- Advanced key management
- Social recovery mechanisms
