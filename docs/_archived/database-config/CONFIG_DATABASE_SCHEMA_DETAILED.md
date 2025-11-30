# Detailed Database Config Schema Breakdown

## Overview

This document breaks down exactly what information is stored in each JSONB column of the `community_configs` table. Each column corresponds to a section of the `SystemConfig` interface.

## Database Table Structure

```sql
CREATE TABLE community_configs (
  id UUID PRIMARY KEY,
  community_id VARCHAR(50) UNIQUE,
  brand_config JSONB,           -- Brand identity
  assets_config JSONB,          -- Visual assets
  theme_config JSONB,           -- Theme definitions
  community_config JSONB,       -- Community integration data
  fidgets_config JSONB,         -- Fidget enable/disable
  home_page_config JSONB,       -- Home page structure
  explore_page_config JSONB,    -- Explore page structure
  navigation_config JSONB,      -- Navigation items (optional)
  ui_config JSONB               -- UI colors (optional)
);
```

---

## 1. `brand_config` (BrandConfig)

**Purpose:** Brand identity and metadata for the community

**Structure:**
```json
{
  "name": "Nouns",                    // Internal identifier (lowercase, no spaces)
  "displayName": "Nouns",            // Display name shown to users
  "tagline": "A space for Nouns",    // Short tagline/slogan
  "description": "The social hub for Nouns",  // Full description (used in meta tags, OG tags)
  "miniAppTags": [                   // Tags for Farcaster Mini App discovery
    "nouns",
    "client",
    "customizable",
    "social",
    "link"
  ]
}
```

**Fields Explained:**
- **`name`**: Internal identifier, used in code/logs (e.g., "nouns", "clanker")
- **`displayName`**: User-facing name shown in UI, titles, headers
- **`tagline`**: Short marketing tagline (1-2 sentences)
- **`description`**: Full description used in:
  - HTML `<meta name="description">`
  - Open Graph tags
  - Social media previews
  - SEO
- **`miniAppTags`**: Array of strings used for:
  - Farcaster Mini App catalog discovery
  - Search/filtering in Mini App stores
  - Categorization

**Example:**
```json
{
  "name": "nouns",
  "displayName": "Nouns",
  "tagline": "A space for Nouns",
  "description": "The social hub for Nouns",
  "miniAppTags": ["nouns", "client", "customizable", "social", "link"]
}
```

---

## 2. `assets_config` (AssetConfig)

**Purpose:** Paths/URLs to visual assets (logos, icons, images)

**Structure:**
```json
{
  "logos": {
    "main": "/images/nouns/logo.svg",           // Main logo (large, used in headers)
    "icon": "/images/nouns/noggles.svg",        // Icon (small, used in nav/favicon)
    "favicon": "/images/favicon.ico",           // Browser favicon
    "appleTouch": "/images/apple-touch-icon.png", // iOS home screen icon
    "og": "/images/nouns/og.png",               // Open Graph image (social sharing)
    "splash": "/images/nouns/splash.png"        // Splash screen (Farcaster frames)
  }
}
```

**Fields Explained:**
- **`main`**: Primary logo, typically:
  - SVG or PNG
  - Used in main header/navigation
  - Larger size (200-400px width)
- **`icon`**: Small icon/logo variant:
  - Used in navigation bars
  - Mobile headers
  - Sometimes same as main, sometimes different (e.g., "noggles" for Nouns)
- **`favicon`**: Browser tab icon:
  - `.ico` format
  - Multiple sizes (16x16, 32x32)
- **`appleTouch`**: iOS home screen icon:
  - PNG format
  - 180x180px recommended
- **`og`**: Open Graph image for social sharing:
  - PNG/JPG format
  - 1200x630px recommended
  - Used when sharing links on Twitter, Discord, etc.
- **`splash`**: Splash screen image:
  - Used in Farcaster Frame launch screens
  - PNG/JPG format
  - Full-screen background

**Path Formats:**

The `assets_config` paths can be in different formats depending on the stage:

