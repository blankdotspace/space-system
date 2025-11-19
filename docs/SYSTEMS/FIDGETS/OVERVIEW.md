# Fidget System Overview

Fidgets are mini-applications that can be added to spaces to provide specific functionality. The fidget system is built on a modular architecture with support for different types of fidgets, configuration management, and layout integration.

## Core Concepts

### Fidget Types

1. **UI Fidgets** - Basic UI components (text, gallery, iframe, etc.)
2. **Farcaster Fidgets** - Farcaster protocol integration (casts, feeds, frames)
3. **Community Fidgets** - Community-specific functionality (governance, snapshot)
4. **Layout Fidgets** - Layout management (grid, mobile stack)
5. **Token Fidgets** - Token and portfolio management
6. **Custom Fidgets** - User-created fidgets

### Fidget Architecture

```typescript
// Fidget instance data structure
export type FidgetInstanceData = {
  id: string;
  fidgetType: string;
  config: FidgetConfig;
};

// Fidget configuration
export type FidgetConfig = {
  editable: boolean;
  data: Record<string, any>;
  settings: FidgetSettings;
};

// Fidget bundle (instance + properties)
export type FidgetBundle = FidgetInstanceData & {
  properties: FidgetProperties;
};
```

## Fidget System Components

### 1. Fidget Registry

The `CompleteFidgets` registry contains all available fidgets:

```typescript
export const CompleteFidgets = {
  // UI Fidgets
  gallery: Gallery,
  text: TextFidget,
  iframe: IFrame,
  links: Links,
  video: VideoFidget,
  channel: Channel,
  profile: Profile,
  
  // Farcaster Fidgets
  frame: Frame,
  feed: Feed,
  cast: Cast,
  builderScore: BuilderScore,
  
  // Community Fidgets
  governance: NounishGovernance,
  snapShot: snapShot,
  nounsHome: NounsHome,
  
  // Token Fidgets
  market: marketData,
  portfolio: Portfolio,
  swap: Swap,
  
  // Other Fidgets
  rss: rss,
  chat: chat,
  framesV2: FramesFidget,
  
  // Development only
  example: Example, // Only in development
};
```

### 2. Fidget Properties

Each fidget defines its properties and configuration:

```typescript
// Fidget properties structure
export type FidgetProperties = {
  fidgetName: string;
  description: string;
  fields: FidgetField[];
  category: string;
  tags: string[];
  version: string;
};
```

### 3. Fidget Instance Management

```typescript
// Create fidget instance
const generateFidgetInstance = (
  fidgetId: string,
  fidget: FidgetModule<FidgetArgs>,
  customSettings?: Partial<FidgetSettings>,
): FidgetInstanceData => {
  const baseSettings = allFields(fidget);
  const finalSettings = customSettings ? { ...baseSettings, ...customSettings } : baseSettings;

  return {
    config: {
      editable: true,
      data: {},
      settings: finalSettings,
    },
    fidgetType: fidgetId,
    id: fidgetId + ":" + uuidv4(),
  };
};
```

## Fidget Discovery and Selection

Users discover and add fidgets through the fidget picker system, which provides search, filtering, and multiple data sources. For detailed information about how the fidget picker works, see [Fidget Picker System](./FIDGET_PICKER.md).

## Fidget Lifecycle

### 1. Creation

```typescript
// Create new fidget
const createFidget = async (
  fidgetType: string,
  settings: FidgetSettings,
  position: { x: number; y: number }
) => {
  const fidgetInstance = generateFidgetInstance(fidgetType, fidget, settings);
  
  // Add to space
  set((draft) => {
    draft.homebase.spaces[spaceId].tabs[tabName].fidgetInstanceDatums[fidgetInstance.id] = fidgetInstance;
  }, "createFidget");
  
  // Save to server
  await saveFidgetConfig(fidgetInstance.id, fidgetType)(fidgetInstance.config);
};
```

### 2. Configuration

```typescript
// Configure fidget settings
const configureFidget = async (
  fidgetId: string,
  newSettings: FidgetSettings
) => {
  const currentConfig = get().homebase.spaces[spaceId].tabs[tabName].fidgetInstanceDatums[fidgetId];
  
  // Update configuration
  set((draft) => {
    draft.homebase.spaces[spaceId].tabs[tabName].fidgetInstanceDatums[fidgetId].config.settings = newSettings;
  }, "configureFidget");
  
  // Save to server
  await saveFidgetConfig(fidgetId, currentConfig.fidgetType)({
    ...currentConfig.config,
    settings: newSettings,
  });
};
```

