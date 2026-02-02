# Documentation Overview

This document provides an overview of the Nounspace documentation structure and organization.

## Documentation Structure

```
docs/
├── README.md                           # Main documentation hub
├── GETTING_STARTED.md                  # Setup and quick start guide
├── CONTRIBUTING.md                     # Contributing guidelines
│
├── ARCHITECTURE/                       # System architecture documentation
│   ├── OVERVIEW.md                    # High-level architecture overview
│   ├── AUTHENTICATION.md              # Authentication system (Privy + Farcaster)
│   └── STATE_MANAGEMENT.md            # Zustand store architecture
│
├── SYSTEMS/                           # Core system documentation
│   ├── SPACES/                        # Space system
│   │   ├── OVERVIEW.md               # Space architecture and patterns
│   │   ├── SPACE_ARCHITECTURE.md     # Detailed space architecture
│   │   ├── PUBLIC_SPACES_PATTERN.md  # Public space patterns
│   │   ├── PRIVATE_SPACES.md         # Homebase encryption and cross-community
│   │   ├── TAB_OPERATIONS.md         # Tab CRUD and staged pattern
│   │   ├── MULTIPLE_LAYOUTS_OVERVIEW.md # Multiple layouts system
│   │   └── LAYOUT_MIGRATION_GUIDE.md # Layout migration guide
│   ├── STORAGE/                       # Storage system
│   │   └── SIGNED_FILE_FORMAT.md     # SignedFile wrapper format
│   ├── FIDGETS/                       # Fidget system
│   │   └── OVERVIEW.md               # Fidget architecture
│   ├── THEMES/                        # Theme system
│   │   └── OVERVIEW.md               # Theme architecture
│   ├── CONFIGURATION/                 # Configuration system
│   │   └── ARCHITECTURE_OVERVIEW.md  # Database-backed configuration system
│   ├── NAVIGATION/                    # Navigation system
│   │   └── OVERVIEW.md               # Navigation editor and management
│   └── DISCOVERY/                     # Discovery system
│       └── MINI_APP_DISCOVERY_SYSTEM.md # Mini-app discovery system
│
├── INTEGRATIONS/                      # External integrations
│   ├── FARCASTER.md                  # Farcaster protocol integration
│   └── SUPABASE.md                   # Supabase integration
│
├── OPERATIONS/                        # Operations and administration
│   └── SCRIPTS.md                    # Admin scripts (seeding, cleanup, migrations)
│
├── DEVELOPMENT/                       # Development guides
│   ├── AGENTS.md                      # AI agent instructions
│   ├── DEVELOPMENT_GUIDE.md           # Comprehensive development guide
│   ├── DEVELOPMENT_NOTES.md           # Development notes and findings
│   ├── COMPONENT_ARCHITECTURE.md     # Atomic design system
│   ├── CODING_STANDARDS.md           # Code style and standards
│   ├── TESTING.md                    # Testing strategies
│   └── DEBUGGING.md                  # Debugging guide
│
└── REFERENCE/                         # Reference documentation
    └── (placeholder directories)
```

## Available Documentation

### Core Documentation
- **README.md** - Main documentation hub with navigation
- **GETTING_STARTED.md** - Setup and installation guide
- **CONTRIBUTING.md** - Contributing guidelines

### Architecture
- **ARCHITECTURE/OVERVIEW.md** - High-level architecture with diagrams
- **ARCHITECTURE/AUTHENTICATION.md** - Complete authentication system documentation
- **ARCHITECTURE/STATE_MANAGEMENT.md** - Zustand store architecture and patterns

### Systems
- **SYSTEMS/SPACES/OVERVIEW.md** - Space architecture, public/private patterns, lifecycle
- **SYSTEMS/SPACES/SPACE_ARCHITECTURE.md** - Detailed space architecture
- **SYSTEMS/SPACES/PUBLIC_SPACES_PATTERN.md** - Public space patterns
- **SYSTEMS/SPACES/PRIVATE_SPACES.md** - Homebase encryption and cross-community behavior
- **SYSTEMS/SPACES/TAB_OPERATIONS.md** - Tab CRUD operations and staged/batch pattern
- **SYSTEMS/SPACES/MULTIPLE_LAYOUTS_OVERVIEW.md** - Multiple layouts system
- **SYSTEMS/SPACES/LAYOUT_MIGRATION_GUIDE.md** - Layout migration guide
- **SYSTEMS/STORAGE/SIGNED_FILE_FORMAT.md** - SignedFile wrapper format for storage
- **SYSTEMS/FIDGETS/OVERVIEW.md** - Fidget system, types, development patterns
- **SYSTEMS/THEMES/OVERVIEW.md** - Theme system, customization, CSS variables
- **SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW.md** - Database-backed configuration system
- **SYSTEMS/NAVIGATION/OVERVIEW.md** - Navigation editor and management system
- **SYSTEMS/DISCOVERY/MINI_APP_DISCOVERY_SYSTEM.md** - Mini-app discovery system

### Integrations
- **INTEGRATIONS/FARCASTER.md** - Farcaster protocol integration, FID management, social features
- **INTEGRATIONS/SUPABASE.md** - Database, storage, authentication, real-time features

### Operations
- **OPERATIONS/SCRIPTS.md** - Admin scripts for seeding, cleanup, and migrations

### Development
- **DEVELOPMENT/AGENTS.md** - AI agent instructions and guidelines
- **DEVELOPMENT/DEVELOPMENT_GUIDE.md** - Comprehensive development guide
- **DEVELOPMENT/DEVELOPMENT_NOTES.md** - Development notes and findings
- **DEVELOPMENT/COMPONENT_ARCHITECTURE.md** - Atomic design, patterns, best practices
- **DEVELOPMENT/CODING_STANDARDS.md** - TypeScript, React, testing, security standards
- **DEVELOPMENT/TESTING.md** - Unit, integration, E2E, accessibility testing
- **DEVELOPMENT/DEBUGGING.md** - Debugging tools, techniques, common issues

## Key Features

### 1. Organized Structure
- Logical hierarchy by topic and concern
- Clear separation between architecture, systems, and development guides
- Easy navigation with comprehensive README

### 2. Accurate Documentation
- All documentation reflects actual codebase implementation
- Real code examples from the codebase
- Best practices and patterns

### 3. Comprehensive Coverage
- Architecture documentation with diagrams
- System-specific guides with code examples
- Integration guides for external services
- Development guides for contributors

### 4. Practical Examples
- Real code examples from the codebase
- Common issues and troubleshooting
- Testing strategies

## Getting Started

### For Developers
1. **Start with README.md** - The main hub provides navigation to all documentation
2. **Use GETTING_STARTED.md** - Quick setup and installation guide
3. **Reference Architecture Docs** - Understand the system before making changes
4. **Follow Coding Standards** - Ensure consistency with project standards

### For Contributors
1. **Read CONTRIBUTING.MD** - Guidelines for contributions
2. **Review Coding Standards** - Follow TypeScript and React best practices
3. **Write Tests** - Follow testing guide for comprehensive coverage
4. **Document Changes** - Update relevant documentation with code changes

### For Users
1. **Explore Systems Docs** - Learn about spaces, fidgets, and themes
2. **Check Integration Guides** - Understand external service integrations
3. **Use Troubleshooting Sections** - Find solutions to common issues
