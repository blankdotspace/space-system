import React, { useRef, useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/common/components/atoms/tabs";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import { UserTheme } from "@/common/lib/theme";
import { MdGridView } from "react-icons/md";
import { BsImage, BsImageFill, BsFillPinFill, BsPin } from "react-icons/bs";
import { CompleteFidgets } from "@/fidgets";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  activeIcon?: React.ReactNode;
  fidgetType?: string; // Type of fidget for determining icons
}

interface MobileNavbarProps {
  tabs: TabItem[];
  selected: string;
  onSelect: (id: string) => void;
  theme: UserTheme;
  className?: string;
  fidgetInstanceDatums?: { [key: string]: any }; // Optional fidget data for advanced styling
  tabNames?: string[]; // Custom tab names from SpaceConfig.tabNames
}

/**
 * Memoized tab item component for better performance
 */
const TabItem = React.memo(({ 
  tab, 
  index, 
  isSelected, 
  fontColor,
  fontFamily,
  onSelect,
  getTabIcon,
  getTabLabel
}: { 
  tab: TabItem; 
  index: number;
  isSelected: boolean; 
  fontColor: string;
  fontFamily: string;
  onSelect: (id: string) => void;
  getTabIcon: (tab: TabItem) => React.ReactNode;
  getTabLabel: (tab: TabItem, index: number) => string;
}) => {
  return (
    <TabsTrigger 
      key={tab.id} 
      value={tab.id}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
     // If you click on the same tab, force it to reload
        if (isSelected) {
          setTimeout(() => onSelect(tab.id), 0);
        } else {
          onSelect(tab.id);
        }
      }}
      className={mergeClasses(
        "flex flex-col items-center justify-center",
        "min-w-[72px] h-full py-2 px-0",
        "font-medium text-xs",
        "data-[state=active]:shadow-none",
        "data-[state=active]:bg-transparent",
        "transition-all duration-200",
        "focus:outline-none focus-visible:outline-none",
        "active:outline-none active:ring-0",
        "select-none touch-manipulation",
        "-webkit-tap-highlight-color: transparent",
        isSelected 
          ? "data-[state=active]:text-primary opacity-100" 
          : "data-[state=inactive]:opacity-70 hover:opacity-90"
      )}
      style={{
        "--tw-text-opacity": 1,
        color: fontColor,
        opacity: isSelected ? 1 : 0.7,
        fontFamily,
        WebkitTapHighlightColor: "transparent",
        outline: "none",
        border: "none"
      } as React.CSSProperties}
      aria-selected={isSelected}
      role="tab"
    >
      {/* Icon (active or inactive based on selection state) */}
      <div className="text-xl mb-1">
        {getTabIcon(tab)}
      </div>
      
      {/* Label with truncation for long text */}
      <span className="truncate max-w-[80px] line-clamp-1">
        {getTabLabel(tab, index)}
      </span>
    </TabsTrigger>
  );
});

TabItem.displayName = 'TabItem';

/**
 * A responsive mobile navigation bar that displays as a fixed bar at the bottom of the screen
 * with scrollable tabs. Features accessibility support and theme integration.
 * 
 * @param props.tabs - Array of tab items to render
 * @param props.selected - ID of the currently selected tab
 * @param props.onSelect - Callback for handling tab selection
 * @param props.theme - Theme configuration for styling
 * @param props.className - Optional additional CSS classes
 * @param props.fidgetInstanceDatums - Optional fidget data for advanced styling
 * @param props.tabNames - Optional custom tab names from SpaceConfig.tabNames
 */
