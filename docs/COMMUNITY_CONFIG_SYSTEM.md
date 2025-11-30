# Community Configuration System

> **Note:** This document describes the static configuration system structure. For information about the current database-backed configuration system, see [Configuration System Overview](SYSTEMS/CONFIGURATION/OVERVIEW.md).

## Overview

The Community Configuration System is a comprehensive whitelabeling solution that allows Nounspace to be customized for different communities (Nouns, Clanker, Example, etc.). Configurations are stored in Supabase and loaded at build time, with fallback to static TypeScript configs.

## Architecture

### Core Components

1. **Configuration Loader** (`src/config/index.ts`)
   - Reads `NEXT_PUBLIC_COMMUNITY` environment variable
   - Validates and loads the appropriate community configuration
   - Provides runtime delegation functions for space creators

2. **System Config Interface** (`src/config/systemConfig.ts`)
   - Defines the `SystemConfig` type structure
   - Provides TypeScript interfaces for all configuration sections

3. **Community Configurations** (`src/config/{community}/`)
   - Each community has its own folder with modular config files
   - Exported as a single `{community}SystemConfig` object

4. **Hook for React Components** (`src/common/lib/hooks/useSystemConfig.ts`)
   - Provides cached access to system config in React components
   - Memoized for performance

## Configuration Structure

### SystemConfig Interface

```typescript
interface SystemConfig {
  brand: BrandConfig;           // Brand identity (name, tagline, description)
  assets: AssetConfig;          // Visual assets (logos, icons, favicons)
  theme: ThemeConfig;           // Theme definitions (default, nounish, etc.)
  community: CommunityConfig;   // Community integration (URLs, contracts, tokens)
  fidgets: FidgetConfig;        // Enabled/disabled fidgets
  homePage: HomePageConfig;     // Home page tabs and layout
  explorePage: ExplorePageConfig; // Explore page configuration
  navigation?: NavigationConfig; // Navigation items and settings
  ui?: UIConfig;                // UI colors and styling
}
```

### Configuration Modules

Each community configuration is split into modular files:

```
src/config/{community}/
├── {community}.brand.ts        # Brand identity
├── {community}.assets.ts       # Visual assets
├── {community}.theme.ts        # Theme definitions
├── {community}.community.ts   # Community integration
├── {community}.fidgets.ts     # Fidget management
├── {community}.home.ts        # Home page config
├── {community}.explore.ts     # Explore page config
├── {community}.navigation.ts  # Navigation config
├── {community}.ui.ts          # UI colors
├── index.ts                   # Main export
└── initialSpaces/             # Initial space templates
    ├── initialProfileSpace.ts
    ├── initialChannelSpace.ts
    ├── initialTokenSpace.ts
    ├── initialProposalSpace.ts
    └── initialHomebase.ts
```

## Configuration Details

### 1. Brand Config (`brand`)

Defines the community's brand identity:

```typescript
interface BrandConfig {
  name: string;              // Internal name (e.g., "nouns")
  displayName: string;       // Display name (e.g., "Nouns")
  tagline: string;          // Tagline
  description: string;       // Description for SEO/metadata
  miniAppTags: string[];    // Tags for mini-app discovery
}
```

**Example (Nouns):**
```typescript
export const nounsBrand = {
  name: "Nouns",
  displayName: "Nouns",
  tagline: "A space for Nouns",
  description: "The social hub for Nouns",
  miniAppTags: ["nouns", "client", "customizable", "social", "link"],
};
```

### 2. Assets Config (`assets`)

Defines visual assets used throughout the application:

```typescript
interface AssetConfig {
  logos: {
    main: string;           // Main logo (SVG/PNG path)
    icon: string;           // Icon logo (SVG/PNG path)
    favicon: string;        // Favicon path
    appleTouch: string;     // Apple touch icon path
    og: string;             // Open Graph image path
    splash: string;         // Splash screen image path
  };
}
```

**Example (Nouns):**
```typescript
export const nounsAssets = {
  logos: {
    main: logo,                    // Imported SVG
    icon: noggles,                 // Imported SVG
    favicon: "/images/favicon.ico",
    appleTouch: "/images/apple-touch-icon.png",
    og: og,                        // Imported SVG
    splash: splash,                // Imported SVG
  },
};
```

### 3. Theme Config (`theme`)