1. **Storage Paths (in database)**: `"community-assets/nouns/logo.svg"`
   - References assets uploaded to Supabase Storage
   - Used when admin uploads assets via UI
   - Stored directly in `assets_config` JSONB column

2. **Public Paths (after build)**: `"/images/nouns/logo.svg"`
   - References assets in `public/images/` folder
   - Generated at build time when assets are downloaded
   - Used at runtime by the application

3. **CDN URLs (optional)**: `"https://cdn.example.com/logo.svg"`
   - External CDN URLs (if not using build-time download)
   - Can be used directly without download

**Flow:**
```
Admin Uploads → Supabase Storage → assets_config stores storage path
                                    ↓
                              Build Time:
                              Download from Storage
                              → Save to public/images/
                              → Update assets_config to public path
                                    ↓
                              Runtime:
                              App uses public path
```

**Example:**
```json
{
  "logos": {
    "main": "/images/nouns/logo.svg",
    "icon": "/images/nouns/noggles.svg",
    "favicon": "/images/favicon.ico",
    "appleTouch": "/images/apple-touch-icon.png",
    "og": "/images/nouns/og.png",
    "splash": "/images/nouns/splash.png"
  }
}
```

---

## 3. `theme_config` (ThemeConfig)

**Purpose:** Visual theme definitions (colors, fonts, backgrounds, styling)

**Structure:**
```json
{
  "default": {
    "id": "default",
    "name": "Default",
    "properties": {
      "font": "Inter",                    // Primary font family
      "fontColor": "#000000",            // Primary text color
      "headingsFont": "Inter",           // Font for headings (h1, h2, etc.)
      "headingsFontColor": "#000000",    // Heading text color
      "background": "#ffffff",           // Page background color
      "backgroundHTML": "",              // HTML/CSS for animated backgrounds (or empty string)
      "musicURL": "https://...",         // YouTube URL for background music
      "fidgetBackground": "#ffffff",     // Background color for fidget containers
      "fidgetBorderWidth": "1px",       // Border width for fidgets
      "fidgetBorderColor": "#C0C0C0",    // Border color for fidgets
      "fidgetShadow": "none",            // CSS shadow for fidgets
      "fidgetBorderRadius": "12px",      // Border radius for fidgets
      "gridSpacing": "16"                // Grid spacing in pixels
    }
  },
  "nounish": { /* ... */ },
  "gradientAndWave": { /* ... */ },
  // ... other theme variants
}
```

**Fields Explained:**
- **`id`**: Unique identifier for the theme (used in code)
- **`name`**: Display name shown in theme picker
- **`properties.font`**: Primary font family (Google Fonts name or system font)
- **`properties.fontColor`**: Hex color for body text
- **`properties.headingsFont`**: Font family for headings (can differ from body)
- **`properties.headingsFontColor`**: Hex color for headings
- **`properties.background`**: Page background color (hex or rgba)
- **`properties.backgroundHTML`**: 
  - Empty string `""` for solid color backgrounds
  - HTML string for animated backgrounds (e.g., "nounish", "gradientAndWave")
  - Contains full HTML/CSS for complex animated backgrounds
- **`properties.musicURL`**: YouTube URL for background music (optional)
- **`properties.fidgetBackground`**: Background color for fidget containers
- **`properties.fidgetBorderWidth`**: CSS border width (e.g., "1px", "2px", "0")
- **`properties.fidgetBorderColor`**: Hex color for fidget borders
- **`properties.fidgetShadow`**: CSS box-shadow value (e.g., "none", "0 5px 15px rgba(0,0,0,0.55)")
- **`properties.fidgetBorderRadius`**: CSS border-radius (e.g., "12px", "0px")
- **`properties.gridSpacing`**: Spacing between grid items in pixels (as string)

**Theme Variants:**
Each community can define multiple theme variants:
- `default`: Basic theme
- `nounish`: Community-specific theme
- `gradientAndWave`: Animated gradient theme
- `colorBlobs`: Animated color blobs
- `floatingShapes`: Floating shapes animation
- `imageParallax`: Parallax image background
- `shootingStar`: Shooting star animation
- `squareGrid`: Grid pattern background
- `tesseractPattern`: 3D tesseract pattern
- `retro`: Retro/vintage theme

