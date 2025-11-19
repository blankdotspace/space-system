# Fidget Picker System

The fidget picker is the user interface that allows users to browse, search, and add fidgets to their spaces. The system provides two picker components: a simple inline picker and an advanced modal picker with enhanced discovery features.

## Overview

When users want to add a fidget to their space, they interact with the fidget picker. The picker displays available fidgets from multiple sources, provides search and filtering capabilities, and handles the creation and placement of fidget instances in the user's space.

## Components

### FidgetPicker (Simple Picker)

The `FidgetPicker` component is a straightforward, inline picker that displays all fidgets from the `CompleteFidgets` registry. It's designed for simpler use cases where a full-featured picker isn't needed.

**Features:**
- Lists all available static fidgets from the registry
- Each fidget is displayed as a card with an icon and name
- Supports both click-to-add and drag-and-drop interactions
- Simple back button to close the picker

**Use Cases:**
- Embedded in sidebars or panels where space is limited
- Quick access to core fidgets without advanced features
- Simpler user interfaces that don't require search or filtering

### FidgetPickerModal (Advanced Picker)

The `FidgetPickerModal` is a comprehensive modal-based picker that provides enhanced discovery and selection capabilities. This is the primary picker used in most contexts, especially in the Grid layout.

**Key Features:**

**Multiple Data Sources:**
- **Static Fidgets**: Core fidgets built into the application (text, gallery, iframe, etc.)
- **Curated Sites**: Pre-configured iframe fidgets for popular websites and services
- **Mini-Apps**: Farcaster mini-apps discovered through the Neynar API

**Smart Loading Strategy:**
The modal uses a two-phase loading approach to provide immediate feedback:
1. **Immediate Display**: Local options (static fidgets and curated sites) are loaded instantly when the modal opens
2. **Background Loading**: Mini-apps are fetched asynchronously and added to the list when available
3. This ensures users see content immediately while mini-apps load in the background

**Search Functionality:**
- Real-time search with 300ms debouncing to avoid excessive API calls
- Searches across fidget names, descriptions, and tags
- Visual loading indicator during search operations
- Automatically switches to search mode when a query is entered

**Category Filtering:**
- Eight main category tags: Social, DeFi, Tools, Content, Games, Governance, Mini Apps, and Social Impact
- Single-selection filtering (clicking a selected tag deselects it)
- Tag buttons show visual feedback when selected
- Filters work in combination with search queries

**Fidget Selection Handling:**
The picker intelligently handles different fidget types:
- **Static Fidgets**: Directly adds the fidget using the standard creation flow
- **Curated Sites**: Creates an iframe fidget with the pre-configured URL already populated
- **Mini-Apps**: Creates a FramesV2 fidget with the frame URL and metadata pre-filled

**Drag and Drop Support:**
- Each fidget option can be dragged onto the grid
- Drag data includes the complete fidget instance configuration
- Automatically sets appropriate dimensions based on the fidget's size properties

## Fidget Options Service

The `FidgetOptionsService` is a singleton service that manages the collection and organization of available fidget options. It acts as the data layer for the fidget picker.

**Responsibilities:**

**Option Aggregation:**
- Collects static fidgets from the `CompleteFidgets` registry
- Loads curated sites from the curated sites configuration
- Fetches mini-apps from the Neynar API (with caching)

**Caching:**
- Mini-apps are cached for 5 minutes to reduce API calls
- Cache is automatically invalidated after expiration
- Local options (static and curated) are always available immediately

**Filtering and Sorting:**
- Filters options based on category tags and search criteria
- Sorts options by popularity (if available) and then alphabetically
- Provides filtered results based on user selections

**Search Integration:**
- Supports search queries that filter across all option types
- Can combine search with category filtering
- Returns relevant results from all three data sources

## User Flow

### Opening the Picker

1. User clicks the "Add Fidget" button or similar trigger
2. Modal opens and immediately displays local fidget options
3. Background process begins loading mini-apps
4. User sees loading indicator for mini-apps while browsing available options

### Searching for Fidgets

1. User types in the search input field
2. After 300ms of inactivity, search query is processed
3. Search runs across all available options (including mini-apps if loaded)
4. Results update to show matching fidgets
5. Category filters can be applied in combination with search

### Filtering by Category

1. User clicks a category tag button
2. Options are filtered to show only fidgets with that tag
3. Clicking the same tag again deselects it and shows all options
4. Selected tag is visually highlighted
5. Works in combination with search queries

### Adding a Fidget

**Click to Add:**
1. User clicks on a fidget option
2. System determines the fidget type (static, curated, or mini-app)
3. Appropriate creation method is called with the fidget configuration
4. Fidget instance is created and added to the space
5. If grid space is available, fidget is placed on the grid
6. If no grid space is available, fidget is added to the tray
7. Modal closes automatically

**Drag and Drop:**
1. User starts dragging a fidget option
2. Drag data is prepared with the fidget instance configuration
3. Dimensions are set based on the fidget's size properties
4. User drops the fidget onto the grid
5. Grid layout handles placement and sizing
6. Fidget is created and rendered in the new location

## Integration Points

### Grid Layout Integration

The Grid layout component uses the `FidgetPickerModal` as its primary fidget selection interface. When a fidget is selected:
- The grid checks for available space
- If space exists, the fidget is placed automatically
- If no space exists, the fidget is added to the tray
- The selected fidget is highlighted for immediate editing

### State Management

The picker components receive callback functions from parent components:
- `addFidget`: Standard fidget creation
- `addFidgetWithCustomSettings`: Creation with pre-configured settings
- `generateFidgetInstance`: Creates the fidget instance data structure
- `setExternalDraggedItem`: Configures drag and drop state
- `setCurrentlyDragging`: Tracks drag operation state

## Performance Considerations

**Loading Optimization:**
- Local options load instantly for immediate user feedback
- Mini-apps load asynchronously to avoid blocking the UI
- Caching reduces redundant API calls

**Search Debouncing:**
- 300ms debounce prevents excessive search requests
- Search only triggers when user pauses typing
- Loading indicators provide feedback during search operations

**Filtering Efficiency:**
- Client-side filtering for local options (instant)
- Server-side search for mini-apps (when needed)
- Memoized filtered results prevent unnecessary recalculations

## Future Enhancements

Potential improvements to the fidget picker system:
- Enhanced discovery algorithms for better fidget recommendations
- User favorites and recently used fidgets
- Fidget previews before adding
- Batch operations for adding multiple fidgets
- Custom fidget creation flow integration
- Advanced filtering options (by popularity, date added, etc.)

