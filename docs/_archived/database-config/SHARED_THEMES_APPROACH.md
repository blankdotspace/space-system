# Shared Themes Approach

## Overview

Move themes out of individual community configs into a shared file, since themes are reusable across communities with only minor customizations.

## Current State

- Each community has its own `{community}.theme.ts` file
- Themes are mostly identical (same structure, different values)
- Themes take up 5.5 KB (66.7% of remaining config)

## Proposed Location Options

### Option 1: `src/config/shared/themes.ts` (Recommended)

**Structure:**
```
src/config/
├── shared/
│   └── themes.ts          # Shared theme definitions
├── nouns/
│   └── nouns.theme.ts      # Community-specific overrides (optional)
└── ...
```

**Pros:**
- ✅ Clear organization - shared configs in `shared/` folder
- ✅ Easy to find - obvious location
- ✅ Extensible - can add other shared configs later
- ✅ Separates shared from community-specific

**Cons:**
- ⚠️ New directory structure

### Option 2: `src/config/themes.ts`

**Structure:**
```
src/config/
├── themes.ts               # Shared themes at root
├── nouns/
└── ...
```

**Pros:**
- ✅ Simple - no new directory
- ✅ Easy to import

**Cons:**
- ⚠️ Mixes shared with community configs
- ⚠️ Less clear organization

### Option 3: `src/common/config/themes.ts`

**Structure:**
```
src/common/
├── config/
│   └── themes.ts          # Shared themes
└── ...
```

**Pros:**
- ✅ In `common/` (shared code)
- ✅ Separated from community configs

**Cons:**
- ⚠️ New directory structure
- ⚠️ Mixes config with common utilities

## Recommendation: `src/config/shared/themes.ts`

**Why:**
1. **Clear organization** - `shared/` folder makes intent obvious
2. **Extensible** - Can add other shared configs (e.g., `shared/defaultFidgets.ts`)
3. **Consistent** - Keeps configs in config directory
4. **Easy imports** - `import { themes } from '@/config/shared/themes'`

## Implementation Approach

### Option A: Single Shared File (All Themes)

Store all theme variants in one shared file:

```typescript
// src/config/shared/themes.ts

export const sharedThemes = {
  default: { /* ... */ },
  nounish: { /* ... */ },
  gradientAndWave: { /* ... */ },
  colorBlobs: { /* ... */ },
  floatingShapes: { /* ... */ },
  imageParallax: { /* ... */ },
  shootingStar: { /* ... */ },
  squareGrid: { /* ... */ },
  tesseractPattern: { /* ... */ },
  retro: { /* ... */ },
};
```

**Pros:**
- ✅ Single source of truth
- ✅ Easy to maintain
- ✅ All communities use same themes

**Cons:**
- ⚠️ No community customization
- ⚠️ Can't override specific themes per community

### Option B: Shared Base + Community Overrides

Store base themes in shared file, allow community-specific overrides:

```typescript
// src/config/shared/themes.ts

export const baseThemes = {
  default: { /* ... */ },
  nounish: { /* ... */ },
  // ... all themes
};

// src/config/nouns/nouns.theme.ts

import { baseThemes } from '../../shared/themes';

export const nounsTheme = {
  ...baseThemes,
  // Override specific themes if needed
  default: {
    ...baseThemes.default,
    properties: {
      ...baseThemes.default.properties,
      musicURL: "https://...", // Nouns-specific music
    },
  },
};
```

**Pros:**
- ✅ Shared base themes
- ✅ Allows community customization
- ✅ Best of both worlds

**Cons:**
- ⚠️ More complex
- ⚠️ Need merge logic

### Option C: Shared Themes + Community Theme Config

Store themes in shared file, reference from community config:

```typescript
// src/config/shared/themes.ts

export const themes = {
  default: { /* ... */ },
  nounish: { /* ... */ },
  // ... all themes
};

// src/config/nouns/nouns.theme.ts

import { themes } from '../../shared/themes';

// Just export shared themes (or override if needed)
export const nounsTheme = themes;
```

**Pros:**
- ✅ Simplest approach
- ✅ Single source of truth
- ✅ Easy to use

**Cons:**
- ⚠️ No community customization (but maybe that's fine?)

## Recommended: Option C (Simple Shared Reference)

**Why:**
- Themes are visual templates, not community-specific
- Communities can customize via theme editor at runtime
- Keeps config simple and maintainable

## Database Storage

**Option 1: Store in Database as Shared Resource**

```sql
CREATE TABLE shared_themes (
  id UUID PRIMARY KEY,
  theme_id VARCHAR(50) UNIQUE,  -- 'default', 'nounish', etc.
  theme_config JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Option 2: Store in Code (Recommended for Now)**

Keep themes in code, reference from config:
- Themes are code/templates, not data
- Easier to version control
- Can move to DB later if needed

## Size Impact

**Before:**
- theme: 5.5 KB (66.7% of config)

**After:**
- theme: Removed from config (0 KB)
- Config size: ~2.8 KB (down from 8.3 KB)
- **Total reduction: 90%** (from 29 KB to 2.8 KB)

## Migration Steps

1. **Create `src/config/shared/themes.ts`**
   - Move theme definitions from nouns.theme.ts
   - Export as `themes` object

2. **Update community configs**
   - Change `nouns.theme.ts` to import from shared
   - Update other communities similarly

3. **Update SystemConfig interface**
   - Keep `theme: ThemeConfig` in interface
   - But it now references shared themes

4. **Update database schema**
   - Remove `theme_config` column (or keep as reference)
   - Or store theme reference IDs

5. **Update build-time config**
   - Themes loaded from shared file, not DB
   - Or fetch from DB if storing there

## Final Config Size

After removing homePage, explorePage, and theme:

| Section | Size | Percentage |
|---------|------|------------|
| community | 1.4 KB | 50% |
| navigation | 0.5 KB | 18% |
| assets | 0.3 KB | 11% |
| brand | 0.2 KB | 7% |
| fidgets | 0.2 KB | 7% |
| ui | 0.2 KB | 7% |
| **TOTAL** | **~2.8 KB** | **100%** |

**Result:** Config is now tiny! Easily fits in env vars or generated file.