**Example:**
```json
{
  "default": {
    "id": "default",
    "name": "Default",
    "properties": {
      "font": "Inter",
      "fontColor": "#000000",
      "headingsFont": "Inter",
      "headingsFontColor": "#000000",
      "background": "#ffffff",
      "backgroundHTML": "",
      "musicURL": "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
      "fidgetBackground": "#ffffff",
      "fidgetBorderWidth": "1px",
      "fidgetBorderColor": "#C0C0C0",
      "fidgetShadow": "none",
      "fidgetBorderRadius": "12px",
      "gridSpacing": "16"
    }
  },
  "nounish": {
    "id": "nounish",
    "name": "Nounish",
    "properties": {
      "font": "Londrina Solid",
      "fontColor": "#333333",
      "headingsFont": "Work Sans",
      "headingsFontColor": "#000000",
      "background": "#ffffff",
      "backgroundHTML": "nounish",
      "musicURL": "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804",
      "fidgetBackground": "#FFFAFA",
      "fidgetBorderWidth": "2px",
      "fidgetBorderColor": "#F05252",
      "fidgetShadow": "0 5px 15px rgba(0,0,0,0.55)",
      "fidgetBorderRadius": "12px",
      "gridSpacing": "16"
    }
  }
}
```

---

## 4. `community_config` (CommunityConfig)

**Purpose:** Community integration data (URLs, contracts, tokens, governance)

**Structure:**
```json
{
  "type": "nouns",                    // Community type identifier
  "urls": {
    "website": "https://nouns.com",
    "discord": "https://discord.gg/nouns",
    "twitter": "https://twitter.com/nounsdao",
    "github": "https://github.com/nounsDAO",
    "forum": "https://discourse.nouns.wtf"
  },
  "social": {
    "farcaster": "nouns",            // Farcaster username/handle
    "discord": "nouns",               // Discord server identifier
    "twitter": "nounsdao"             // Twitter handle (without @)
  },
  "governance": {
    "proposals": "https://nouns.wtf/vote",
    "delegates": "https://nouns.wtf/delegates",
    "treasury": "https://nouns.wtf/treasury"
  },
  "tokens": {
    "erc20Tokens": [
      {
        "address": "0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab",
        "symbol": "$SPACE",
        "decimals": 18,
        "network": "base"
      }
    ],
    "nftTokens": [
      {
        "address": "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
        "symbol": "Nouns",
        "type": "erc721",
        "network": "eth"
      }
    ]
  },
  "contracts": {
    "nouns": "0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03",
    "auctionHouse": "0x830bd73e4184cef73443c15111a1df14e495c706",
    "space": "0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab",
    "nogs": "0xD094D5D45c06c1581f5f429462eE7cCe72215616"
  }
}
```

**Fields Explained:**

### `type`
- Community type identifier (e.g., "nouns", "clanker", "example")
- Used internally for routing/logic

### `urls`
- **`website`**: Main community website
- **`discord`**: Discord invite link
- **`twitter`**: Twitter profile URL
- **`github`**: GitHub organization URL
- **`forum`**: Forum/Discourse URL

### `social`
- **`farcaster`**: Farcaster username/handle (without @)
- **`discord`**: Discord server identifier
- **`twitter`**: Twitter handle (without @)

### `governance`
- **`proposals`**: URL to proposals/voting page
- **`delegates`**: URL to delegates page
- **`treasury`**: URL to treasury page

### `tokens`
- **`erc20Tokens`**: Array of ERC20 token definitions
  - **`address`**: Contract address (checksummed)
  - **`symbol`**: Token symbol (e.g., "$SPACE")
  - **`decimals`**: Token decimals (usually 18)
  - **`network`**: Network identifier ("mainnet", "base", "polygon", "eth")