const MobileNavbar: React.FC<MobileNavbarProps> = ({
  tabs,
  selected,
  onSelect,
  theme,
  className,
  fidgetInstanceDatums = {},
  tabNames,
}) => {
  // Ref for the tab list container to manage scroll
  const tabsListRef = useRef<HTMLDivElement>(null);
  
  // State to track scroll position and gradient overlay opacity
  const [scrollState, setScrollState] = useState({
    isAtStart: true,
    isAtEnd: false,
    leftGradientOpacity: 0,
    rightGradientOpacity: 1,
  });

  // Early return if there are no tabs
  if (!tabs || tabs.length === 0) return null;

  /**
   * Gets the appropriate display name for a tab, using custom tab names if available
   */
  const getTabLabel = useCallback((tab: TabItem, index: number): string => {
    // If tab already has a label, use it
    if (tab.label) return tab.label;
    
    // Special consolidated views
    if (tab.id === 'consolidated-media') return "Media";
    if (tab.id === 'consolidated-pinned') return "Pinned";
    
    // Use custom tab name from SpaceConfig if available
    if (tabNames && tabNames[index]) return tabNames[index];
    
    // If we have fidget instance data, try to get a name from there
    if (fidgetInstanceDatums && fidgetInstanceDatums[tab.id]) {
      const fidgetData = fidgetInstanceDatums[tab.id];
      
      // Check for custom mobile display name in settings
      if (fidgetData.config?.settings?.customMobileDisplayName) {
        return fidgetData.config.settings.customMobileDisplayName;
      }
      
      // Use fidget module properties
      if (fidgetData.fidgetType) {
        const fidgetModule = CompleteFidgets[fidgetData.fidgetType];
        if (fidgetModule) {
          // Prefer mobile name if available
          return fidgetModule.properties.mobileFidgetName || 
                 fidgetModule.properties.fidgetName || 
                 "Tab";
        }
      }
    }
    
    // Special fallback for feed if no fidget data is available
    if (tab.id === 'feed') return 'Feed';
    
    // Default fallback
    return `Tab ${index + 1}`;
  }, [tabNames, fidgetInstanceDatums]);
  
  /**
   * Gets appropriate icon for a tab based on its type and selection state
   */
  const getTabIcon = useCallback((tab: TabItem): React.ReactNode => {
    // If tab already has icons defined, use them
    if (selected === tab.id && tab.activeIcon) return tab.activeIcon;
    if (tab.icon) return tab.icon;
    
    // Special consolidated views
    if (tab.id === 'consolidated-media') {
      return selected === tab.id ? 
        <BsImageFill className="text-xl" /> : 
        <BsImage className="text-xl" />;
    }
    
    if (tab.id === 'consolidated-pinned') {
      return selected === tab.id ? 
        <BsFillPinFill size={22} /> : 
        <BsPin size={22} />;
    }
    
    // If we have fidget instance data, try to get icon from fidget module
    if (fidgetInstanceDatums && fidgetInstanceDatums[tab.id]) {
      const fidgetData = fidgetInstanceDatums[tab.id];
      if (fidgetData.fidgetType) {
        const fidgetModule = CompleteFidgets[fidgetData.fidgetType];
        if (fidgetModule) {
          // Use mobile-specific icons first if available
          const isSelected = selected === tab.id;
          if (isSelected && fidgetModule.properties.mobileIconSelected) {
            return fidgetModule.properties.mobileIconSelected;
          } else if (fidgetModule.properties.mobileIcon) {
            return fidgetModule.properties.mobileIcon;
          }
          
          // Fallback to emoji icon if available
          if (fidgetModule.properties.icon) {
            return (
              <span 
                className={`text-lg`}
                role="img" 
                aria-label={fidgetModule.properties.fidgetName}
              >
                {String.fromCodePoint(fidgetModule.properties.icon)}
              </span>
            );
          }
        }
      }
    }
    
    // Default fallback icon
    return <MdGridView className="text-xl" />;
  }, [selected, fidgetInstanceDatums]);

  // Handle scroll events to update gradient overlays
  const handleScroll = useCallback(() => {
    if (!tabsListRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = tabsListRef.current;
    
    // Calculate maximum possible scroll distance
    const maxScroll = scrollWidth - clientWidth;
    
    // Define transition zone (pixels) for gradient fade effect
    const transitionThreshold = 50;
    
    // Calculate gradient opacities based on scroll position
    const leftGradientOpacity = Math.min(scrollLeft / transitionThreshold, 1);
    const rightGradientOpacity = Math.min((maxScroll - scrollLeft) / transitionThreshold, 1);
    
    // Determine if we're at the start or end of scroll area
    const isAtStart = scrollLeft <= 10;
    const isAtEnd = maxScroll - scrollLeft <= 10;
    
    setScrollState({ 
      isAtStart, 
      isAtEnd,
      leftGradientOpacity,
      rightGradientOpacity
    });
  }, []);

  // Add scroll event listener
  useEffect(() => {
    const tabsList = tabsListRef.current;
    if (tabsList) {
      tabsList.addEventListener('scroll', handleScroll);
      // Initialize scroll state
      handleScroll();
    }
    
    return () => {
      if (tabsList) {
        tabsList.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  // Add keyboard navigation for tabs
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!tabs || tabs.length === 0) return;
    
    const currentIndex = tabs.findIndex(tab => tab.id === selected);
    if (currentIndex === -1) return;
    
    // Handle left/right arrow keys for tab navigation
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); // Prevent scrolling
      
      let nextIndex;
      if (e.key === 'ArrowLeft') {
        // Move to previous tab or wrap to the end
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      } else {
        // Move to next tab or wrap to the beginning
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      }
      
      onSelect(tabs[nextIndex].id);
      
      // Ensure the selected tab is visible by scrolling if needed
      const selectedElement = tabsListRef.current?.querySelector(`[value="${tabs[nextIndex].id}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [tabs, selected, onSelect]);

  // Get theme colors for active tab indicators
  const navFontColor = "var(--ns-nav-font-color, #0f172a)";
  const navFontFamily = "var(--ns-nav-font, var(--font-sans, Inter, system-ui, -apple-system, sans-serif))";

  return (
    <Tabs
      value={selected}
      onValueChange={onSelect}
      className={mergeClasses(
        "fixed bottom-0 left-0 right-0 w-full h-[72px] bg-white border-t border-gray-200 z-30",
        className
      )}
      style={{
          backgroundColor: theme?.properties?.background || "white",
          borderColor: theme?.properties?.fidgetBorderColor || "rgb(229 231 235)",
      }}
    >
      <div 
        className="relative w-full h-full"
        onKeyDown={handleKeyDown} // Add keyboard navigation to the container
      >
        {/* Left gradient overlay for scroll indication */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-8 h-full z-10 pointer-events-none"
          style={{
              background: `linear-gradient(to right, ${theme?.properties?.background || "white"}, transparent)`,
            opacity: scrollState.leftGradientOpacity,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        <TabsList 
          ref={tabsListRef}
          className={mergeClasses(
            "flex items-center justify-start w-full h-full overflow-x-auto no-scrollbar rounded-none",
            "px-2" // Add some padding for better spacing
          )}
          role="tablist" // Ensure ARIA role is set
          aria-label="Mobile Navigation Tabs"
        >
          {tabs.map((tab, index) => (
            <TabItem
              key={tab.id}
              tab={tab}
              index={index}
              isSelected={selected === tab.id}
              fontColor={navFontColor}
              fontFamily={navFontFamily}
              onSelect={onSelect}
              getTabIcon={getTabIcon}
              getTabLabel={getTabLabel}
            />
          ))}
        </TabsList>
        
        {/* Right gradient overlay for scroll indication */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-8 h-full z-10 pointer-events-none"
          style={{
              background: `linear-gradient(to left, ${theme?.properties?.background || "white"}, transparent)`,
            opacity: scrollState.rightGradientOpacity,
            transition: 'opacity 0.3s ease'
          }}
        />
      </div>
    </Tabs>
  );
};

export default MobileNavbar;
