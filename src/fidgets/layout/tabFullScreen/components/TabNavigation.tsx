import React, { useMemo, useRef, useState, useEffect } from "react";
import { TabsList, TabsTrigger } from "@/common/components/atoms/tabs";
import { MdGridView } from "react-icons/md";
import * as FaIcons from "react-icons/fa6";
import * as BsIcons from "react-icons/bs";
import * as GiIcons from "react-icons/gi";
import * as LuIcons from "react-icons/lu";
import type { IconType } from "react-icons";
import { CompleteFidgets } from "@/fidgets";
import { getFidgetDisplayName } from "../utils";

const ICON_PACK: Record<string, IconType> = {
  ...FaIcons,
  ...BsIcons,
  ...GiIcons,
  ...LuIcons,
};

interface TabNavigationProps {
  processedFidgetIds: string[];
  selectedTab: string;
  fidgetInstanceDatums: { [key: string]: any };
  isMobile: boolean;
  tabNames?: string[];
  isHomebasePath?: boolean;
}

/**
 * Component for rendering the navigation tabs at the bottom of the screen
 */
const TabNavigation: React.FC<TabNavigationProps> = ({
  processedFidgetIds = [],
  selectedTab,
  fidgetInstanceDatums,
  isMobile,
  tabNames,
  isHomebasePath = false,
}) => {
  // Ref for the tab list container
  const tabsListRef = useRef<HTMLDivElement>(null);
  
  // Enhanced state to track scroll position and gradient opacities
  const [scrollState, setScrollState] = useState({
    isAtStart: true,
    isAtEnd: false,
    leftGradientOpacity: 0,
    rightGradientOpacity: 1,
  });

  // Safe check for processedFidgetIds to prevent "Cannot read properties of undefined (reading 'length')" error
  if (!processedFidgetIds || (processedFidgetIds.length <= 1 && !isHomebasePath)) return null;

  // Reorder tabs to prioritize feed fidgets
  const orderedFidgetIds = useMemo(() => {
    return processedFidgetIds;
  }, [processedFidgetIds]);

  // Enhanced scroll handler to calculate gradient opacities based on scroll position
  const handleScroll = () => {
    if (!tabsListRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = tabsListRef.current;
    
    // Calculate how far we are from the start/end as a percentage
    const maxScroll = scrollWidth - clientWidth;
    
    // Calculate transition thresholds (pixels where opacity goes from 0 to 1)
    const transitionThreshold = 50; // 50px for the transition
    
    // Calculate left gradient opacity (0 when at start, 1 when scrolled at least transitionThreshold)
    const leftGradientOpacity = Math.min(scrollLeft / transitionThreshold, 1);
    
    // Calculate right gradient opacity (1 when not at end, 0 when approaching end)
    const distanceFromEnd = maxScroll - scrollLeft;
    const rightGradientOpacity = Math.min(distanceFromEnd / transitionThreshold, 1);
    
    // Keep the binary flags for any logic that needs them
    const isAtStart = scrollLeft <= 10;
    const isAtEnd = distanceFromEnd <= 10;
    
    setScrollState({ 
      isAtStart, 
      isAtEnd,
      leftGradientOpacity,
      rightGradientOpacity
    });
  };

  // Add scroll listener when component mounts
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
  }, []);

  // Function to get name for a tab
  const getFidgetName = (fidgetId: string) => {
    // Handle special consolidated tabs first
    if (fidgetId === 'consolidated-media') {
      return getFidgetDisplayName(null, isMobile, 'consolidated-media');
    }
    if (fidgetId === 'consolidated-pinned') {
      return getFidgetDisplayName(null, isMobile, 'consolidated-pinned');
    }
    
    // Handle special case for the homebase immutable feed
    if (fidgetId === 'feed') {
      const fidgetDatum = fidgetInstanceDatums[fidgetId];
      if (fidgetDatum) {
        return fidgetDatum.config?.settings?.customMobileDisplayName || 'Feed';
      } else {
        return 'Feed';
      }
    }
    
    const fidgetDatum = fidgetInstanceDatums[fidgetId];
    if (!fidgetDatum) return "Unknown";
    
    // Get valid fidget IDs and find index for custom tab name
    const validFidgetIds = Object.keys(fidgetInstanceDatums);
    const fidgetIdIndex = validFidgetIds.indexOf(fidgetId);
    // Use the centralized utility function to get the display name
    return getFidgetDisplayName(
      fidgetDatum,
      isMobile,
      undefined,
      tabNames,
      validFidgetIds,
      fidgetIdIndex
    );
  };

  // Function to get icon component for a fidget
  const getFidgetIcon = (fidgetId: string) => {
    const fidgetDatum = fidgetInstanceDatums[fidgetId];
    
    if (fidgetId === 'feed') {
      if (fidgetDatum) {
        const customIcon = fidgetDatum.config?.settings?.mobileIconName;
        if (customIcon) {
          const IconComponent = ICON_PACK[customIcon] || FaIcons.FaRss;
          return (
            <IconComponent 
              className={`w-5 h-5 ${selectedTab === fidgetId ? 'text-black' : 'text-gray-500'}`}
            />
          );
        }
      }
      return (
        <FaIcons.FaRss 
          className={`w-5 h-5 ${selectedTab === fidgetId ? 'text-black' : 'text-gray-500'}`}
        />
      );
    }
    if (!fidgetDatum) return <MdGridView className="text-xl" />;
    const fidgetModule = CompleteFidgets[fidgetDatum.fidgetType];
    if (!fidgetModule) return <MdGridView className="text-xl" />;
    if (isMobile) {
      const customIcon = fidgetDatum.config.settings.mobileIconName as string | undefined;
      if (customIcon) {
        if (customIcon.startsWith('http')) {
          return <img src={customIcon} alt="icon" className="w-5 h-5" />;
        }
        const Icon = ICON_PACK[customIcon] as IconType | undefined;
        if (Icon) {
          return <Icon className="text-xl" />;
        }
      }
      const isSelected = selectedTab === fidgetId;
      if (isSelected && fidgetModule.properties.mobileIconSelected) {
        return fidgetModule.properties.mobileIconSelected;
      } else if (fidgetModule.properties.mobileIcon) {
        return fidgetModule.properties.mobileIcon;
      }
    }
    // Fallback to emoji icon
    return (
      <span 
        className={`text-lg ${selectedTab === fidgetId ? 'text-black fill-black' : 'text-red-500 fill-red-500'}`} 
        role="img" 
        aria-label={fidgetModule.properties.fidgetName}
      >
        {String.fromCodePoint(fidgetModule.properties.icon)}
      </span>
    );
  };

  return (
    <div className="relative w-full h-full min-h-[72px]">
      <TabsList 
        ref={tabsListRef}
        className={`
          w-full h-full 
          overflow-x-auto
          gap-4
          flex whitespace-nowrap
          scrollbar-none
          ${orderedFidgetIds.length <= 4 ? 'justify-evenly' : 'justify-start'}
          rounded-none
        `}
      >
        {orderedFidgetIds.map((fidgetId) => {
          const fidgetName = getFidgetName(fidgetId);
          
          return (
            <TabsTrigger 
              key={fidgetId} 
              value={fidgetId}
              className={`
                flex flex-col items-center justify-center
                min-w-[72px] h-full py-2 px-0
                font-medium
                ${isMobile ? 'text-xs' : 'text-sm'}
                data-[state=active]:text-primary
                data-[state=active]:bg-transparent
                data-[state=active]:shadow-none
                data-[state=inactive]:opacity-50
                transition-opacity duration-200
                rounded-lg
              `}
            >
              {getFidgetIcon(fidgetId)}
              <span className="truncate max-w-[80px] line-clamp-1">{fidgetName}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      
      {/* Left gradient overlay - with opacity directly tied to scroll position */}
      <div 
        className={`
          absolute left-0 top-0 bottom-0 w-12 
          pointer-events-none 
          transition-opacity duration-0
          ${orderedFidgetIds.length <= 4 ? 'hidden' : ''}
        `}
        style={{
          background: 'linear-gradient(270deg, transparent 0%, hsla(240, 4.8%, 95.9%, 0.9) 50%, hsla(240, 4.8%, 95.9%, 1) 100%)',
          opacity: scrollState.leftGradientOpacity
        }}
      />
      
      {/* Right gradient overlay - with opacity directly tied to scroll position */}
      <div 
        className={`
          absolute right-0 top-0 bottom-0 w-12 
          pointer-events-none 
          transition-opacity duration-0
          ${orderedFidgetIds.length <= 4 ? 'hidden' : ''}
        `}
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsla(240, 4.8%, 95.9%, 0.9) 50%, hsla(240, 4.8%, 95.9%, 1) 100%)',
          opacity: scrollState.rightGradientOpacity
        }}
      />
    </div>
  );
};

export default TabNavigation;