- **`nftTokens`**: Array of NFT token definitions
  - **`address`**: Contract address
  - **`symbol`**: Token symbol (e.g., "Nouns")
  - **`type`**: Token type ("erc721", "erc1155")
  - **`network`**: Network identifier

### `contracts`
- Key-value pairs of contract names to addresses
- Common contracts:
  - **`nouns`**: Main NFT contract
  - **`auctionHouse`**: Auction house contract
  - **`space`**: Token contract
  - **`nogs`**: Additional contract
- Can include any custom contracts as key-value pairs

**Example:**
```json
{
  "type": "nouns",
  "urls": {
    "website": "https://nouns.com",
    "discord": "https://discord.gg/nouns",
    "twitter": "https://twitter.com/nounsdao",
    "github": "https://github.com/nounsDAO",
    "forum": "https://discourse.nouns.wtf"
  },
  "social": {
    "farcaster": "nouns",
    "discord": "nouns",
    "twitter": "nounsdao"
  },
  "governance": {
    "proposals": "https://nouns.wtf/vote",
    "delegates": "https://nouns.wtf/delegates",
    "treasury": "https://nouns.wtf/treasury"
  },
  "tokens": {
    "erc20Tokens": [
      {
        "address": "0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab",
        "symbol": "$SPACE",
        "decimals": 18,
        "network": "base"
      }
    ],
    "nftTokens": [
      {
        "address": "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03",
        "symbol": "Nouns",
        "type": "erc721",
        "network": "eth"
      }
    ]
  },
  "contracts": {
    "nouns": "0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03",
    "auctionHouse": "0x830bd73e4184cef73443c15111a1df14e495c706",
    "space": "0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab",
    "nogs": "0xD094D5D45c06c1581f5f429462eE7cCe72215616"
  }
}
```

---

## 5. `fidgets_config` (FidgetConfig)

**Purpose:** Control which fidgets are enabled/disabled for the community

**Structure:**
```json
{
  "enabled": [
    "nounsHome",
    "governance",
    "feed",
    "cast",
    "gallery",
    "text",
    "iframe",
    "links",
    "video",
    "channel",
    "profile",
    "snapshot",
    "swap",
    "rss",
    "market",
    "portfolio",
    "chat",
    "builderScore",
    "framesV2"
  ],
  "disabled": [
    "example"
  ]
}
```

**Fields Explained:**
- **`enabled`**: Array of fidget type IDs that are available for this community
  - Controls which fidgets appear in the fidget picker
  - Controls which fidgets can be added to spaces
  - Empty array means no fidgets enabled
- **`disabled`**: Array of fidget type IDs that are explicitly disabled
  - Overrides enabled list
  - Useful for temporarily disabling specific fidgets
  - Can be empty array `[]`

**Fidget Types (examples):**
- `nounsHome`: Community-specific home fidget
- `governance`: Governance proposals/ voting
- `feed`: Social feed (Farcaster casts)
- `cast`: Single cast display
- `gallery`: Image gallery
- `text`: Text content
- `iframe`: Embedded iframe
- `links`: Link collection
- `video`: Video player
- `channel`: Channel feed
- `profile`: User profile
- `snapshot`: Snapshot governance
- `swap`: Token swap widget
- `rss`: RSS feed
- `market`: NFT marketplace
- `portfolio`: Token portfolio
- `chat`: Chat widget
- `builderScore`: Builder score display
- `framesV2`: Farcaster frames

**Example:**
```json
{
  "enabled": [
    "feed",
    "cast",
    "gallery",
    "text",
    "iframe",
    "links",
    "video"
  ],
  "disabled": []
}
```

---

## 6. `home_page_config` (HomePageConfig)

**Purpose:** Defines the structure, layout, and content of the home page