Defines available theme templates:

```typescript
interface ThemeConfig {
  default: ThemeProperties;
  nounish: ThemeProperties;
  gradientAndWave: ThemeProperties;
  colorBlobs: ThemeProperties;
  floatingShapes: ThemeProperties;
  imageParallax: ThemeProperties;
  shootingStar: ThemeProperties;
  squareGrid: ThemeProperties;
  tesseractPattern: ThemeProperties;
  retro: ThemeProperties;
}

interface ThemeProperties {
  id: string;
  name: string;
  properties: {
    font: string;
    fontColor: string;
    headingsFont: string;
    headingsFontColor: string;
    background: string;
    backgroundHTML: string;        // Custom HTML/CSS or reference
    musicURL: string;
    fidgetBackground: string;
    fidgetBorderWidth: string;
    fidgetBorderColor: string;
    fidgetShadow: string;
    fidgetBorderRadius: string;
    gridSpacing: string;
  };
}
```

**Example (Nouns - Default Theme):**
```typescript
default: {
  id: "default",
  name: "Default",
  properties: {
    font: "Inter",
    fontColor: "#000000",
    headingsFont: "Inter",
    headingsFontColor: "#000000",
    background: "#ffffff",
    backgroundHTML: "",
    musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
    fidgetBackground: "#ffffff",
    fidgetBorderWidth: "1px",
    fidgetBorderColor: "#C0C0C0",
    fidgetShadow: "none",
    fidgetBorderRadius: "12px",
    gridSpacing: "16",
  },
}
```

### 4. Community Config (`community`)

Defines community integration details:

```typescript
interface CommunityConfig {
  type: string;                    // Community type identifier
  urls: {
    website: string;
    discord: string;
    twitter: string;
    github: string;
    forum: string;
  };
  social: {
    farcaster: string;            // Farcaster handle
    discord: string;              // Discord handle
    twitter: string;               // Twitter handle
  };
  governance: {
    proposals: string;            // Proposals URL
    delegates: string;             // Delegates URL
    treasury: string;              // Treasury URL
  };
  tokens: {
    erc20Tokens?: CommunityErc20Token[];
    nftTokens?: CommunityNftToken[];
  };
  contracts: {
    nouns: Address;               // Main NFT contract
    auctionHouse: Address;        // Auction house contract
    space: Address;                // Space token contract
    nogs: Address;                 // NOGs contract
    [key: string]: Address;        // Additional contracts
  };
}
```

**Example (Nouns):**
```typescript
export const nounsCommunity = {
  type: 'nouns',
  urls: {
    website: 'https://nouns.com',
    discord: 'https://discord.gg/nouns',
    twitter: 'https://twitter.com/nounsdao',
    github: 'https://github.com/nounsDAO',
    forum: 'https://discourse.nouns.wtf',
  },
  social: {
    farcaster: 'nouns',
    discord: 'nouns',
    twitter: 'nounsdao',
  },
  governance: {
    proposals: 'https://nouns.wtf/vote',
    delegates: 'https://nouns.wtf/delegates',
    treasury: 'https://nouns.wtf/treasury',
  },
  tokens: {
    erc20Tokens: [
      {
        address: '0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab',
        symbol: '$SPACE',
        decimals: 18,
        network: 'base',
      },
    ],
    nftTokens: [
      {
        address: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
        symbol: 'Nouns',
        type: 'erc721',
        network: 'eth',
      },
    ],
  },
  contracts: {
    nouns: '0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03',
    auctionHouse: '0x830bd73e4184cef73443c15111a1df14e495c706',
    space: '0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab',
    nogs: '0xD094D5D45c06c1581f5f429462eE7cCe72215616',
  },
};
```

### 5. Fidget Config (`fidgets`)

Controls which fidgets are enabled/disabled:

```typescript
interface FidgetConfig {
  enabled: string[];    // List of enabled fidget IDs
  disabled: string[];   // List of disabled fidget IDs
}
```

**Example (Nouns):**
```typescript
export const nounsFidgets = {
  enabled: [
    'nounsHome',
    'governance',
    'feed',
    'cast',
    'gallery',
    'text',
    'iframe',
    'links',
    'video',
    'channel',
    'profile',
    'snapshot',
    'swap',
    'rss',
    'market',
    'portfolio',
    'chat',
    'builderScore',
    'framesV2'
  ],
  disabled: ['example']
};
```

