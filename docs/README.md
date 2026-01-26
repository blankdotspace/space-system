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

## Getting Started

- **[Local Development Setup](GETTING_STARTED.md)** - Run Blankspace locally
- **[Project Structure](PROJECT_STRUCTURE.md)** - How the codebase is organized
- **[Contributing](CONTRIBUTING.md)** - How to contribute

## Core Systems

### [Spaces](SYSTEMS/SPACES/OVERVIEW.md)
Spaces are the main organizational unit. Learn about different space types, how ownership works, and how to customize them.

### [Fidgets](SYSTEMS/FIDGETS/OVERVIEW.md)
Fidgets are the building blocks you add to spaces. There are fidgets for feeds, galleries, swaps, governance, and more.

### [Themes](SYSTEMS/THEMES/OVERVIEW.md)
Themes control the visual appearance - colors, fonts, backgrounds, and custom CSS/HTML.

### [Navigation](SYSTEMS/NAVIGATION/OVERVIEW.md)
Communities can define custom navigation and pages.

### [Configuration](SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW.md)
The multi-tenant configuration system for community branding and settings.

## Architecture

- **[Architecture Overview](ARCHITECTURE/OVERVIEW.md)** - High-level system design
- **[Authentication](ARCHITECTURE/AUTHENTICATION.md)** - How login works (Privy + Farcaster)
- **[State Management](ARCHITECTURE/STATE_MANAGEMENT.md)** - How data flows through the app

## Integrations

- **[Farcaster](INTEGRATIONS/FARCASTER.md)** - Social protocol integration
- **[Supabase](INTEGRATIONS/SUPABASE.md)** - Database and storage

## Development

- **[Development Guide](DEVELOPMENT/DEVELOPMENT_GUIDE.md)** - Comprehensive dev guide
- **[Coding Standards](DEVELOPMENT/CODING_STANDARDS.md)** - Code style
- **[Testing](DEVELOPMENT/TESTING.md)** - Test strategies
