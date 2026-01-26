# Theme System Overview

The theme system in Blankspace provides comprehensive visual customization capabilities, allowing users to personalize their spaces with custom colors, fonts, layouts, and interactive elements.

## Core Concepts

### Theme Components

1. **Visual Properties** - Colors, fonts, spacing, borders
2. **Layout Properties** - Grid spacing, fidget styling
3. **Interactive Properties** - Music, animations, effects
4. **Mobile Properties** - Mobile-specific customization
5. **Code Properties** - Custom HTML/CSS injection

### Theme Architecture

```typescript
// Theme settings structure
export type ThemeSettings = {
  id: string;
  name: string;
  properties: ThemeProperties;
  timestamp?: string;
};

// Theme properties
export type ThemeProperties = {
  // Visual properties
  background: string;
  font: string;
  fontColor: string;
  headingsFont: string;
  headingsFontColor: string;
  
  // Fidget styling
  fidgetBackground: string;
  fidgetBorderWidth: string;
  fidgetBorderColor: string;
  fidgetShadow: string;
  fidgetBorderRadius: string;
  gridSpacing: string;
  
  // Interactive properties
  musicURL: string;
  backgroundHTML: string;
};
```

## Theme System Components

### 1. Theme Editor

The `ThemeSettingsEditor` provides a comprehensive interface for theme customization:

```typescript
export function ThemeSettingsEditor({
  theme = DEFAULT_THEME,
  saveTheme,
  saveExitEditMode,
  cancelExitEditMode,
  onExportConfig,
  fidgetInstanceDatums,
  saveFidgetInstanceDatums,
  getCurrentSpaceContext,
  onApplySpaceConfig,
}: ThemeSettingsEditorArgs) {
  // Theme management logic
  const { activeTheme, themePropSetter, handleApplyTheme } = useThemeManager(theme, saveTheme);
  
  // Mobile app management
  const { miniApps, handleUpdateMiniApp, handleReorderMiniApps } = useMobileAppsManager(
    fidgetInstanceDatums, 
    saveFidgetInstanceDatums
  );
  
  // ... rest of component
}
```

### 2. Theme Property Management

```typescript
// Theme property setter with CSS variable updates
const themePropSetter = useCallback(<_T extends string>(property: string): (value: string) => void => {
  return (value: string): void => {
    const newTheme = {
      ...theme,
      properties: {
        ...theme.properties,
        [property]: value,
      },
    };
    
    // Update CSS variables for global theme
    if (property === "font" || property === "headingsFont") {
      const fontConfig = FONT_FAMILY_OPTIONS_BY_NAME[value];
      if (fontConfig) {
        document.documentElement.style.setProperty(
          property === "font" ? "--user-theme-font" : "--user-theme-headings-font",
          fontConfig.config.style.fontFamily,
        );
      }
    }
    
    if (property === "fontColor" || property === "headingsFontColor") {
      document.documentElement.style.setProperty(
        property === "fontColor" ? "--user-theme-font-color" : "--user-theme-headings-font-color",
        value,
      );
    }
    
    saveTheme(newTheme);
  };
}, [theme, saveTheme]);
```

### 3. CSS Variable Integration

```typescript
// Apply theme to CSS variables
const applyThemeToCSS = (theme: any) => {
  if (!theme?.properties) return;

  const { properties } = theme;

  // Apply theme properties directly to CSS variables
  if (properties.background) {
    document.documentElement.style.setProperty("--user-theme-background", properties.background);
  }
  if (properties.fontColor) {
    document.documentElement.style.setProperty("--user-theme-font-color", properties.fontColor);
  }
  if (properties.headingsFontColor) {
    document.documentElement.style.setProperty("--user-theme-headings-font-color", properties.headingsFontColor);
  }
  if (properties.fidgetBackground) {
    document.documentElement.style.setProperty("--user-theme-fidget-background", properties.fidgetBackground);
  }
  if (properties.fidgetBorderWidth) {
    document.documentElement.style.setProperty("--user-theme-fidget-border-width", properties.fidgetBorderWidth);
  }
  if (properties.fidgetBorderColor) {
    document.documentElement.style.setProperty("--user-theme-fidget-border-color", properties.fidgetBorderColor);
  }
  if (properties.fidgetShadow) {
    document.documentElement.style.setProperty("--user-theme-fidget-shadow", properties.fidgetShadow);
  }
  if (properties.fidgetBorderRadius) {
    document.documentElement.style.setProperty("--user-theme-fidget-border-radius", properties.fidgetBorderRadius);
  }
  if (properties.gridSpacing) {
    document.documentElement.style.setProperty("--user-theme-grid-spacing", properties.gridSpacing);
  }
};
```