### 6. Home Page Config (`homePage`)

Defines the home page structure:

```typescript
interface HomePageConfig {
  defaultTab: string;              // Default tab name
  tabOrder: string[];             // Tab display order
  tabs: {
    [key: string]: TabConfig;     // Tab configurations
  };
  layout: {
    defaultLayoutFidget: string;  // Default layout (e.g., "grid")
    gridSpacing: number;           // Grid spacing in pixels
    theme: {
      background: string;
      fidgetBackground: string;
      font: string;
      fontColor: string;
    };
  };
}
```

**Example (Nouns):**
```typescript
export const nounsHomePage = {
  defaultTab: "Nouns",
  tabOrder: ["Nouns", "Social", "Governance", "Resources", "Funded Works", "Places"],
  tabs: {
    "Nouns": {
      name: "Nouns",
      displayName: "Nouns",
      layoutID: "88b78f73-37fb-4921-9410-bc298311c0bb",
      layoutDetails: {
        layoutConfig: { layout: [...] },
        layoutFidget: "grid"
      },
      theme: { ... },
      fidgetInstanceDatums: { ... },
      fidgetTrayContents: [],
      isEditable: false,
      timestamp: "2025-06-20T05:58:44.080Z"
    },
    // ... more tabs
  },
  layout: {
    defaultLayoutFidget: "grid",
    gridSpacing: 16,
    theme: {
      background: "#ffffff",
      fidgetBackground: "#ffffff",
      font: "Inter",
      fontColor: "#000000"
    }
  }
};
```

### 7. Navigation Config (`navigation`)

Defines navigation items and settings:

```typescript
interface NavigationConfig {
  items: NavigationItem[];
  logoTooltip?: {
    text: string;
    href?: string;
  };
  showMusicPlayer?: boolean;
  showSocials?: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: 'home' | 'explore' | 'notifications' | 'search' | 'space' | 'robot' | 'custom';
  openInNewTab?: boolean;
  requiresAuth?: boolean;
}
```

**Example (Nouns):**
```typescript
export const nounsNavigation: NavigationConfig = {
  logoTooltip: {
    text: "wtf is nouns?",
    href: "https://nouns.wtf",
  },
  items: [
    { id: 'home', label: 'Home', href: '/home', icon: 'home' },
    { id: 'explore', label: 'Explore', href: '/explore', icon: 'explore' },
    { id: 'notifications', label: 'Notifications', href: '/notifications', icon: 'notifications', requiresAuth: true },
    { id: 'space-token', label: '$SPACE', href: '/t/base/0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab/Profile', icon: 'space' },
  ],
  showMusicPlayer: true,
  showSocials: true,
};
```

### 8. UI Config (`ui`)

Defines UI colors and styling:

```typescript
interface UIConfig {
  primaryColor: string;
  primaryHoverColor: string;
  primaryActiveColor: string;
  castButton: {
    backgroundColor: string;
    hoverColor: string;
    activeColor: string;
  };
}
```

## Configuration Loading

The system uses **database-backed configuration** with build-time loading. Configs are fetched from Supabase during build and stored in an environment variable. If the database is unavailable, the system falls back to static TypeScript configs.

### Build-Time Configuration

The community is determined at build time via the `NEXT_PUBLIC_COMMUNITY` environment variable:

```bash
# Set community at build time
NEXT_PUBLIC_COMMUNITY=nouns npm run build
NEXT_PUBLIC_COMMUNITY=clanker npm run build
NEXT_PUBLIC_COMMUNITY=example npm run build
```

### Loading Process

1. **Environment Variable Reading**
   ```typescript
   const communityConfig = process.env.NEXT_PUBLIC_COMMUNITY || 'nouns';
   ```

2. **Validation**
   ```typescript
   if (!isValidCommunityConfig(communityConfig)) {
     console.warn(`Invalid community configuration: "${communityConfig}"`);
     // Falls back to 'nouns'
   }
   ```

3. **Configuration Selection**
   ```typescript
   switch (communityConfig.toLowerCase()) {
     case 'nouns':
       return nounsSystemConfig;
     case 'example':
       return exampleSystemConfig;
     case 'clanker':
       return clankerSystemConfig;
     default:
       return nounsSystemConfig;
   }
   ```

