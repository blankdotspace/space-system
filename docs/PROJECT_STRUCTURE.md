# Project Structure

This document describes the directory layout and organization of the Nounspace codebase.

## Overview

Nounspace follows a modular architecture with clear separation of concerns. The project uses Next.js App Router with TypeScript and follows atomic design principles.

## Root Directory Structure

```
nounspace.ts/
├── docs/                     # Documentation
├── public/                   # Static assets
├── src/                      # Source code
├── supabase/                 # Database configuration
├── tests/                    # Test files
├── .husky/                   # Git hooks
├── package.json              # Dependencies
├── next.config.mjs           # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Test configuration
└── vercel.json               # Deployment configuration
```

## Source Code Structure (`src/`)

### 1. Application Routes (`src/app/`)

Next.js App Router structure for pages and API routes:

```
src/app/
├── (spaces)/                 # Space-related routes (route group)
│   ├── s/[handle]/          # Profile spaces
│   ├── t/[network]/[contractAddress]/ # Token spaces
│   ├── p/[proposalId]/      # Proposal spaces
│   ├── c/[channelId]/       # Channel spaces
│   ├── Space.tsx            # Main space component
│   ├── SpacePage.tsx        # Space page wrapper
│   ├── DesktopView.tsx      # Desktop layout
│   ├── MobileViewSimplified.tsx # Mobile layout
│   └── MobilePreview.tsx    # Mobile preview
├── api/                     # API routes
├── explore/                 # Discovery pages
├── frames/                  # Frame-related routes
├── home/                    # Home page
├── notifications/           # Notifications
├── privacy/                 # Privacy page
├── pwa/                     # PWA configuration
├── terms/                   # Terms page
├── layout.tsx               # Root layout
├── manifest.ts              # PWA manifest
└── not-found.tsx            # 404 page
```

### 2. Authentication (`src/authenticators/`)

Authentication system components:

```
src/authenticators/
├── AuthenticatorManager.tsx # Main auth manager
├── authenticators.ts        # Auth configuration
├── index.tsx                # Auth exports
└── farcaster/               # Farcaster-specific auth
    ├── FarcasterAuthenticator.tsx
    └── index.ts
```

### 3. Shared Code (`src/common/`)

Core shared functionality following atomic design:

```
src/common/
├── components/              # UI components (atomic design)
│   ├── atoms/              # Basic components (buttons, inputs)
│   ├── molecules/          # Composite components
│   ├── organisms/          # Complex components
│   └── templates/          # Page templates
├── data/                   # State management & data access
│   ├── stores/             # Zustand stores
│   │   └── app/            # Main app store
│   │       ├── accounts/   # Authentication & identity
│   │       ├── homebase/   # Private spaces
│   │       ├── space/      # Public spaces
│   │       ├── currentSpace/ # Current space context
│   │       ├── checkpoints/ # State snapshots
│   │       ├── chat/       # Chat functionality
│   │       └── setup/      # Onboarding flow
│   ├── services/           # API services
│   └── types.ts            # Type definitions
├── fidgets/                # Core fidget functionality
├── lib/                    # Utilities and helpers
│   ├── hooks/              # Custom React hooks
│   ├── theme/              # Theme system
│   └── utils/              # Utility functions
├── providers/              # React context providers
├── stores/                 # Additional stores
├── types/                  # TypeScript types
└── utils/                  # General utilities
```

### 4. Application Constants (`src/constants/`)

Static configuration and constants:

```
src/constants/
├── app.ts                   # App configuration
├── appServerSide.ts         # Server-side constants
├── layout.ts                # Layout constants
├── metadata.ts              # SEO metadata
├── themes.ts                # Theme definitions
├── urls.ts                  # URL constants
├── initialSpaceConfig.ts    # Default space config
├── basedDaos.ts            # DAO configurations (fidget-specific)
├── nogs.ts                  # NOGs configuration
├── spaceToken.ts           # Space token config
├── requiredAuthenticators.ts # Auth requirements
├── mobileFidgetIcons.ts     # Mobile icon mappings
├── mobileRedirectUrl.ts     # Mobile redirect config
├── nounishLowfi.ts          # Nounish theme config
├── alchemyChainUrls.ts      # Blockchain URLs
├── etherscanChainIds.ts     # Chain ID mappings
├── optimismChainClient.ts   # Optimism client config
└── numericRange.d.ts        # Type definitions
```

