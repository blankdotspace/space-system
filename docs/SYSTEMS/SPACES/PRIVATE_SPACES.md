# Private Spaces (Homebase)

This document describes the architecture of private spaces (homebase) including storage, encryption, identity management, and cross-community behavior.

## Overview

Every user has a **homebase** - a private, encrypted dashboard they can customize with fidgets and tabs. Unlike public spaces, homebase data is:

- **Encrypted** using XChaCha20-Poly1305
- **Signed** using Ed25519
- **Identity-scoped** - tied to a user's space identity, not a community

## Storage Architecture

### Location

Homebase data is stored in Supabase's private storage bucket:

```
{identityPublicKey}/
  ├── homebase              # Main homebase config (layout, theme)
  ├── homebaseTabOrder      # Tab ordering
  └── tabs/
      ├── {tabName1}        # Individual tab configs
      ├── {tabName2}
      └── ...
```

### File Format (SignedFile)

All homebase files are stored as `SignedFile` objects:

```typescript
interface SignedFile {
  publicKey: string;      // Identity public key (who encrypted it)
  fileData: string;       // Hex-encoded encrypted bytes
  fileType: string;       // "json"
  isEncrypted: boolean;   // true
  timestamp: string;      // ISO timestamp
  fileName?: string;      // Tab name (for tab files)
  signature: string;      // Ed25519 signature over the content
}
```

## Identity Model

### Space Identities

Each user wallet can have **multiple space identities**. An identity consists of:

```typescript
interface SpaceIdentity {
  rootKeys: {
    publicKey: string;    // Ed25519 public key (hex)
    privateKey: string;   // Ed25519 private key (hex)
    type: "root";
    salt: string;         // 32-byte random nonce
  };
  preKeys: PreSpaceKeys[];   // Ephemeral encryption keys
  associatedFids: number[];  // Linked Farcaster IDs
}
```

### Identity Isolation

```
User Wallet
  └── Identity A (publicKey: 0xabc...)
  │     └── Homebase A
  │           ├── Tab: Feed
  │           ├── Tab: Bookmarks
  │           └── Tab: Notes
  │
  └── Identity B (publicKey: 0xdef...)
        └── Homebase B (completely separate)
              ├── Tab: Dashboard
              └── Tab: Tokens
```

Each identity has its own:
- Root keys (for signing and encryption)
- Pre-keys (ephemeral, rotatable)
- Homebase configuration
- Tab layouts and fidget settings

## Encryption System

### Algorithm

- **Cipher**: XChaCha20-Poly1305 (symmetric AEAD)
- **Key Derivation**: HKDF with SHA256
- **Signing**: Ed25519
- **Hashing**: BLAKE3

### Key Derivation

Encryption keys are derived from the identity's private key and salt:

```typescript
function stringToCipherKey(privateKey: string, identitySalt: string): Uint8Array {
  return hkdf(sha256, privateKey, identitySalt, "", 32);
}

// Usage with identity
const key = stringToCipherKey(
  identity.rootKeys.privateKey,
  identity.rootKeys.salt  // 32-byte random nonce from identity
);
```

The `identitySalt` comes from the identity's `rootKeys.salt` field - a 32-byte random nonce generated when the identity is created. This ensures each identity derives unique encryption keys even if private keys were somehow similar.

### Two Key Types

1. **Root Keys** - Long-lived identity keys
   - Used for: Main homebase config, tab ordering
   - Storage: `{identityPublicKey}/keys/root/{walletAddress}` (encrypted per-wallet)

2. **Pre-Keys** - Ephemeral keys
   - Used for: Individual tab configs
   - Storage: `{identityPublicKey}/keys/pre/`
   - Can be rotated periodically for forward secrecy

### Encryption Flow

```
1. User saves homebase
   ↓
2. Data serialized to JSON
   ↓
3. Key derived: HKDF(SHA256, privateKey) → 32-byte key
   ↓
4. Encrypted: XChaCha20-Poly1305(key, data)
   ↓
5. Signed: Ed25519.sign(BLAKE3(content), privateKey)
   ↓
6. Uploaded as SignedFile to Supabase
```

