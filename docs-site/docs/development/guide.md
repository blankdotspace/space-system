# Blankspace - Instructions

## 1. Overview

Blankspace is a highly customizable [Farcaster](https://farcaster.xyz/) client, initially funded by a grant from [Nouns DAO](https://nouns.wtf/). The project aims to provide users with a unique social media experience where they can personalize their profile space and personal feed with Themes, Tabs, and mini-applications called Fidgets.

### Problem Statements
- Traditional social media platforms offer limited customization options
- Users need more control over their social media experience
- Decentralized applications often lack user-friendly interfaces
- Farcaster ecosystem needs versatile, feature-rich clients

### Core Functionality
- **Customizable User Spaces**: Personalized profile spaces with themes and layouts
- **Theme System**: Visual customization of the user interface
- **Fidgets**: Mini-applications that add functionality to spaces
- **Multiple Layouts**: Support for various layouts and viewing modes
- **Integration with Farcaster**: Seamless interaction with the Farcaster protocol
- **Authentication**: Secure authentication through Privy with custom identity management

## 2. Tech Stack

### Frontend
- **Framework**: Next.js v15.2.2
- **Language**: TypeScript v5.1.6
- **UI Library**: React v18.3.1
- **Styling**: Tailwind CSS v3.4.17
- **State Management**: Zustand v4.5.2 with mutative v1.0.3 middleware

### Backend & Services
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **API Client**: Axios v1.8.3
- **Data Fetching**: React Query v5.40.0

### Authentication & Blockchain
- **Auth**: Privy v1.73.1
- **Wallet Integration**: 
  - Wagmi v2.16.3
  - Viem v2.35.1
  - Rainbow Kit v2.2.5
- **Farcaster Integration**: 
  - @farcaster/core v0.18.5
  - @farcaster/frame-sdk v0.0.53
  - @farcaster/hub-nodejs v0.15.5
  - @farcaster/hub-web v0.11.4
  - @farcaster/miniapp-sdk v0.1.7
  - Neynar SDK v2.23.0

### UI Components
- **Core Components**: Radix UI (various packages)
- **Icons**: Heroicons v2.0.18, Lucide React v0.469.0
- **Animations**: Framer Motion v11.3.30

### Development Tools
- **Linting**: ESLint v8.57.0
- **Formatting**: Prettier v3.3.1
- **Testing**: Vitest v1.5.0
- **Git Hooks**: Husky v9.0.11, lint-staged v15.2.5

### Environment Requirements
- **Node**: v22.11.0
- **Browsers**: Last 3 Chrome versions, Safari 13+

## 3. Project Structure

The project follows the Atomic Design Pattern and is organized as follows:

```
/src
├── app/                   # Next.js App Router components and routes
│   ├── (spaces)/          # Space-related routes and components
│   ├── api/               # API routes for backend services
│   ├── explore/           # Exploration and discovery pages
│   └── home/              # Home page components
├── authenticators/        # Authentication system components
│   └── farcaster/         # Farcaster-specific authentication
├── common/                # Shared code, components, and utilities
│   ├── components/        # UI components following atomic design
│   ├── data/              # State management, API clients, DB connections
│   ├── fidgets/           # Core fidget functionality
│   ├── lib/               # Utility functions and helpers
│   ├── providers/         # React context providers
│   ├── stores/            # Zustand stores
│   └── utils/             # General utilities
├── constants/             # Application-wide constants and configurations
├── contracts/             # Blockchain contract interfaces
├── fidgets/               # Mini-applications that can be added to spaces
│   ├── community/         # Community-focused fidgets
│   ├── farcaster/         # Farcaster-specific fidgets
│   └── ui/                # UI-related fidgets
├── pages/                 # Legacy Next.js pages (API routes)
│   └── api/               # API endpoints
├── styles/                # Global CSS and styling utilities
└── supabase/              # Supabase database types and configuration
```

### Key Directories Explained

- **app/**: Next.js App Router components organized by route
- **common/components/**: UI components organized by atomic design principles
- **common/data/**: Data access layer including API clients, database connections, and stores
- **fidgets/**: Self-contained mini-applications that can be added to user spaces
- **constants/**: Application-wide configuration and constants
- **authenticators/**: Authentication system components for different platforms

## 4. Coding Standards

### TypeScript Standards
- Use strict type definitions
- Avoid `any` types whenever possible
- Define interfaces and types in appropriate files
- Use generics for reusable components and functions
- Ensure proper typing for Zustand stores and API responses

### Styling Approach
- Use Tailwind CSS for component styling
- Follow the `mergeClasses` pattern for conditional class names
- Use design tokens from the theme system
- Prefer component-scoped styles over global styles

### Component Structure
```typescript
import React from "react";
import { someUtility } from "@/common/lib/utils";

interface ComponentProps {
  prop1: string;
  prop2: number;
  onAction: () => void;
}

export const ComponentName: React.FC<ComponentProps> = ({ 
  prop1, 
  prop2, 
  onAction 
}) => {
  // Component logic here
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

### Hook Pattern
```typescript
import { useState, useEffect } from "react";

export function useCustomHook(params: HookParams): HookResult {
  const [state, setState] = useState<StateType>(initialState);
  
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup logic
    };
  }, [dependencies]);
  
  // Hook functions
  
  return {
    // Return values
  };
}
```

### Store Pattern (Zustand with mutative)
```typescript
interface StoreState {
  // State properties
}

interface StoreActions {
  // Action methods
}

export type StoreType = StoreState & StoreActions;

export const storeDefaults: StoreState = {
  // Default values
};

export const createStoreFunc = (
  set: StoreSet<AppStore>,
  get: StoreGet<AppStore>,
): StoreType => ({
  ...storeDefaults,
  // Implement actions
});
```

### Linting Rules
- ESLint with Next.js, React, and TypeScript plugins
- Prettier for code formatting
- Conventional commits for version control
- Husky pre-commit hooks for enforcing standards

### PR Conventions
- PR titles begin with either "[FIDGET]" or "[CLIENT]"
- PR bodies outline the changes made and the rationale
- All PRs contain no new type errors and are fully valid TypeScript code

## 5. User Stories

### Visitor
- As a visitor, I want to explore public spaces to understand what Blankspace offers
- As a visitor, I want to easily sign up and create my own space
- As a visitor, I want to browse through different themes and layouts

### New User
- As a new user, I want to customize my profile space with a theme that matches my personality
- As a new user, I want to add fidgets to my space to enhance functionality
- As a new user, I want to connect my Farcaster account to participate in the ecosystem
- As a new user, I want to follow other users and add their content to my feed

### Active User
- As an active user, I want to switch between different layouts for different contexts
- As an active user, I want to organize my content with custom tabs
- As an active user, I want to interact with frames and mini-apps within Blankspace
- As an active user, I want to view my notifications and messages in one place
- As an active user, I want to share my customized space with others

### Developer
- As a developer, I want to create new fidgets that integrate with the Blankspace ecosystem
- As a developer, I want to contribute to the Blankspace codebase following established patterns
- As a developer, I want to implement new themes and layouts for the community

## 6. APIs and Integrations

### Farcaster Protocol
- **Integration**: @farcaster/core, @farcaster/hub-web
- **Purpose**: Core protocol integration for social data
- **Features**: Identity, posts (casts), replies, reactions

### Neynar API
- **Integration**: @neynar/nodejs-sdk
- **Purpose**: Enhanced Farcaster data access
- **Endpoints**: User data, casts, trends, notifications
- **Documentation**: https://docs.neynar.com/

### Privy Auth
- **Integration**: @privy-io/react-auth
- **Purpose**: User authentication and identity management
- **Features**: Social logins, wallet connections, key management
- **Documentation**: https://docs.privy.io/

### Supabase
- **Integration**: @supabase/supabase-js
- **Purpose**: Database and storage
- **Features**: User data, space configurations, caching
- **Documentation**: https://supabase.com/docs

### Blockchain Integrations
- **Integration**: wagmi, viem, ethers.js
- **Purpose**: Smart contract interactions, wallet connections
- **Networks**: Ethereum, Optimism, Base
- **Features**: Token interactions, blockchain data

### Mini App Discovery System
- **Integration**: Neynar Mini Apps Catalog API
- **Purpose**: Discover and integrate Farcaster frames and mini-apps
- **Features**: Trending apps, categorized apps, search functionality
- **Caching**: 15-minute refresh with database fallback

### External Services
- **YouTube API**: Video embedding and data
- **CoinGecko API**: Cryptocurrency price data
- **Etherscan API**: Blockchain transaction and contract data
- **Alchemy API**: Enhanced blockchain data access
- **Clanker API**: AI-enhanced content features

### Frame Integration
- **Integration**: @farcaster/frame-sdk, frames.js
- **Purpose**: Support for Farcaster Frames
- **Features**: Frame rendering, interaction, creation
- **Documentation**: https://docs.farcaster.xyz/frames
