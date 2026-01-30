# Spaces

Spaces are the pages that make up a community's presence on Blankspace. Each community can have multiple types of spaces - for their token, their members, their channel, and custom pages.

## Space Types

### Homebase (Private)

Every community member gets their own private homebase - a personal dashboard they can customize. Homebase data is **end-to-end encrypted** and tied to the user's space identity, not the community.

**URL:** `/homebase`

**Who can edit:** Only the owner (encrypted, private)

**Key properties:**
- Encrypted with XChaCha20-Poly1305
- Signed with Ed25519
- Tied to identity, not community (follows user across communities)
- Multiple identities = multiple separate homebases

**Use cases:**
- Personal feed dashboard
- Bookmarked communities and tokens
- Private notes and links

See [Private Spaces](PRIVATE_SPACES.md) for detailed architecture, encryption, and cross-community behavior.

---

### Profile Spaces

Profile spaces are public pages for Farcaster users and community members.

**URL:** `/s/[handle]` (e.g., `/s/alice`)

**Who can edit:** The Farcaster account owner

**Use cases:**
- Member profiles
- Creator portfolios
- Personal branding

---

### Token Spaces

Token spaces are the home for token communities - where holders gather, trade, and engage.

**URL:** `/t/[network]/[contractAddress]` (e.g., `/t/base/0x1234...`)

**Who can edit:**
- The wallet that deployed the token contract
- The Clanker token creator
- The Empire token owner
- Registered space owners

**Use cases:**
- Token landing pages
- Holder feeds and chat
- Swap widgets and market data
- Governance and proposals

---

### Channel Spaces

Channel spaces are pages for Farcaster channels - perfect for topic-based communities.

**URL:** `/c/[channelId]` (e.g., `/c/base`)

**Who can edit:** Channel moderators (from Farcaster)

**Use cases:**
- Channel feeds
- Community resources
- Event listings
- Member spotlights

---

### Proposal Spaces

Proposal spaces give governance proposals their own dedicated page.

**URL:** `/p/[proposalId]`

**Who can edit:** The proposal creator (by wallet)

**Use cases:**
- Proposal details and discussion
- Voting widgets
- Related resources

---

### Navigation Pages

Custom pages defined by community admins - for about pages, team pages, resources, etc.

**URL:** `/[slug]` (e.g., `/about`, `/team`, `/resources`)

**Who can edit:** Community admins (defined in community config)

**Use cases:**
- About pages
- Team directories
- Resource libraries
- Custom landing pages

---

## What's In a Space?

Every space contains:

| Component | Description |
|-----------|-------------|
| **Tabs** | Multiple pages within the space |
| **Fidgets** | Community tools arranged in each tab |
| **Theme** | Visual branding (colors, fonts, backgrounds) |
| **Layout** | Grid (desktop) or stack (mobile) arrangement |

## Creating a Space

Spaces are created automatically when someone visits a URL:
- `/s/alice` creates Alice's profile space (if it doesn't exist)
- `/t/base/0x...` creates a token space
- `/c/farcaster` creates a channel space

The first person with edit permission can customize the space.

## Editing a Space

1. Visit the space
2. If you have permission, you'll see an "Edit" button
3. Enter edit mode to:
   - Add/remove/configure fidgets
   - Create/rename/delete tabs
   - Customize the theme
4. Save your changes

Changes are saved to the server and visible to all visitors.

## Storage

| Space Type | Where it's stored | Encrypted? |
|------------|-------------------|------------|
| Homebase | `private/{identityKey}/` | Yes |
| All public spaces | `spaces/{spaceId}/` | No |

## Related Documentation

- [Private Spaces](PRIVATE_SPACES.md) - Homebase encryption and cross-community behavior
- [Space Architecture](SPACE_ARCHITECTURE.md) - Technical implementation details
- [Public Spaces Pattern](PUBLIC_SPACES_PATTERN.md) - Server/client data flow
- [Multiple Layouts](MULTIPLE_LAYOUTS_OVERVIEW.md) - Desktop and mobile layouts