## Theme Categories

### 1. Space Themes

Space themes control the overall visual appearance:

```typescript
// Space theme properties
const SpaceTabContent = ({
  background,
  headingsFontColor,
  headingsFont,
  fontColor,
  font,
  onPropertyChange,
}) => {
  return (
    <div className="space-theme-content">
      <BackgroundSelector
        value={background}
        onChange={onPropertyChange("background")}
      />
      <FontSelector
        value={font}
        onChange={onPropertyChange("font")}
        isThemeEditor={true}
      />
      <ColorSelector
        value={fontColor}
        onChange={onPropertyChange("fontColor")}
        colorType="font"
      />
      {/* ... other properties */}
    </div>
  );
};
```

### 2. Fidget Themes

Fidget themes control the styling of individual fidgets:

```typescript
// Fidget theme properties
const StyleTabContent = ({
  fidgetBackground,
  fidgetBorderColor,
  fidgetBorderWidth,
  fidgetShadow,
  fidgetBorderRadius,
  gridSpacing,
  onPropertyChange,
}) => {
  return (
    <div className="fidget-theme-content">
      <ColorSelector
        value={fidgetBackground}
        onChange={onPropertyChange("fidgetBackground")}
        colorType="fidgetBackground"
      />
      <BorderWidthSelector
        value={fidgetBorderWidth}
        onChange={onPropertyChange("fidgetBorderWidth")}
      />
      <ColorSelector
        value={fidgetBorderColor}
        onChange={onPropertyChange("fidgetBorderColor")}
        colorType="fidgetBorder"
      />
      {/* ... other properties */}
    </div>
  );
};
```

### 3. Mobile Themes

Mobile themes control mobile-specific customization:

```typescript
// Mobile theme management
const useMobileAppsManager = (
  fidgetInstanceDatums: { [key: string]: FidgetInstanceData }, 
  saveFidgetInstanceDatums: (newFidgetInstanceDatums: { [key: string]: FidgetInstanceData }) => Promise<void>
) => {
  // Convert fidget data to mobile app format
  const miniApps: MiniApp[] = Object.values(fidgetInstanceDatums).map((d, i) => {
    const props = CompleteFidgets[d.fidgetType]?.properties;
    const defaultIcon = DEFAULT_FIDGET_ICON_MAP[d.fidgetType] ?? 'HomeIcon';
    
    const mobileName = (d.config.settings.customMobileDisplayName as string) ||
      props?.mobileFidgetName ||
      props?.fidgetName ||
      d.fidgetType;
    
    return {
      id: d.id,
      name: d.fidgetType,
      mobileDisplayName: mobileName,
      context: props?.fidgetName || d.fidgetType,
      order: i + 1,
      icon: (d.config.settings.mobileIconName as string) || defaultIcon,
      displayOnMobile: d.config.settings.showOnMobile !== false,
    } as MiniApp;
  }).sort((a, b) => a.order - b.order);

  const handleUpdateMiniApp = useCallback((app: MiniApp) => {
    const datum = fidgetInstanceDatums[app.id];
    if (!datum) return;
    const newDatums = {
      ...fidgetInstanceDatums,
      [app.id]: {
        ...datum,
        config: {
          ...datum.config,
          settings: {
            ...datum.config.settings,
            customMobileDisplayName: app.mobileDisplayName,
            mobileIconName: app.icon,
            showOnMobile: app.displayOnMobile,
          },
        },
      },
    };
    saveFidgetInstanceDatums(newDatums);
  }, [fidgetInstanceDatums, saveFidgetInstanceDatums]);

  return { miniApps, handleUpdateMiniApp, handleReorderMiniApps };
};
```

### 4. Code Themes

Code themes allow custom HTML/CSS injection:

