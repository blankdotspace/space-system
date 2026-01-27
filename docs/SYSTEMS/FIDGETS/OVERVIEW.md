# Fidgets

Fidgets are the tools that power community spaces. They're modular widgets that communities can add to their spaces for governance, token management, social feeds, and more.

## Available Fidgets

### Social & Farcaster

| Fidget | Description |
|--------|-------------|
| **Feed** | Farcaster feed (channel, user, or custom) |
| **Cast** | Display a single cast |
| **Channel** | Channel-specific feed |
| **Chat** | Real-time chat |
| **Top8** | Show top community members |
| **Builder Score** | Talent Protocol builder scores |
| **Frame** | Embed Farcaster frames |
| **Frames V2** | Next-gen frame support |

### Token & DeFi

| Fidget | Description |
|--------|-------------|
| **Market** | Token price and market data |
| **Swap** | Token swap widget |
| **CowSwap** | CowSwap integration |
| **Uniswap** | Uniswap swap widget |
| **Portfolio** | Token portfolio display |
| **Clanker Manager** | Manage Clanker tokens |
| **Empire Builder** | Empire token tools |
| **Levr** | Levr integration |
| **Directory** | Token directory |
| **Zora Coins** | Zora coin display |

### Governance

| Fidget | Description |
|--------|-------------|
| **Governance** | Nounish governance proposals and voting |
| **Snapshot** | Snapshot proposal integration |
| **Nouns Home** | Nouns DAO dashboard |

### Content & Media

| Fidget | Description |
|--------|-------------|
| **Text** | Rich text content |
| **Gallery** | Image gallery |
| **Video** | Video player |
| **Links** | Link list / link tree |
| **RSS** | RSS feed display |
| **Luma** | Luma event integration |
| **IFrame** | Embed any website |

## Adding Fidgets

Space editors can add fidgets through the fidget picker:

1. Enter edit mode
2. Click "Add Fidget" or the + button
3. Browse by category or search
4. Click a fidget to add it
5. Configure settings
6. Drag to position (desktop) or reorder (mobile)

## Fidget Sources

The fidget picker pulls from multiple sources:

| Source | Description |
|--------|-------------|
| **Built-in Fidgets** | Core fidgets shipped with Blankspace |
| **Curated Sites** | Pre-configured iframe fidgets for popular services |
| **Mini-Apps** | Farcaster mini-apps via the Neynar API |

## Fidget Settings

Each fidget has configurable settings. Common settings include:

- **Title** - Display name
- **Data source** - What content to show (e.g., which channel, which token)
- **Display options** - How to render the content
- **Styling** - Colors, sizes, borders

## Who Can Add Fidgets?

Anyone who can edit a space can add, remove, and configure fidgets. See [Spaces](../SPACES/OVERVIEW.md) for edit permissions.

## Building Custom Fidgets

Fidgets are React components that follow a standard interface:

```typescript
const MyFidget: FidgetModule<MyFidgetArgs> = {
  Component: ({ config, properties, theme, onSave }) => {
    return (
      <div>
        {/* Your fidget UI */}
      </div>
    );
  },
  properties: {
    fidgetName: "My Fidget",
    description: "What this fidget does",
    fields: [
      {
        fieldName: "title",
        type: "string",
        default: "Default Title",
        label: "Title"
      }
    ],
    category: "community",
    tags: ["custom"],
  }
};
```

For technical details on fidget development, see:
- [Fidget Picker](./FIDGET_PICKER.md) - How the picker discovers fidgets
- [Data Field Patterns](./DATA_FIELD_PATTERNS.md) - Fidget configuration patterns

## Community Tool Ideas

Fidgets are how communities add functionality. Some ideas:

- **Membership gates** - Show content based on token holdings
- **Bounty boards** - Track community bounties
- **Event calendars** - Upcoming community events
- **Leaderboards** - Community engagement metrics
- **Treasury displays** - Show DAO treasury balances
- **Voting widgets** - Quick governance actions
- **Member directories** - Who's in the community
- **Announcement boards** - Important community updates