**Structure:**
```json
{
  "defaultTab": "Nouns",                    // Tab shown by default
  "tabOrder": [                              // Order tabs appear in UI
    "Nouns",
    "Social",
    "Governance",
    "Resources",
    "Funded Works",
    "Places"
  ],
  "tabs": {
    "Nouns": {
      "name": "Nouns",                       // Internal tab identifier
      "displayName": "Nouns",                // Display name shown to users
      "layoutID": "88b78f73-37fb-4921-9410-bc298311c0bb",  // Unique layout ID
      "layoutDetails": {
        "layoutConfig": {
          "layout": [                        // Grid layout items
            {
              "w": 12,                       // Width in grid units
              "h": 10,                       // Height in grid units
              "x": 0,                        // X position
              "y": 0,                        // Y position
              "i": "nounsHome:3a8d7f19-...", // Fidget instance ID
              "minW": 2,                     // Minimum width
              "maxW": 36,                    // Maximum width
              "minH": 2,                     // Minimum height
              "maxH": 36,                    // Maximum height
              "moved": false,                // Has been moved
              "static": false,                // Is static (can't move)
              "resizeHandles": ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              "isBounded": false
            }
          ]
        },
        "layoutFidget": "grid"               // Layout type ("grid" or "mobileStack")
      },
      "theme": { /* ThemeProperties */ },    // Theme for this tab
      "fidgetInstanceDatums": {              // Fidget instances on this tab
        "nounsHome:3a8d7f19-...": {
          "config": {
            "data": {},                      // Fidget-specific data
            "editable": true,                // Can user edit?
            "settings": {                    // Fidget settings
              "background": "var(--user-theme-fidget-background)",
              "fidgetBorderColor": "var(--user-theme-fidget-border-color)",
              "showOnMobile": true,
              "isScrollable": true
            }
          },
          "fidgetType": "nounsHome",         // Type of fidget
          "id": "nounsHome:3a8d7f19-..."     // Unique fidget instance ID
        }
      },
      "fidgetTrayContents": [],             // Available fidgets in tray
      "isEditable": false,                   // Can user edit this tab?
      "timestamp": "2025-06-20T05:58:44.080Z" // Last modified timestamp
    },
    "Social": { /* ... */ },
    "Governance": { /* ... */ }
    // ... other tabs
  },
  "layout": {
    "defaultLayoutFidget": "grid",           // Default layout type
    "gridSpacing": 16,                       // Grid spacing in pixels
    "theme": {                               // Default theme
      "background": "#ffffff",
      "fidgetBackground": "#ffffff",
      "font": "Inter",
      "fontColor": "#000000"
    }
  }
}
```

**Fields Explained:**

### Top Level
- **`defaultTab`**: Tab ID shown by default when visiting `/home`
- **`tabOrder`**: Array of tab IDs in display order
- **`tabs`**: Object mapping tab IDs to tab configurations
- **`layout`**: Default layout settings

### Tab Configuration (`tabs[tabId]`)
- **`name`**: Internal identifier (usually same as key)
- **`displayName`**: User-facing name
- **`layoutID`**: Unique UUID for this layout
- **`layoutDetails`**: Grid layout configuration
  - **`layoutConfig.layout`**: Array of grid items (fidget positions)
  - **`layoutFidget`**: Layout type ("grid" or "mobileStack")
- **`theme`**: ThemeProperties for this tab
- **`fidgetInstanceDatums`**: Object mapping fidget instance IDs to fidget data
  - Each fidget instance has:
    - **`config.data`**: Fidget-specific data
    - **`config.editable`**: Can user edit this fidget?
    - **`config.settings`**: Fidget settings (styling, behavior)
    - **`fidgetType`**: Type of fidget (e.g., "feed", "nounsHome")
    - **`id`**: Unique instance ID
- **`fidgetTrayContents`**: Array of fidgets available in the tray (usually empty for home page)
- **`isEditable`**: Can user edit this tab? (usually `false` for home page)
- **`timestamp`**: ISO timestamp of last modification

### Layout Configuration
- **`defaultLayoutFidget`**: Default layout type ("grid" or "mobileStack")
- **`gridSpacing`**: Spacing between grid items in pixels
- **`theme`**: Default theme properties

