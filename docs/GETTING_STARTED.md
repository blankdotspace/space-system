# Getting Started

This guide will help you set up the Nounspace development environment and understand the basic concepts.

## Prerequisites

- Node.js v22.11.0 or later
- npm or yarn package manager
- Git

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nounspace/nounspace.ts.git
   cd nounspace.ts
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following required environment variables:
   - `NEXT_PUBLIC_PRIVY_APP_ID` - Privy application ID
   - `NEXT_PUBLIC_NEYNAR_API_KEY` - Neynar API key
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (spaces)/          # Space-related routes
│   ├── [navSlug]/         # Dynamic navigation pages (home, explore, etc.)
│   ├── api/               # API routes
│   ├── notifications/     # Notifications
│   ├── privacy/           # Privacy page
│   ├── pwa/               # PWA configuration
│   └── terms/             # Terms page
├── authenticators/         # Authentication system
├── common/                # Shared code
│   ├── components/        # UI components (atomic design)
│   ├── data/              # State management
│   ├── fidgets/           # Core fidget functionality
│   ├── lib/               # Utilities and helpers
│   └── providers/         # React context providers
├── constants/             # Application constants
├── contracts/             # Blockchain contract interfaces
├── fidgets/               # Mini-applications
├── pages/                 # Legacy Next.js pages
└── styles/                # Global styles
```

## Key Concepts

### Spaces
Spaces are customizable hubs that users can personalize with themes, tabs, and fidgets.

### Fidgets
Mini-applications that can be added to spaces to provide specific functionality.

### Themes
Visual customization system that allows users to personalize their spaces.

### Authentication
The app uses Privy for authentication with Farcaster integration for social features.

## Development Workflow

1. **Make changes** to the codebase
2. **Run linting** with `npm run lint`
3. **Check types** with `npm run check-types`
4. **Test changes** with `npm run test`
5. **Create a PR** following the [Contributing](CONTRIBUTING.md) guidelines

## Next Steps

- Read the [Architecture Overview](ARCHITECTURE/OVERVIEW.md) to understand the system
- Check out [Fidget Development Guide](SYSTEMS/FIDGETS/DEVELOPMENT_GUIDE.md) to create fidgets
- Review [Component Architecture](DEVELOPMENT/COMPONENT_ARCHITECTURE.md) for UI development