### Runtime Delegation

The system provides runtime delegation functions for space creators that switch based on the active community:

```typescript
// Profile space creator
export const createInitialProfileSpaceConfigForFid = (fid: number, username?: string, walletAddress?: string) => {
  switch (resolveCommunity()) {
    case 'clanker':
      return clankerCreateInitialProfileSpaceConfigForFid(fid, username, walletAddress);
    case 'example':
      return exampleCreateInitialProfileSpaceConfigForFid(fid, username);
    case 'nouns':
    default:
      return nounsCreateInitialProfileSpaceConfigForFid(fid, username);
  }
};

// Similar functions for:
// - createInitialChannelSpaceConfig
// - createInitialTokenSpaceConfigForAddress
// - createInitalProposalSpaceConfigForProposalId
// - createInitialHomebaseConfig
```

## Usage in Components

### Using the Hook

```typescript
import { useSystemConfig } from '@/common/lib/hooks/useSystemConfig';

const MyComponent = () => {
  const config = useSystemConfig();
  
  return (
    <div>
      <h1>{config.brand.displayName}</h1>
      <img src={config.assets.logos.main} alt={config.brand.name} />
    </div>
  );
};
```

### Direct Loading (Server-Side)

```typescript
import { loadSystemConfig } from '@/config';

// In server components or build-time code
const config = loadSystemConfig();
const metadata: Metadata = {
  title: config.brand.displayName,
  description: config.brand.description,
  openGraph: {
    images: [{ url: `${WEBSITE_URL}${config.assets.logos.og}` }],
  },
};
```

### Example: Navigation Component

```typescript
import { loadSystemConfig } from '@/config';

const Navigation = () => {
  const { community, navigation, ui } = loadSystemConfig();
  
  return (
    <nav>
      {navigation?.items.map(item => (
        <Link key={item.id} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
};
```

### Example: Brand Header

```typescript
import { loadSystemConfig } from '@/config';

const BrandHeader = () => {
  const { assets, brand, navigation } = loadSystemConfig();
  const logoSrc = assets.logos.icon || assets.logos.main;
  
  return (
    <Image
      src={logoSrc}
      alt={`${brand.displayName} Logo`}
      width={60}
      height={40}
    />
  );
};
```

## Adding a New Community

### Step 1: Create Community Folder

```bash
mkdir -p src/config/mycommunity
mkdir -p src/config/mycommunity/initialSpaces
```

### Step 2: Create Configuration Files

Create the following files in `src/config/mycommunity/`:

- `mycommunity.brand.ts` - Brand identity
- `mycommunity.assets.ts` - Visual assets
- `mycommunity.theme.ts` - Theme definitions
- `mycommunity.community.ts` - Community integration
- `mycommunity.fidgets.ts` - Fidget management
- `mycommunity.home.ts` - Home page config
- `mycommunity.explore.ts` - Explore page config
- `mycommunity.navigation.ts` - Navigation config (optional)
- `mycommunity.ui.ts` - UI colors (optional)
- `index.ts` - Main export

### Step 3: Create Initial Space Templates

Create space creator functions in `src/config/mycommunity/initialSpaces/`:

- `initialProfileSpace.ts` - Profile space creator
- `initialChannelSpace.ts` - Channel space creator
- `initialTokenSpace.ts` - Token space creator
- `initialProposalSpace.ts` - Proposal space creator
- `initialHomebase.ts` - Homebase creator

### Step 4: Export Configuration

In `src/config/mycommunity/index.ts`:

```typescript
import { mycommunityBrand } from './mycommunity.brand';
import { mycommunityAssets } from './mycommunity.assets';
// ... import other modules

export const mycommunitySystemConfig = {
  brand: mycommunityBrand,
  assets: mycommunityAssets,
  theme: mycommunityTheme,
  community: mycommunityCommunity,
  fidgets: mycommunityFidgets,
  homePage: mycommunityHomePage,
  explorePage: mycommunityExplorePage,
  navigation: mycommunityNavigation,
  ui: mycommunityUI,
};
```

### Step 5: Register in Main Config

In `src/config/index.ts`:

1. Add to `AVAILABLE_CONFIGURATIONS`:
   ```typescript
   const AVAILABLE_CONFIGURATIONS = ['nouns', 'example', 'clanker', 'mycommunity'] as const;
   ```