**Example:**
```json
{
  "defaultTab": "Nouns",
  "tabOrder": ["Nouns", "Social", "Governance"],
  "tabs": {
    "Nouns": {
      "name": "Nouns",
      "displayName": "Nouns",
      "layoutID": "88b78f73-37fb-4921-9410-bc298311c0bb",
      "layoutDetails": {
        "layoutConfig": {
          "layout": [
            {
              "w": 12,
              "h": 10,
              "x": 0,
              "y": 0,
              "i": "nounsHome:3a8d7f19-3e77-4c2b-9c7f-1a6f5f5a6f01",
              "minW": 2,
              "maxW": 36,
              "minH": 2,
              "maxH": 36,
              "moved": false,
              "static": false,
              "resizeHandles": ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
              "isBounded": false
            }
          ]
        },
        "layoutFidget": "grid"
      },
      "theme": {
        "id": "Homebase-Tab 4 - 1-Theme",
        "name": "Homebase-Tab 4 - 1-Theme",
        "properties": {
          "background": "#ffffff",
          "backgroundHTML": "",
          "fidgetBackground": "#ffffff",
          "fidgetBorderColor": "#eeeeee",
          "fidgetBorderRadius": "0px",
          "fidgetBorderWidth": "0px",
          "fidgetShadow": "none",
          "font": "Inter",
          "fontColor": "#000000",
          "gridSpacing": "0",
          "headingsFont": "Inter",
          "headingsFontColor": "#000000",
          "musicURL": "https://www.youtube.com/watch?v=dMXlZ4y7OK4&t=1804"
        }
      },
      "fidgetInstanceDatums": {
        "nounsHome:3a8d7f19-3e77-4c2b-9c7f-1a6f5f5a6f01": {
          "config": {
            "data": {},
            "editable": true,
            "settings": {
              "background": "var(--user-theme-fidget-background)",
              "fidgetBorderColor": "var(--user-theme-fidget-border-color)",
              "showOnMobile": true,
              "isScrollable": true
            }
          },
          "fidgetType": "nounsHome",
          "id": "nounsHome:3a8d7f19-3e77-4c2b-9c7f-1a6f5f5a6f01"
        }
      },
      "fidgetTrayContents": [],
      "isEditable": false,
      "timestamp": "2025-06-20T05:58:44.080Z"
    }
  },
  "layout": {
    "defaultLayoutFidget": "grid",
    "gridSpacing": 16,
    "theme": {
      "background": "#ffffff",
      "fidgetBackground": "#ffffff",
      "font": "Inter",
      "fontColor": "#000000"
    }
  }
}
```

---

## 7. `explore_page_config` (ExplorePageConfig)

**Purpose:** Defines the structure, layout, and content of the explore/discovery page

**Structure:** Same as `home_page_config` (HomePageConfig)

```json
{
  "defaultTab": "Explore",
  "tabOrder": ["Explore", "Channels", "Tokens"],
  "tabs": {
    "Explore": { /* TabConfig */ },
    "Channels": { /* TabConfig */ },
    "Tokens": { /* TabConfig */ }
  },
  "layout": {
    "defaultLayoutFidget": "grid",
    "gridSpacing": 16,
    "theme": { /* ThemeProperties */ }
  }
}
```

**Fields Explained:** Same as `home_page_config` above

**Difference from Home Page:**
- Typically has different tabs (Explore, Channels, Tokens vs. Nouns, Social, Governance)
- Usually more discovery-focused content
- May have different default fidgets

**Example:**
```json
{
  "defaultTab": "Explore",
  "tabOrder": ["Explore"],
  "tabs": {
    "Explore": {
      "name": "Explore",
      "displayName": "Explore",
      "layoutID": "explore-layout-id",
      "layoutDetails": {
        "layoutConfig": {
          "layout": []
        },
        "layoutFidget": "grid"
      },
      "theme": { /* ThemeProperties */ },
      "fidgetInstanceDatums": {},
      "fidgetTrayContents": [],
      "isEditable": false,
      "timestamp": "2025-06-20T05:58:44.080Z"
    }
  },
  "layout": {
    "defaultLayoutFidget": "grid",
    "gridSpacing": 16,
    "theme": {
      "background": "#ffffff",
      "fidgetBackground": "#ffffff",
      "font": "Inter",
      "fontColor": "#000000"
    }
  }
}
```

