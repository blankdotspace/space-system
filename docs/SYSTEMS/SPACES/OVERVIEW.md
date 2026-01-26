# Spaces

Spaces are customizable pages in Blankspace. Each space can have multiple tabs, and each tab contains fidgets arranged in a layout.

## Space Types

### Homebase (Private Space)

Your homebase is your personal dashboard at `/homebase`. It's private and encrypted - only you can see and edit it.

**URL:** `/homebase`

**Who can edit:** Only you

**Features:**
- Fully customizable with any fidgets
- Multiple tabs for organization
- Encrypted storage (no one else can see it)
- Your personal feed and dashboard

---

### Profile Spaces

Profile spaces are public pages for Farcaster users.

**URL:** `/s/[handle]` (e.g., `/s/alice`)

**Who can edit:** The Farcaster account owner

If you're logged in as `@alice`, you can edit `/s/alice`. You cannot edit someone else's profile space.

**Default tabs:** Profile, with ability to add custom tabs

---

### Token Spaces

Token spaces are pages for tokens deployed on supported networks.

**URL:** `/t/[network]/[contractAddress]` (e.g., `/t/base/0x1234...`)

**Who can edit:** Any of the following:
- The wallet that deployed the token contract
- The person who created the token via Clanker (matched by Farcaster ID)
- The Empire token owner (for Empire tokens)
- Anyone who has registered ownership via the space registration system

**Default tabs:** Token, with ability to add custom tabs

---

### Channel Spaces

Channel spaces are pages for Farcaster channels.

**URL:** `/c/[channelId]` (e.g., `/c/farcaster`)

**Who can edit:** Channel moderators

Moderation is managed on Farcaster itself. If you're a moderator of a channel on Farcaster, you can edit its space in Blankspace.

**Default tabs:** Channel feed, with ability to add custom tabs

---

### Proposal Spaces

Proposal spaces are pages for governance proposals.

**URL:** `/p/[proposalId]`

**Who can edit:** The proposal creator (matched by wallet address)

**Default tabs:** Proposal details, with ability to add custom tabs

---

### Navigation Pages

Navigation pages are custom community pages defined in the community configuration.

**URL:** `/[slug]` (e.g., `/about`, `/team`)

**Who can edit:** Community admins (defined by identity public keys in community config)

These pages are configured per-community and appear in the navigation.

---

## Space Components

Every space consists of:

| Component | Description |
|-----------|-------------|
| **Tabs** | Pages within the space (e.g., "Profile", "Gallery") |
| **Fidgets** | Mini-apps placed within tabs |
| **Theme** | Colors, fonts, backgrounds, custom CSS |
| **Layout** | How fidgets are arranged (grid on desktop, stack on mobile) |

## How Editing Works

When you have edit permission for a space:

1. An "Edit" button appears
2. Click it to enter edit mode
3. Add/remove/rearrange fidgets
4. Customize the theme
5. Add or modify tabs
6. Save your changes

Changes are saved to the server and visible to anyone viewing the space.

## Storage

| Space Type | Storage Location | Encryption |
|------------|------------------|------------|
| Homebase | `private/{identityKey}/` | Yes |
| Public Spaces | `spaces/{spaceId}/` | No |

## Related Documentation

- [Space Architecture](SPACE_ARCHITECTURE.md) - Technical deep-dive on how spaces work
- [Public Spaces Pattern](PUBLIC_SPACES_PATTERN.md) - How public space data flows
- [Multiple Layouts](MULTIPLE_LAYOUTS_OVERVIEW.md) - Desktop and mobile layout system
