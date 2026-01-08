# Navigation Component Refactoring Plan

## Current State
- **File**: `Navigation.tsx` (903 lines)
- **Responsibilities**: Display, editing, state management, modals, footer
- **Issues**: Too large, mixed concerns, hard to test/maintain

## Recommended Split

### 1. **Core Navigation Component** (`Navigation.tsx`)
**Purpose**: Main coordinator component (~150-200 lines)
**Responsibilities**:
- Layout structure (nav element, sidebar container)
- State initialization (load navigation, hooks)
- Mode switching (edit vs normal)
- Render sub-components

**Structure**:
```typescript
<nav>
  <NavigationHeader />
  <NavigationContent>
    {navEditMode ? <NavigationEditor /> : <NavigationList />}
  </NavigationContent>
  <NavigationFooter />
</nav>
```

---

### 2. **Navigation Editor** (`NavigationEditor.tsx`)
**Purpose**: Edit mode UI (~200-250 lines)
**Extract from**: Lines 544-733
**Responsibilities**:
- Drag-and-drop reordering
- Editable nav items with rename/delete
- Add new item button
- Commit/Cancel buttons
- Disabled system items display

**Props**:
```typescript
interface NavigationEditorProps {
  items: NavigationItem[];
  isShrunk: boolean;
  pathname: string;
  onReorder: (newOrder: NavigationItem[]) => void;
  onRename: (itemId: string, label: string) => void;
  onDelete: (itemId: string) => void;
  onCreate: () => void;
  onCommit: () => void;
  onCancel: () => void;
  hasUncommittedChanges: boolean;
  systemConfig: SystemConfig;
  isLoggedIn: boolean;
  // ... other props
}
```

---

### 3. **Navigation List** (`NavigationList.tsx`)
**Purpose**: Normal mode display (~150-200 lines)
**Extract from**: Lines 735-811
**Responsibilities**:
- Render navigation items
- System items (notifications, search, my space, login/logout)
- Edit button (for admins)

**Props**:
```typescript
interface NavigationListProps {
  items: NavigationItem[];
  isShrunk: boolean;
  pathname: string;
  systemConfig: SystemConfig;
  isLoggedIn: boolean;
  isNavigationEditable: boolean;
  navEditMode: boolean;
  onEnterEditMode: () => void;
  // ... other props
}
```

---

### 4. **Navigation Item** (`NavigationItem.tsx`)
**Purpose**: Individual nav item component (~100-150 lines)
**Extract from**: Lines 381-432, 434-459
**Responsibilities**:
- Render single nav item (link or button)
- Handle click events
- Badge display
- Active state styling

**Props**:
```typescript
interface NavigationItemProps {
  item: NavigationItem;
  isActive: boolean;
  isShrunk: boolean;
  badgeText?: string | null;
  systemConfig: SystemConfig;
  onClick?: () => void;
  // ... other props
}
```

---

### 5. **Editable Navigation Item** (`EditableNavigationItem.tsx`)
**Purpose**: Edit mode nav item (~150-200 lines)
**Extract from**: Lines 560-648 (edit mode item rendering)
**Responsibilities**:
- Drag handle
- Editable text input
- Delete button
- URL update on rename

**Props**:
```typescript
interface EditableNavigationItemProps {
  item: NavigationItem;
  isActive: boolean;
  isShrunk: boolean;
  pathname: string;
  localNavigation: NavigationItem[];
  onRename: (itemId: string, label: string) => void;
  onDelete: (itemId: string) => void;
  iconFor: (key?: string) => React.FC;
  // ... other props
}
```

---

### 6. **Navigation Footer** (`NavigationFooter.tsx`)
**Purpose**: Footer section (~100-150 lines)
**Extract from**: Lines 815-891
**Responsibilities**:
- Music player
- Cast button
- Social links (Discord)
- Terms/Privacy links

**Props**:
```typescript
interface NavigationFooterProps {
  isShrunk: boolean;
  isLoggedIn: boolean;
  systemConfig: SystemConfig;
  userTheme: UserTheme;
  onOpenCastModal: () => void;
  // ... other props
}
```

---

### 7. **Navigation Header** (`NavigationHeader.tsx`)
**Purpose**: Header section (~50 lines)
**Extract from**: Lines 534-536
**Responsibilities**:
- Brand header
- Collapse/expand button