### 3. Rendering

```typescript
// Render fidget in layout
const renderFidget = (fidgetData: FidgetInstanceData, isEditable: boolean) => {
  const fidgetModule = CompleteFidgets[fidgetData.fidgetType];
  if (!fidgetModule) return null;
  
  const bundle = createFidgetBundle(fidgetData, isEditable);
  if (!bundle) return null;
  
  return (
    <fidgetModule.Component
      {...bundle.config}
      properties={bundle.properties}
      theme={theme}
      onSave={onSave}
      onRemove={onRemove}
    />
  );
};
```

## Layout Integration

### 1. Grid Layout

```typescript
// Grid layout fidget
const Grid: LayoutFidget<GridLayoutProps> = ({
  fidgetInstanceDatums,
  layoutConfig,
  theme,
  saveConfig,
}) => {
  const fidgetBundles = useMemo(() => {
    const bundles: Record<string, FidgetBundle> = {};
    
    Object.values(fidgetInstanceDatums).forEach(fidgetData => {
      const bundle = createFidgetBundle(fidgetData, true);
      if (bundle) {
        bundles[fidgetData.id] = bundle;
      }
    });
    
    return bundles;
  }, [fidgetInstanceDatums]);
  
  return (
    <div className="grid-layout">
      {Object.values(fidgetBundles).map(bundle => (
        <FidgetRenderer
          key={bundle.id}
          bundle={bundle}
          onSave={saveConfig}
          theme={theme}
        />
      ))}
    </div>
  );
};
```

### 2. Mobile Stack Layout

```typescript
// Mobile stack layout fidget
const MobileStack: LayoutFidget<TabFullScreenProps> = ({
  fidgetInstanceDatums,
  layoutConfig,
  theme,
  feed,
  isHomebasePath = false,
}) => {
  const validFidgetIds = useMemo(() => 
    getValidFidgetIds(layoutConfig.layout, fidgetInstanceDatums, isMobile),
  [layoutConfig.layout, fidgetInstanceDatums, isMobile]);
  
  const fidgetBundles = useMemo(() => {
    const bundles: Record<string, FidgetBundle> = {};
    
    validFidgetIds.forEach(id => {
      const fidgetData = fidgetInstanceDatums[id];
      if (!fidgetData) return;
      
      const bundle = createFidgetBundle(fidgetData, false);
      if (bundle) {
        bundles[id] = bundle;
      }
    });
    
    return bundles;
  }, [validFidgetIds, fidgetInstanceDatums]);
  
  return (
    <div className="mobile-stack">
      {feed && <div className="feed-section">{feed}</div>}
      {Object.values(fidgetBundles).map(bundle => (
        <FidgetRenderer
          key={bundle.id}
          bundle={bundle}
          theme={theme}
        />
      ))}
    </div>
  );
};
```

## Fidget Development

### 1. Creating a Fidget

```typescript
// Example fidget implementation
const MyFidget: FidgetModule<MyFidgetArgs> = {
  Component: ({ config, properties, theme, onSave, onRemove }) => {
    const [settings, setSettings] = useState(config.settings);
    
    const handleSave = (newSettings: FidgetSettings) => {
      setSettings(newSettings);
      onSave(newSettings);
    };
    
    return (
      <div className="my-fidget">
        <h3>{properties.fidgetName}</h3>
        <SettingsEditor
          settings={settings}
          properties={properties}
          onSave={handleSave}
        />
        {config.editable && (
          <button onClick={onRemove}>Remove</button>
        )}
      </div>
    );
  },
  properties: {
    fidgetName: "My Fidget",
    description: "A custom fidget",
    fields: [
      {
        fieldName: "title",
        type: "string",
        default: "Default Title",
        label: "Title"
      }
    ],
    category: "custom",
    tags: ["custom", "example"],
    version: "1.0.0"
  }
};
```

### 2. Fidget Settings

