# Space Architecture

Spaces are the core organizational unit in Blankspace, representing customizable hubs that users can personalize with themes, tabs, and fidgets.

## Overview

```
┌─────────────────────┐           ┌─────────────────────┐
│   Public Spaces     │           │   Private Spaces    │
│  (Server + Client)  │           │   (Homebase)        │
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

## Space Types

| Type | Route | Editable By |
|------|-------|-------------|
| **Profile** | `/s/[handle]` | Space owner (FID match) |
| **Token** | `/t/[network]/[address]` | Contract deployer |
| **Proposal** | `/p/[proposalId]` | Proposal creator |
| **Channel** | `/c/[channelId]` | Channel moderators |
| **NavPage** | `/[navSlug]` | Admin identity keys |

## Public vs Private

| Aspect | Public Spaces | Private Spaces (Homebase) |
|--------|--------------|---------------------------|
| Access | Read-only for most | Full editing for owner |
| Rendering | Server-rendered initial | Client-side only |
| Storage | Unencrypted | Encrypted |
| State | Server-synced | Optimistic updates |

## Data Flow

### Public Space Flow

```
Server (page.tsx)  →  TypeSpace (adds isEditable)  →  PublicSpace (renders)
```

### Private Space Flow

```
Zustand Store  ←→  PrivateSpace  →  SpacePage
```

## Configuration

```typescript
interface SpaceConfig {
  fidgetInstanceDatums: Record<string, FidgetInstanceData>;
  layoutID: string;
  layoutDetails: LayoutFidgetDetails;
  fidgetTrayContents: string[];
  theme?: ThemeSettings;
  tabNames?: string[];
}
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/(spaces)/PublicSpace.tsx` | Public space component |
| `src/app/(spaces)/homebase/PrivateSpace.tsx` | Private space component |
| `src/common/data/stores/app/space/spaceStore.ts` | Public space store |
| `src/common/data/stores/app/homebase/homebaseStore.ts` | Private space store |
| `src/common/types/spaceData.ts` | Type definitions |

## Related

- [Public Spaces Pattern](./spaces-public.md) - Detailed implementation
- [Configuration](./configuration.md) - NavPage space configuration