```typescript
// Code theme properties
const CodeTabContent = ({
  backgroundHTML,
  onPropertyChange,
  onExportConfig,
}) => {
  return (
    <div className="code-theme-content">
      <CodeEditor
        value={backgroundHTML}
        onChange={onPropertyChange("backgroundHTML")}
        language="html"
        placeholder="Enter custom HTML/CSS..."
      />
      <Button onClick={onExportConfig}>
        Export Configuration
      </Button>
    </div>
  );
};
```

## Theme Templates

### 1. Pre-built Themes

```typescript
// Available theme templates
export const THEMES = [
  {
    id: "light",
    name: "Light Theme",
    properties: {
      background: "#ffffff",
      font: "Inter",
      fontColor: "#000000",
      headingsFont: "Inter",
      headingsFontColor: "#000000",
      fidgetBackground: "#f8f9fa",
      fidgetBorderWidth: "1px",
      fidgetBorderColor: "#e9ecef",
      fidgetShadow: "0 2px 4px rgba(0,0,0,0.1)",
      fidgetBorderRadius: "8px",
      gridSpacing: "16px",
    }
  },
  {
    id: "dark",
    name: "Dark Theme",
    properties: {
      background: "#1a1a1a",
      font: "Inter",
      fontColor: "#ffffff",
      headingsFont: "Inter",
      headingsFontColor: "#ffffff",
      fidgetBackground: "#2d2d2d",
      fidgetBorderWidth: "1px",
      fidgetBorderColor: "#404040",
      fidgetShadow: "0 2px 4px rgba(0,0,0,0.3)",
      fidgetBorderRadius: "8px",
      gridSpacing: "16px",
    }
  },
  // ... more themes
];
```

### 2. Theme Application

```typescript
// Apply theme template
const handleApplyTheme = useCallback((selectedTheme: ThemeSettings) => {
  saveTheme(selectedTheme);
  setActiveTheme(selectedTheme.id);
}, [saveTheme]);
```

## Interactive Features

### 1. Music Integration

```typescript
// Music URL selector
const VideoSelector = ({
  initialVideoURL,
  onVideoSelect,
}) => {
  return (
    <div className="music-selector">
      <input
        type="url"
        value={initialVideoURL}
        onChange={(e) => onVideoSelect(e.target.value)}
        placeholder="Enter YouTube URL..."
      />
    </div>
  );
};
```

### 2. AI Vibe Editor

```typescript
// AI-powered theme generation
const handleVibeEditorApplyConfig = async (config: any) => {
  // Create checkpoint before AI applies changes
  if (getCurrentSpaceContext) {
    createCheckpointFromContext(
      getCurrentSpaceContext,
      'Before AI vibe editor changes',
      'theme-editor'
    );
  }

  // Apply the AI-generated configuration to the theme
  if (config && config.backgroundHTML) {
    themePropSetter("backgroundHTML")(config.backgroundHTML);
  }

  // Apply other theme properties if they exist in the config
  if (config.theme?.properties) {
    const updatedTheme: ThemeSettings = {
      ...theme,
      properties: {
        ...theme.properties,
        ...config.theme.properties,
      },
    };
    handleApplyTheme(updatedTheme);
  }

  // If there's a complete space config and we have the ability to apply it, do so
  if (config.fidgetInstanceDatums && onApplySpaceConfig) {
    await onApplySpaceConfig(config);
  }
};
```

## Font System

### 1. Font Configuration

```typescript
// Font family options
export const FONT_FAMILY_OPTIONS_BY_NAME = {
  "Inter": {
    name: "Inter",
    config: {
      style: {
        fontFamily: "Inter, sans-serif",
      },
    },
  },
  "Roboto": {
    name: "Roboto",
    config: {
      style: {
        fontFamily: "Roboto, sans-serif",
      },
    },
  },
  // ... more fonts
};
```

### 2. Font Selector