---

## 8. `navigation_config` (NavigationConfig) - Optional

**Purpose:** Navigation bar items and settings

**Structure:**
```json
{
  "items": [
    {
      "id": "home",
      "label": "Home",
      "href": "/home",
      "icon": "home",
      "openInNewTab": false,
      "requiresAuth": false
    },
    {
      "id": "explore",
      "label": "Explore",
      "href": "/explore",
      "icon": "explore",
      "openInNewTab": false,
      "requiresAuth": false
    },
    {
      "id": "notifications",
      "label": "Notifications",
      "href": "/notifications",
      "icon": "notifications",
      "openInNewTab": false,
      "requiresAuth": true
    },
    {
      "id": "space-token",
      "label": "$SPACE",
      "href": "/t/base/0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab/Profile",
      "icon": "space",
      "openInNewTab": false,
      "requiresAuth": false
    }
  ],
  "logoTooltip": {
    "text": "wtf is nouns?",
    "href": "https://nouns.wtf"
  },
  "showMusicPlayer": true,
  "showSocials": true
}
```

**Fields Explained:**

### `items` (Array of NavigationItem)
- **`id`**: Unique identifier for navigation item
- **`label`**: Display text
- **`href`**: URL/path to navigate to
- **`icon`**: Icon type ("home", "explore", "notifications", "search", "space", "robot", "custom")
- **`openInNewTab`**: Open link in new tab? (boolean)
- **`requiresAuth`**: Require authentication to see this item? (boolean)

### `logoTooltip` (Optional)
- **`text`**: Tooltip text shown on logo hover
- **`href`**: Optional link when clicking tooltip

### `showMusicPlayer` (Optional)
- Show music player in navigation? (boolean)

### `showSocials` (Optional)
- Show social links in navigation? (boolean)

**Example:**
```json
{
  "items": [
    {
      "id": "home",
      "label": "Home",
      "href": "/home",
      "icon": "home"
    },
    {
      "id": "explore",
      "label": "Explore",
      "href": "/explore",
      "icon": "explore"
    }
  ],
  "logoTooltip": {
    "text": "wtf is nouns?",
    "href": "https://nouns.wtf"
  },
  "showMusicPlayer": true,
  "showSocials": true
}
```

---

## 9. `ui_config` (UIConfig) - Optional

**Purpose:** UI color scheme and styling

**Structure:**
```json
{
  "primaryColor": "rgb(37, 99, 235)",        // Primary brand color
  "primaryHoverColor": "rgb(29, 78, 216)",  // Primary color on hover
  "primaryActiveColor": "rgb(30, 64, 175)", // Primary color when active
  "castButton": {
    "backgroundColor": "rgb(37, 99, 235)",   // Cast button background
    "hoverColor": "rgb(29, 78, 216)",       // Cast button hover color
    "activeColor": "rgb(30, 64, 175)"       // Cast button active color
  }
}
```

**Fields Explained:**
- **`primaryColor`**: Main brand color (RGB, hex, or CSS color)
- **`primaryHoverColor`**: Color when hovering over primary elements
- **`primaryActiveColor`**: Color when primary elements are active/pressed
- **`castButton`**: Cast button specific colors
  - **`backgroundColor`**: Default background
  - **`hoverColor`**: Hover state color
  - **`activeColor`**: Active/pressed state color

**Usage:**
- Applied to buttons, links, and interactive elements
- Used for consistent color theming across UI
- Can override theme colors for specific UI elements

**Example:**
```json
{
  "primaryColor": "rgb(37, 99, 235)",
  "primaryHoverColor": "rgb(29, 78, 216)",
  "primaryActiveColor": "rgb(30, 64, 175)",
  "castButton": {
    "backgroundColor": "rgb(37, 99, 235)",
    "hoverColor": "rgb(29, 78, 216)",
    "activeColor": "rgb(30, 64, 175)"
  }
}
```

