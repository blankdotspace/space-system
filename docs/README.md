# Blankspace Documentation

**Blankspace is a customizable Farcaster client where you can create personalized spaces for yourself, your community, or your token.**

## What is Blankspace?

Think of Blankspace like customizable web pages for the Farcaster ecosystem. Instead of a one-size-fits-all social feed, you get:

- **Your own space** (homebase) that you can customize however you want
- **Public spaces** for your Farcaster profile, tokens, channels, and governance proposals
- **Mini-apps called Fidgets** that you can add to any space
- **Themes** to change colors, fonts, backgrounds, and more

## Quick Concepts

| Concept | What it is | Example |
|---------|-----------|---------|
| **Space** | A customizable page with tabs and widgets | Your profile page, a token's landing page |
| **Homebase** | Your private, personal space | Your custom feed dashboard |
| **Fidget** | A mini-app you can add to spaces | A Farcaster feed, swap widget, gallery |
| **Tab** | A page within a space | "Profile", "Gallery", "Links" |
| **Theme** | Visual styling for a space | Colors, fonts, backgrounds |

## Who Can Edit What?

Different types of spaces have different ownership rules:

### Your Homebase (Private Space)
**Only you can edit it.** Your homebase is private and encrypted. It's your personal dashboard.

### Profile Spaces (`/s/username`)
**The Farcaster account owner can edit it.** If you own `@alice` on Farcaster, you can edit the space at `/s/alice`.

### Token Spaces (`/t/base/0x...`)
**Multiple people may have edit access:**
- The wallet that deployed the token contract
- The person who created the token via Clanker (if applicable)
- Anyone who has claimed ownership via the registration system

### Channel Spaces (`/c/channelname`)
**Channel moderators can edit it.** If you're a moderator of `/farcaster`, you can edit `/c/farcaster`.

### Proposal Spaces (`/p/proposalId`)
**The proposal creator's wallet can edit it.**

### Navigation Pages (`/pagename`)
**Community admins can edit these.** These are custom pages defined by the community configuration.

## Getting Started

- **[Local Development Setup](GETTING_STARTED.md)** - Run Blankspace locally
- **[Project Structure](PROJECT_STRUCTURE.md)** - How the codebase is organized
- **[Contributing](CONTRIBUTING.md)** - How to contribute

## Architecture

- **[Architecture Overview](ARCHITECTURE/OVERVIEW.md)** - High-level system design
- **[Authentication](ARCHITECTURE/AUTHENTICATION.md)** - How login works (Privy + Farcaster)
- **[State Management](ARCHITECTURE/STATE_MANAGEMENT.md)** - How data flows through the app

## Core Systems

### Spaces
Spaces are the main organizational unit. Each space has tabs, and each tab can contain fidgets arranged in a layout.

- **[Space Overview](SYSTEMS/SPACES/OVERVIEW.md)** - Core concepts
- **[Space Architecture](SYSTEMS/SPACES/SPACE_ARCHITECTURE.md)** - Technical deep-dive
- **[Public vs Private](SYSTEMS/SPACES/PUBLIC_SPACES_PATTERN.md)** - How public and private spaces differ

### Fidgets
Fidgets are the building blocks you add to spaces. There are fidgets for feeds, galleries, swaps, governance, and more.

- **[Fidget Overview](SYSTEMS/FIDGETS/OVERVIEW.md)** - What fidgets are available
- **[Fidget Picker](SYSTEMS/FIDGETS/FIDGET_PICKER.md)** - How users discover and add fidgets
- **[Data Patterns](SYSTEMS/FIDGETS/DATA_FIELD_PATTERNS.md)** - How fidget data is structured

### Themes
Themes control the visual appearance of spaces - colors, fonts, backgrounds, and custom CSS/HTML injection.

- **[Theme System](SYSTEMS/THEMES/OVERVIEW.md)** - How theming works

### Navigation
Communities can define custom navigation and pages.

- **[Navigation System](SYSTEMS/NAVIGATION/OVERVIEW.md)** - Custom navigation for communities

### Configuration
The multi-tenant configuration system allows different communities to have their own branding and settings.

- **[Configuration System](SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW.md)** - Database-backed community configs

## Integrations

- **[Farcaster](INTEGRATIONS/FARCASTER.md)** - Social protocol integration
- **[Supabase](INTEGRATIONS/SUPABASE.md)** - Database and storage

## Development

- **[Development Guide](DEVELOPMENT/DEVELOPMENT_GUIDE.md)** - Comprehensive dev guide
- **[Coding Standards](DEVELOPMENT/CODING_STANDARDS.md)** - Code style
- **[Testing](DEVELOPMENT/TESTING.md)** - Test strategies
- **[Debugging](DEVELOPMENT/DEBUGGING.md)** - Common issues and solutions