### Decryption Flow

```
1. Fetch SignedFile from Supabase
   ↓
2. Verify signature: Ed25519.verify(signature, BLAKE3(content), publicKey)
   ↓
3. Lookup key: rootKeys or preKeys based on encryptingKey
   ↓
4. Decrypt: XChaCha20-Poly1305(key, encryptedData)
   ↓
5. Parse JSON, validate timestamps
```

## Cross-Community Behavior

### Key Principle: Identity-Scoped, Not Community-Scoped

Homebase is tied to an **identity**, not a **community**. This has important implications:

| Scenario | Behavior |
|----------|----------|
| Same identity on Community A and B | **Same homebase** - customizations follow the user |
| Different identity on Community A and B | **Different homebases** - completely isolated |
| Switch identities within a community | **Switches homebase** - loads the new identity's config |

### Why This Matters

1. **Privacy**: Communities cannot access each other's user homebases
2. **Portability**: A user's homebase follows their identity across communities
3. **Isolation**: Multiple identities allow complete separation when desired
4. **No Cross-Access**: Even with the same user, different identities are cryptographically separate

### Storage Path Independence

The storage path `{identityPublicKey}/homebase` contains no community identifier:

```
// Identity A's homebase - same path regardless of which community loads it
0xabc123.../homebase
0xabc123.../tabs/Feed
0xabc123.../tabs/Bookmarks

// Identity B's homebase - completely separate tree
0xdef456.../homebase
0xdef456.../tabs/Dashboard
```

## Security Properties

### What's Protected

| Property | Protection |
|----------|------------|
| Homebase content | Encrypted at rest (XChaCha20-Poly1305) |
| Data integrity | Signed (Ed25519 over BLAKE3 hash) |
| Authenticity | Signature verified before storage |
| Forward secrecy | Pre-keys can be rotated |

### What Communities Can See

- The **existence** of a homebase (storage path)
- The **public key** of the identity
- The **encrypted blob** (unreadable without private key)
- The **timestamp** of last modification

### What Communities Cannot See

- Homebase content (fidgets, layouts, tabs)
- Tab names or structure
- Any decrypted data
- Private keys

## API Endpoints

### Save Homebase

```
POST /api/space/homebase
Body: SignedFile (encrypted homebase config)
```

### Load Homebase

Private buckets require authenticated access. Use one of these methods:

**Option 1: Time-limited signed URL**
```typescript
// Creates a temporary URL valid for the specified duration
const { data, error } = await supabase.storage
  .from("private")
  .createSignedUrl("{identityKey}/homebase", 60); // expires in 60 seconds

const response = await fetch(data.signedUrl);
```

**Option 2: Authenticated download (requires user JWT)**
```typescript
// Direct download with authenticated client
const { data, error } = await supabase.storage
  .from("private")
  .download("{identityKey}/homebase");
```

Note: `getPublicUrl()` does not work for private buckets - it only generates URLs for public buckets. Always use `createSignedUrl()` for time-limited access or `download()` with an authenticated Supabase client.

### Manage Tabs

```
POST /api/space/homebase/tabs
Body: { type: "create" | "delete", ...SignedFile }
```

## Cryptographic Libraries

| Library | Purpose |
|---------|---------|
| `@noble/curves/ed25519` | Ed25519 signing/verification |
| `@noble/ciphers/chacha` | XChaCha20-Poly1305 encryption |
| `@noble/hashes/blake3` | BLAKE3 hashing |
| `@noble/hashes/hkdf` | HKDF key derivation |
| `@noble/hashes/sha256` | SHA256 for HKDF |

## Related Documentation

- [Spaces Overview](OVERVIEW.md) - All space types
- [Space Architecture](SPACE_ARCHITECTURE.md) - Technical implementation
- [State Management](../../ARCHITECTURE/STATE_MANAGEMENT.md) - Store architecture