### 5. System Configuration (`src/config/`)

Whitelabeling and system configuration for community customization. Configurations are stored in Supabase and loaded at build time. See [Configuration System](SYSTEMS/CONFIGURATION/OVERVIEW.md) for details.

```
src/config/                  # System configuration
├── nouns/                   # Nouns community configuration
│   ├── nouns.brand.ts      # Brand identity
│   ├── nouns.assets.ts     # Visual assets
│   ├── nouns.community.ts  # Community integration
│   ├── nouns.fidgets.ts    # Enabled/disabled fidgets
│   ├── nouns.home.ts      # Home page config (legacy)
│   ├── nouns.explore.ts   # Explore page config (legacy)
│   ├── nouns.navigation.ts # Navigation config
│   ├── nouns.theme.ts      # Theme config (references shared)
│   ├── nouns.ui.ts         # UI colors
│   └── initialSpaces/      # Initial space templates
├── clanker/                 # Clanker community configuration
├── example/                 # Example community configuration
├── shared/                  # Shared configuration
│   └── themes.ts           # Shared theme definitions
├── systemConfig.ts          # System configuration interface
├── index.ts                 # Configuration loader (reads from DB or static)
└── initialSpaceConfig.ts    # Base space configuration
```

**Key Features:**
- **Database-Backed**: Configs stored in Supabase, loaded at build time
- **Whitelabeling Support**: Complete brand customization through configuration
- **Community Integration**: URLs, social handles, governance links, contract addresses
- **Shared Themes**: Themes stored in shared file, not per-community
- **Pages as Spaces**: Navigation pages stored as Spaces in Storage
- **Fidget Management**: Enable/disable specific fidgets per community
- **Space Templates**: Configurable initial space configurations

### 6. Mini-Applications (`src/fidgets/`)

Fidgets are modular mini-applications that can be added to spaces:

```
src/fidgets/
├── community/               # Community-focused fidgets
│   └── nouns-dao/          # Nouns DAO governance
├── farcaster/              # Farcaster protocol fidgets
│   ├── components/         # Farcaster components
│   ├── Frame.tsx           # Frame fidget
│   ├── Feed.tsx            # Feed fidget
│   ├── Cast.tsx            # Cast fidget
│   └── BuilderScore.tsx    # Builder score fidget
├── framesV2/               # Frame v2 components
├── layout/                 # Layout fidgets
│   ├── Grid.tsx            # Grid layout
│   └── tabFullScreen/      # Mobile tab layout
├── nouns-home/             # Nouns home fidget
├── snapshot/               # Snapshot governance
├── swap/                   # Token swap fidget
├── token/                  # Token-related fidgets
├── ui/                     # UI fidgets
│   ├── gallery.tsx         # Image gallery
│   ├── Text.tsx            # Text fidget
│   ├── IFrame.tsx         # IFrame fidget
│   ├── Links.tsx           # Links fidget
│   ├── Video.tsx           # Video fidget
│   ├── Channel.tsx         # Channel fidget
│   ├── Profile.tsx         # Profile fidget
│   ├── rss.tsx             # RSS fidget
│   └── chat.tsx            # Chat fidget
├── zora/                   # Zora integration
├── example.tsx              # Example fidget (dev only)
├── DefaultFidgets.ts       # Default fidget exports
├── helpers.tsx             # Fidget utilities
└── index.ts                # Fidget registry
```

### 7. Legacy Pages (`src/pages/`)

Legacy Next.js pages directory for API routes:

