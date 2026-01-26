# Permissions & Access Control

This document explains who can view and edit different parts of Blankspace.

## Overview

Blankspace has two types of spaces:

1. **Private Spaces** (Homebase) - Only you can see and edit
2. **Public Spaces** - Anyone can view, but only specific people can edit

The "Edit" button only appears when you have permission to modify a space.

## Private Space (Homebase)

Your homebase is your personal dashboard at `/homebase`.

| Action | Who can do it |
|--------|---------------|
| View | Only you (encrypted) |
| Edit | Only you |
| Delete | Only you |

**How it works:** Your homebase data is encrypted with your identity key. No one else can read or modify it.

## Public Spaces

Public spaces are viewable by anyone but have specific ownership rules.

### Profile Spaces

**URL Pattern:** `/s/[handle]` (e.g., `/s/alice`)

| Action | Who can do it |
|--------|---------------|
| View | Anyone |
| Edit | The Farcaster account owner |

**How ownership is determined:**
1. Your Farcaster FID (Farcaster ID) is checked
2. If your FID matches the profile's FID, you can edit

**Example:** If you're logged in as `@alice` (FID 12345), you can edit `/s/alice` but not `/s/bob`.

### Token Spaces

**URL Pattern:** `/t/[network]/[contractAddress]` (e.g., `/t/base/0x1234...`)

| Action | Who can do it |
|--------|---------------|
| View | Anyone |
| Edit | Token owner (see below) |

**How ownership is determined (checked in order):**
1. **Database registration** - If your FID registered this space
2. **Wallet ownership** - If your connected wallet deployed the contract
3. **Clanker creator** - If you created the token via Clanker
4. **Identity key** - If you claimed ownership via the registration system

**Note:** For Empire tokens, the Empire owner address is also checked.

### Channel Spaces

**URL Pattern:** `/c/[channelId]` (e.g., `/c/farcaster`)

| Action | Who can do it |
|--------|---------------|
| View | Anyone |
| Edit | Channel moderators |

**How ownership is determined:**
1. The channel's moderator list is fetched from Farcaster
2. If your FID is in the moderator list, you can edit

### Proposal Spaces

**URL Pattern:** `/p/[proposalId]` (e.g., `/p/123`)

| Action | Who can do it |
|--------|---------------|
| View | Anyone |
| Edit | Proposal creator |

**How ownership is determined:**
1. Your connected wallet is checked
2. If it matches the proposal creator's wallet, you can edit

### Navigation Pages (Community Pages)

**URL Pattern:** `/[navSlug]` (e.g., `/about`, `/team`)

| Action | Who can do it |
|--------|---------------|
| View | Anyone |
| Edit | Community admins |

**How ownership is determined:**
1. The community config defines a list of admin identity public keys
2. If your identity public key is in that list, you can edit

## Fidgets

Anyone who can edit a space can:
- Add new fidgets
- Remove existing fidgets
- Rearrange fidgets
- Configure fidget settings

Fidgets inherit the space's edit permissions.

## Themes

Anyone who can edit a space can:
- Change the theme colors
- Modify fonts and backgrounds
- Inject custom CSS/HTML (if enabled)

## Tabs

Anyone who can edit a space can:
- Create new tabs
- Delete tabs (except protected default tabs)
- Rename tabs
- Reorder tabs

## How Authentication Works

Blankspace uses a combination of:

1. **Privy** - Wallet-based authentication
2. **Farcaster** - Social identity (FID)
3. **Identity Keys** - Cryptographic keys for ownership claims

When you log in:
1. You connect your wallet via Privy
2. Optionally link your Farcaster account
3. An identity key pair is generated for you
4. This identity is used to verify ownership across spaces

## Technical Details

For developers, here's how editability is checked in code:

```typescript
// Profile spaces check FID ownership
const isProfileSpaceEditable = (
  spaceOwnerFid: number,
  currentUserFid: number,
  spaceIdentityPublicKey?: string,
  currentUserIdentityPublicKey?: string
): boolean => {
  // Check FID match
  if (currentUserFid === spaceOwnerFid) return true;
  
  // Check identity key ownership
  if (spaceIdentityPublicKey === currentUserIdentityPublicKey) return true;
  
  return false;
};

// Token spaces have multiple ownership paths
const isTokenSpaceEditable = (
  spaceOwnerFid: number,
  spaceOwnerAddress: Address,
  tokenData: TokenData,
  currentUserFid: number,
  wallets: Wallet[],
  spaceIdentityPublicKey?: string,
  currentUserIdentityPublicKey?: string
): boolean => {
  // Check FID from database registration
  if (currentUserFid === spaceOwnerFid) return true;
  
  // Check wallet ownership
  if (wallets.some(w => w.address === spaceOwnerAddress)) return true;
  
  // Check Clanker requestor
  if (currentUserFid === tokenData.clankerData?.requestor_fid) return true;
  
  // Check identity key
  if (spaceIdentityPublicKey === currentUserIdentityPublicKey) return true;
  
  return false;
};
```

## Common Questions

**Q: Why can't I edit my token's space?**
A: Make sure you're logged in with the same wallet that deployed the token, or the same Farcaster account that created it via Clanker.

**Q: How do I become a channel moderator?**
A: Channel moderation is managed on Farcaster itself, not in Blankspace. Once you're a moderator on Farcaster, you'll automatically have edit access.

**Q: Can I transfer ownership of a space?**
A: Currently, space ownership follows the underlying asset (token contract, Farcaster account, etc.). You can't directly transfer space ownership without transferring the underlying asset.

**Q: What if multiple people have edit access?**
A: The last save wins. There's no real-time collaboration - if two people edit simultaneously, one will overwrite the other.