**Props**:
```typescript
interface NavigationHeaderProps {
  systemConfig: SystemConfig;
  isShrunk: boolean;
  onToggleShrink: () => void;
  isMobile: boolean;
}
```

---

### 8. **Navigation Hooks** (`useNavigation.ts`)
**Purpose**: Extract complex logic (~100-150 lines)
**Extract from**: Lines 121-243
**Responsibilities**:
- Navigation store access
- Loading logic
- Commit/cancel handlers
- Create item handler

**Returns**:
```typescript
interface UseNavigationReturn {
  localNavigation: NavigationItem[];
  hasUncommittedChanges: boolean;
  loadNavigation: (config: NavigationConfig) => void;
  handleCommit: () => Promise<void>;
  handleCancel: () => void;
  handleCreateItem: () => Promise<void>;
  // ... other handlers
}
```

---

### 9. **Navigation System Items** (`NavigationSystemItems.tsx`)
**Purpose**: System items (notifications, search, etc.) (~100 lines)
**Extract from**: Lines 686-733, 756-796
**Responsibilities**:
- Render notifications
- Render search
- Render my space
- Render login/logout

**Props**:
```typescript
interface NavigationSystemItemsProps {
  isShrunk: boolean;
  isLoggedIn: boolean;
  isInitializing: boolean;
  username?: string;
  notificationBadgeText?: string | null;
  systemConfig: SystemConfig;
  onOpenSearch: () => void;
  onLogout: () => void;
  onLogin: () => void;
  CurrentUserImage: React.FC;
  // ... other props
}
```

---

## File Structure After Refactor

```
src/common/components/organisms/navigation/
├── Navigation.tsx                    (~150 lines) - Main coordinator
├── NavigationEditor.tsx              (~200 lines) - Edit mode
├── NavigationList.tsx                (~150 lines) - Normal mode
├── NavigationItem.tsx                (~100 lines) - Single item (normal)
├── EditableNavigationItem.tsx       (~150 lines) - Single item (edit)
├── NavigationFooter.tsx              (~100 lines) - Footer section
├── NavigationHeader.tsx              (~50 lines) - Header section
├── NavigationSystemItems.tsx         (~100 lines) - System items
└── hooks/
    └── useNavigation.ts              (~100 lines) - Navigation logic hook
```

**Total**: ~1100 lines (slightly more due to imports/props, but much better organized)

---

## Benefits

1. **Single Responsibility**: Each component has one clear purpose
2. **Testability**: Smaller components are easier to unit test
3. **Reusability**: Components can be reused independently
4. **Maintainability**: Changes are isolated to specific files
5. **Readability**: Easier to understand and navigate
6. **Performance**: Better code splitting opportunities

---

## Migration Strategy

### Phase 1: Extract Hooks (Low Risk)
1. Create `useNavigation.ts`
2. Move logic from Navigation.tsx
3. Update Navigation.tsx to use hook
4. Test

### Phase 2: Extract Sub-Components (Medium Risk)
1. Extract `NavigationItem.tsx` (used in both modes)
2. Extract `NavigationSystemItems.tsx`
3. Extract `NavigationHeader.tsx`
4. Extract `NavigationFooter.tsx`
5. Test each extraction

### Phase 3: Split Main Component (Higher Risk)
1. Extract `NavigationEditor.tsx`
2. Extract `NavigationList.tsx`
3. Refactor `Navigation.tsx` to coordinator
4. Comprehensive testing

---

## Alternative: Simpler Split

If the full refactor is too much, a simpler approach:

1. **Navigation.tsx** (~400 lines) - Main component
2. **NavigationEditor.tsx** (~300 lines) - All edit mode logic
3. **NavigationItem.tsx** (~200 lines) - Item rendering (both modes)

This still provides significant improvement with less work.

---

## Recommended Approach

**Start with the simpler split**, then gradually extract more if needed:

1. ✅ Extract `NavigationEditor.tsx` (biggest win)
2. ✅ Extract `NavigationItem.tsx` (reusable)
3. ✅ Extract `useNavigation.ts` (cleaner logic)
4. ⏸️ Extract footer/header later if needed

This gives ~70% of the benefit with ~30% of the effort.