```
src/pages/api/
├── basescan/               # Basescan integration
├── clanker/                # Clanker integration
├── farcaster/             # Farcaster API
│   └── neynar/            # Neynar API integration
├── metadata/              # Metadata generation
├── notifications/         # Notification API
├── proposal/              # Proposal API
├── search/                # Search API
├── signerRequests.ts      # Signer requests
├── space/                 # Space management API
│   ├── homebase/          # Homebase API
│   ├── registry/          # Space registry
│   └── authenticators.ts  # Auth API
├── youtube-search.ts       # YouTube search
└── fid-link.ts            # FID linking
```

### 8. Styling (`src/styles/`)

Global styles and utilities:

```
src/styles/
├── globals.css             # Global styles
└── utils/                  # Style utilities
    └── tailwind.ts         # Tailwind utilities
```

### 9. Database (`src/supabase/`)

Supabase configuration:

```
src/supabase/
└── database.d.ts           # Database type definitions
```

## Public Assets (`public/`)

Static assets served by Next.js:

```
public/
├── images/                 # Image assets
│   ├── explore-icons/      # Discovery icons
│   ├── nouns-samples/      # Noun samples
│   └── learn/              # Learning assets
├── learn/                  # Learning materials
├── robots.txt               # SEO robots file
├── sitemap.xml             # SEO sitemap
└── sw.js                   # Service worker
```

## Database (`supabase/`)

Supabase project configuration:

```
supabase/
├── config.toml             # Supabase configuration
├── functions/              # Edge functions
│   └── _shared/            # Shared function code
├── migrations/             # Database migrations
└── seed.sql                # Database seed data
```

## Documentation (`docs/`)

Comprehensive project documentation:

```
docs/
├── README.md               # Main documentation hub
├── GETTING_STARTED.md      # Setup guide
├── CONTRIBUTING.md         # Contributing guidelines
├── DOCUMENTATION_OVERVIEW.md # Documentation structure
├── ARCHITECTURE/           # System architecture
├── SYSTEMS/                # Core systems
│   ├── SPACES/            # Space system
│   ├── FIDGETS/           # Fidget system
│   ├── THEMES/            # Theme system
│   └── DISCOVERY/         # Discovery system
├── INTEGRATIONS/          # External integrations
├── DEVELOPMENT/            # Development guides
└── REFERENCE/              # Reference documentation
```

## Key Architectural Principles

### 1. **Separation of Concerns**
- **Routes**: `src/app/` for Next.js App Router
- **Components**: `src/common/components/` for shared UI
- **Business Logic**: `src/common/data/` for state management
- **Mini-Apps**: `src/fidgets/` for modular functionality

### 2. **Atomic Design Pattern**
- **Atoms**: Basic UI components (`src/common/components/atoms/`)
- **Molecules**: Composite components (`src/common/components/molecules/`)
- **Organisms**: Complex components (`src/common/components/organisms/`)
- **Templates**: Page layouts (`src/common/components/templates/`)

### 3. **Modular Architecture**
- **Fidgets**: Self-contained mini-applications
- **Stores**: Independent state management modules
- **Services**: Isolated API integrations
- **Components**: Reusable UI building blocks

### 4. **Type Safety**
- **TypeScript**: Strict typing throughout
- **Type Definitions**: Centralized in `src/common/types/`
- **Interface Contracts**: Clear API boundaries

### 5. **Scalability**
- **Store Composition**: Modular state management
- **Component Composition**: Reusable UI patterns
- **Service Layer**: Abstracted data access
- **Plugin Architecture**: Extensible fidget system

## Development Workflow

### 1. **Adding New Features**
- Create components in appropriate atomic design folder
- Add state management in `src/common/data/stores/`
- Create fidgets in `src/fidgets/` for mini-apps
- Update types in `src/common/types/`

### 2. **Adding New Pages**
- Create route in `src/app/` following Next.js conventions
- Use existing components from `src/common/components/`
- Follow space patterns for consistency

### 3. **Adding New Fidgets**
- Create fidget in `src/fidgets/[category]/`
- Register in `src/fidgets/index.ts`
- Follow fidget interface patterns
- Add to appropriate category

### 4. **Database Changes**
- Create migration in `supabase/migrations/`
- Update types in `src/supabase/database.d.ts`
- Test with seed data

This structure provides a clear, maintainable, and scalable foundation for the Nounspace application.