2. Import the config:
   ```typescript
   import { mycommunitySystemConfig } from './mycommunity/index';
   ```

3. Add to switch statement:
   ```typescript
   case 'mycommunity':
     return mycommunitySystemConfig;
   ```

4. Import and add space creators:
   ```typescript
   import { default as mycommunityCreateInitialProfileSpaceConfigForFid } from './mycommunity/initialSpaces/initialProfileSpace';
   // ... import other creators
   
   // Add to delegation functions
   export const createInitialProfileSpaceConfigForFid = (fid: number, username?: string) => {
     switch (resolveCommunity()) {
       case 'mycommunity':
         return mycommunityCreateInitialProfileSpaceConfigForFid(fid, username);
       // ... other cases
     }
   };
   ```

### Step 6: Use the Configuration

```bash
NEXT_PUBLIC_COMMUNITY=mycommunity npm run build
```

## Key Features

### 1. Build-Time Configuration
- Configuration is determined at build time
- No runtime switching between communities
- Optimized bundle size (only one community's config included)

### 2. Type Safety
- Full TypeScript support
- Type checking for all configuration sections
- Interface validation

### 3. Modular Structure
- Each configuration section is in its own file
- Easy to maintain and update
- Clear separation of concerns

### 4. Caching
- Configuration is cached after first load
- `useSystemConfig` hook provides memoized access
- Efficient for React components

### 5. Fallback Behavior
- Invalid configurations fall back to 'nouns'
- Graceful error handling
- Console warnings for debugging

### 6. Runtime Delegation
- Space creators delegate to community-specific implementations
- Allows different communities to have different space structures
- Maintains consistent API across communities

## Best Practices

1. **Use the Hook in Components**
   - Prefer `useSystemConfig()` hook in React components
   - Provides caching and memoization

2. **Direct Loading for Server-Side**
   - Use `loadSystemConfig()` in server components or build-time code
   - No React hooks available in these contexts

3. **Type Safety**
   - Always use TypeScript interfaces
   - Leverage type checking for configuration validation

4. **Modular Configuration**
   - Keep each configuration section in its own file
   - Makes it easier to maintain and update

5. **Consistent Structure**
   - Follow the same structure across all communities
   - Makes it easier to add new communities

6. **Documentation**
   - Document any community-specific behavior
   - Include examples in configuration files

## Troubleshooting

### Configuration Not Loading

1. **Check Environment Variable**
   ```bash
   echo $NEXT_PUBLIC_COMMUNITY
   ```

2. **Verify Configuration Exists**
   - Check that the community folder exists
   - Verify `index.ts` exports `{community}SystemConfig`

3. **Check Console Warnings**
   - Invalid configurations log warnings
   - Check browser/server console for errors

### Type Errors

1. **Verify Interface Compliance**
   - Ensure all required fields are present
   - Check TypeScript types match `SystemConfig` interface

2. **Check Imports**
   - Verify all imports are correct
   - Ensure types are imported from `systemConfig.ts`

### Build Issues

1. **Clear Build Cache**
   ```bash
   rm -rf .next
   npm run build
   ```

2. **Check Environment Variables**
   - Ensure `NEXT_PUBLIC_COMMUNITY` is set correctly
   - Verify it's available at build time

## Examples

### Nouns Configuration
- **Brand**: Nouns DAO branding
- **Assets**: Noggles logo, Nouns colors
- **Themes**: Nounish theme with animated backgrounds
- **Fidgets**: Full fidget set including Nouns-specific fidgets
- **Navigation**: Home, Explore, Notifications, $SPACE token

### Clanker Configuration
- **Brand**: Clanker ecosystem branding
- **Assets**: Clanker logo and assets
- **Themes**: Clanker-specific themes
- **Fidgets**: Token-focused fidgets enabled
- **Navigation**: Clanker-specific navigation items

### Example Configuration
- **Brand**: Template/example branding
- **Assets**: Placeholder assets
- **Themes**: Basic theme set
- **Fidgets**: Core fidgets enabled
- **Navigation**: Basic navigation structure

## Summary

The Community Configuration System provides a comprehensive whitelabeling solution that allows Nounspace to be customized for different communities. It uses build-time configuration for optimal performance, provides full type safety, and maintains a modular structure for easy maintenance and extension.

