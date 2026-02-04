# Blankspace Documentation

**Blankspace is a platform where communities build their home on Farcaster.**

## What is Blankspace?

Blankspace gives communities a customizable homebase - a central hub where members can engage, govern, trade, and connect. Instead of scattered tools across different apps, communities get everything in one place:

- **A branded home** with custom themes, navigation, and pages
- **Community tools** (fidgets) for governance, token management, feeds, and more
- **Member spaces** where individuals can customize their own profiles
- **Multi-tenant architecture** so each community has its own identity

## Who is Blankspace for?

| Community Type | What they get |
|----------------|---------------|
| **Token communities** | Token pages with swap widgets, holder feeds, governance |
| **DAOs** | Proposal spaces, Snapshot integration, governance fidgets |
| **Farcaster channels** | Channel feeds, member directories, community pages |
| **Creators** | Profile customization, galleries, link trees |

## Quick Concepts

| Concept | What it is |
|---------|-----------|
| **Space** | A customizable page (profile, token, channel, or custom page) |
| **Homebase** | A member's private, personal dashboard |
| **Fidget** | A community tool you add to spaces (feeds, swaps, governance, etc.) |
| **Tab** | A page within a space |
| **Theme** | Visual branding (colors, fonts, backgrounds) |
| **Community Config** | Settings that define a community's branding and navigation |

## Getting Started

- **[Local Development Setup](GETTING_STARTED.md)** - Run Blankspace locally
- **[Project Structure](PROJECT_STRUCTURE.md)** - How the codebase is organized
- **[Contributing](CONTRIBUTING.md)** - How to contribute

## Core Systems

### [Spaces](SYSTEMS/SPACES/OVERVIEW.md)
The pages that make up a community - profiles, tokens, channels, and custom pages.

### [Fidgets](SYSTEMS/FIDGETS/OVERVIEW.md)
Community tools: governance widgets, token swaps, feeds, galleries, and more.

### [Themes](SYSTEMS/THEMES/OVERVIEW.md)
Visual branding - colors, fonts, backgrounds, and custom CSS.

### [Configuration](SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW.md)
Multi-tenant system that gives each community its own identity.

### [Navigation](SYSTEMS/NAVIGATION/OVERVIEW.md)
Custom navigation and pages for communities.

## Architecture

- **[Architecture Overview](ARCHITECTURE/OVERVIEW.md)** - System design
- **[Authentication](ARCHITECTURE/AUTHENTICATION.md)** - Privy + Farcaster login
- **[State Management](ARCHITECTURE/STATE_MANAGEMENT.md)** - Data flow

## Integrations

- **[Farcaster](INTEGRATIONS/FARCASTER.md)** - Social protocol
- **[Supabase](INTEGRATIONS/SUPABASE.md)** - Database and storage

## Development

- **[Development Guide](DEVELOPMENT/DEVELOPMENT_GUIDE.md)** - Dev guide
- **[Coding Standards](DEVELOPMENT/CODING_STANDARDS.md)** - Code style
- **[Testing](DEVELOPMENT/TESTING.md)** - Test strategies