```typescript
// Fidget settings structure
export type FidgetSettings = Record<string, any>;

// Settings field definition
export type FidgetField = {
  fieldName: string;
  type: "string" | "number" | "boolean" | "select" | "color";
  default: any;
  label: string;
  options?: string[];
  validation?: (value: any) => boolean;
};
```

### 3. Fidget Validation

```typescript
// Validate fidget settings
const validateFidgetSettings = (
  settings: FidgetSettings,
  properties: FidgetProperties
): boolean => {
  return properties.fields.every(field => {
    const value = settings[field.fieldName];
    if (field.validation) {
      return field.validation(value);
    }
    return value !== undefined;
  });
};
```

## Performance Considerations

### 1. Lazy Loading

```typescript
// Lazy load fidget components
const LazyFidget = lazy(() => import(`./fidgets/${fidgetType}`));

// Render with suspense
const FidgetRenderer = ({ fidgetType, ...props }) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyFidget {...props} />
  </Suspense>
);
```

### 2. Memoization

```typescript
// Memoize fidget bundles
const fidgetBundles = useMemo(() => {
  const bundles: Record<string, FidgetBundle> = {};
  
  Object.values(fidgetInstanceDatums).forEach(fidgetData => {
    const bundle = createFidgetBundle(fidgetData, isEditable);
    if (bundle) {
      bundles[fidgetData.id] = bundle;
    }
  });
  
  return bundles;
}, [fidgetInstanceDatums, isEditable]);
```

### 3. Bundle Optimization

```typescript
// Optimize fidget bundles
const createOptimizedBundle = (fidgetData: FidgetInstanceData): FidgetBundle | null => {
  if (!fidgetData) return null;
  
  const fidgetModule = CompleteFidgets[fidgetData.fidgetType];
  if (!fidgetModule) return null;
  
  return {
    ...fidgetData,
    properties: fidgetModule.properties,
    config: { ...fidgetData.config, editable: isEditable },
  };
};
```

## Error Handling

### 1. Fidget Errors

```typescript
// Handle fidget errors
const FidgetErrorBoundary = ({ children, fidgetId }) => {
  return (
    <ErrorBoundary
      fallback={<div>Fidget Error: {fidgetId}</div>}
      onError={(error) => {
        console.error('Fidget error:', error);
        // Report error to analytics
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

### 2. Missing Fidgets

```typescript
// Handle missing fidgets
const getValidFidgetIds = (
  layout: any,
  fidgetInstanceDatums: Record<string, FidgetInstanceData>,
  isMobile: boolean
): string[] => {
  const fidgetIds = extractFidgetIds(layout);
  
  return fidgetIds.filter(id => {
    const fidgetData = fidgetInstanceDatums[id];
    if (!fidgetData) return false;
    
    const fidgetModule = CompleteFidgets[fidgetData.fidgetType];
    if (!fidgetModule) return false;
    
    // Check mobile compatibility
    if (isMobile && fidgetModule.properties.mobile === false) return false;
    
    return true;
  });
};
```

## Testing

### 1. Unit Tests

```typescript
// Test fidget creation
describe('Fidget System', () => {
  it('should create fidget instance', () => {
    const fidget = generateFidgetInstance('text', textFidget, { title: 'Test' });
    expect(fidget.fidgetType).toBe('text');
    expect(fidget.config.settings.title).toBe('Test');
  });
});
```

### 2. Integration Tests

```typescript
// Test fidget rendering
describe('Fidget Rendering', () => {
  it('should render fidget in layout', () => {
    const fidgetData = createTestFidgetData();
    const bundle = createFidgetBundle(fidgetData, true);
    
    render(<FidgetRenderer bundle={bundle} />);
    expect(screen.getByText('Test Fidget')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Common Issues

1. **Fidget Not Loading**: Check fidget type and module availability
2. **Settings Not Saving**: Verify fidget configuration and permissions
3. **Layout Issues**: Check fidget compatibility with layout type
4. **Performance Issues**: Implement lazy loading and memoization

### Debug Tools

- Use React DevTools to inspect fidget state
- Check browser console for fidget errors
- Verify fidget configuration and properties
- Test fidget rendering in isolation

## Future Considerations

- Enhanced fidget discovery
- Advanced configuration options
- Fidget marketplace
- Performance monitoring