---

## Database Schema Summary

| Column | Type | Required | Purpose |
|--------|------|----------|---------|
| `brand_config` | JSONB | ✅ Yes | Brand identity and metadata |
| `assets_config` | JSONB | ✅ Yes | Visual assets (logos, icons) |
| `theme_config` | JSONB | ✅ Yes | Theme definitions |
| `community_config` | JSONB | ✅ Yes | Community integration data |
| `fidgets_config` | JSONB | ✅ Yes | Enabled/disabled fidgets |
| `home_page_config` | JSONB | ✅ Yes | Home page structure |
| `explore_page_config` | JSONB | ✅ Yes | Explore page structure |
| `navigation_config` | JSONB | ❌ Optional | Navigation items |
| `ui_config` | JSONB | ❌ Optional | UI colors |

---

## Complete Example Config

Here's a complete example of what a full config would look like in the database:

```json
{
  "brand_config": {
    "name": "nouns",
    "displayName": "Nouns",
    "tagline": "A space for Nouns",
    "description": "The social hub for Nouns",
    "miniAppTags": ["nouns", "client", "customizable"]
  },
  "assets_config": {
    "logos": {
      "main": "/images/nouns/logo.svg",
      "icon": "/images/nouns/noggles.svg",
      "favicon": "/images/favicon.ico",
      "appleTouch": "/images/apple-touch-icon.png",
      "og": "/images/nouns/og.png",
      "splash": "/images/nouns/splash.png"
    }
  },
  "theme_config": {
    "default": { /* ThemeProperties */ },
    "nounish": { /* ThemeProperties */ }
  },
  "community_config": {
    "type": "nouns",
    "urls": { /* URLs */ },
    "social": { /* Social handles */ },
    "governance": { /* Governance URLs */ },
    "tokens": { /* Token definitions */ },
    "contracts": { /* Contract addresses */ }
  },
  "fidgets_config": {
    "enabled": ["feed", "cast", "gallery"],
    "disabled": []
  },
  "home_page_config": {
    "defaultTab": "Nouns",
    "tabOrder": ["Nouns", "Social"],
    "tabs": { /* Tab configurations */ },
    "layout": { /* Layout settings */ }
  },
  "explore_page_config": {
    "defaultTab": "Explore",
    "tabOrder": ["Explore"],
    "tabs": { /* Tab configurations */ },
    "layout": { /* Layout settings */ }
  },
  "navigation_config": {
    "items": [ /* Navigation items */ ],
    "logoTooltip": { /* Tooltip config */ },
    "showMusicPlayer": true,
    "showSocials": true
  },
  "ui_config": {
    "primaryColor": "rgb(37, 99, 235)",
    "primaryHoverColor": "rgb(29, 78, 216)",
    "primaryActiveColor": "rgb(30, 64, 175)",
    "castButton": { /* Cast button colors */ }
  }
}
```

---

## Notes

1. **All configs are JSONB** - PostgreSQL JSONB type allows:
   - Efficient storage
   - Indexing on specific keys
   - Querying with JSON operators
   - Validation with JSON schemas

2. **Optional fields** - `navigation_config` and `ui_config` are optional:
   - Can be `NULL` in database
   - Will use defaults if not provided

3. **Nested structures** - Some configs have deeply nested structures:
   - `home_page_config.tabs[tabId].fidgetInstanceDatums[fidgetId]` - Very deep nesting
   - Consider flattening if querying becomes complex

4. **Size considerations** - Large configs (especially `home_page_config` and `explore_page_config`) can be large:
   - Monitor JSONB size
   - Consider compression if needed
   - Index frequently queried fields

5. **Validation** - Consider adding JSON schema validation:
   - At application level (TypeScript types)
   - At database level (PostgreSQL CHECK constraints)
   - At API level (request validation)