```typescript
// Font selector component
const FontSelector = ({
  onChange,
  value,
  className,
  isThemeEditor = false,
}) => {
  const settings = FONT_FAMILY_OPTIONS.filter((setting) => {
    if (hideGlobalSettings) {
      return !setting.global;
    }
    return true;
  });
  
  const selectedFont = getSettingByValue(settings, value);

  const handleValueChange = (fontFamily: string) => {
    const fontConfig = settings.find(
      (setting) => setting.config.style.fontFamily === fontFamily
    );
    if (fontConfig) {
      if (isThemeEditor) {
        onChange(fontConfig.name);
      } else {
        onChange(fontConfig.config.style.fontFamily);
      }
    }
  };

  return (
    <Select onValueChange={handleValueChange} value={selectedFont?.config?.style?.fontFamily || ""}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select a font">
          <span style={selectedFont?.config?.style}>
            {selectedFont ? selectedFont.name : "Select a font"}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {settings.map((font, i) => (
          <SelectItem
            style={font.config.style}
            value={font.config.style.fontFamily}
            key={i}
          >
            {font.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

## Performance Considerations

### 1. CSS Variable Updates

```typescript
// Efficient CSS variable updates
const updateCSSVariables = (properties: ThemeProperties) => {
  const updates = [
    { property: "--user-theme-background", value: properties.background },
    { property: "--user-theme-font-color", value: properties.fontColor },
    { property: "--user-theme-headings-font-color", value: properties.headingsFontColor },
    { property: "--user-theme-fidget-background", value: properties.fidgetBackground },
    { property: "--user-theme-fidget-border-width", value: properties.fidgetBorderWidth },
    { property: "--user-theme-fidget-border-color", value: properties.fidgetBorderColor },
    { property: "--user-theme-fidget-shadow", value: properties.fidgetShadow },
    { property: "--user-theme-fidget-border-radius", value: properties.fidgetBorderRadius },
    { property: "--user-theme-grid-spacing", value: properties.gridSpacing },
  ];
  
  updates.forEach(({ property, value }) => {
    if (value) {
      document.documentElement.style.setProperty(property, value);
    }
  });
};
```

### 2. Theme Caching

```typescript
// Cache theme configurations
const themeCache = new Map<string, ThemeSettings>();

const getCachedTheme = (themeId: string): ThemeSettings | null => {
  return themeCache.get(themeId) || null;
};

const setCachedTheme = (theme: ThemeSettings) => {
  themeCache.set(theme.id, theme);
};
```

## Error Handling

### 1. Theme Validation

```typescript
// Validate theme properties
const validateTheme = (theme: ThemeSettings): boolean => {
  const requiredProperties = [
    'background', 'font', 'fontColor', 'headingsFont', 'headingsFontColor',
    'fidgetBackground', 'fidgetBorderWidth', 'fidgetBorderColor',
    'fidgetShadow', 'fidgetBorderRadius', 'gridSpacing'
  ];
  
  return requiredProperties.every(prop => 
    theme.properties[prop] !== undefined && theme.properties[prop] !== null
  );
};
```

### 2. Fallback Themes

```typescript
// Fallback to default theme on error
const getSafeTheme = (theme: ThemeSettings): ThemeSettings => {
  if (!validateTheme(theme)) {
    console.warn('Invalid theme, falling back to default');
    return DEFAULT_THEME;
  }
  return theme;
};
```

## Testing

### 1. Theme Testing

```typescript
// Test theme application
describe('Theme System', () => {
  it('should apply theme properties', () => {
    const theme = createTestTheme();
    applyThemeToCSS(theme);
    
    expect(document.documentElement.style.getPropertyValue('--user-theme-background'))
      .toBe(theme.properties.background);
  });
});
```

### 2. Integration Testing

```typescript
// Test theme editor integration
describe('Theme Editor', () => {
  it('should update theme properties', () => {
    const { result } = renderHook(() => useThemeManager(testTheme, mockSaveTheme));
    
    act(() => {
      result.current.themePropSetter('background')('#ff0000');
    });
    
    expect(mockSaveTheme).toHaveBeenCalledWith({
      ...testTheme,
      properties: { ...testTheme.properties, background: '#ff0000' }
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Theme Not Applying**: Check CSS variable names and values
2. **Font Not Loading**: Verify font family configuration
3. **Mobile Issues**: Check mobile-specific theme properties
4. **Performance Issues**: Implement theme caching and optimization

### Debug Tools

- Use browser DevTools to inspect CSS variables
- Check theme configuration in React DevTools
- Verify font loading in Network tab
- Test theme changes in isolation

## Future Considerations

- Enhanced theme templates
- Advanced animation support
- Theme marketplace
- Performance monitoring
