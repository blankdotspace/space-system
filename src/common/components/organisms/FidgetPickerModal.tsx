import React, { Dispatch, SetStateAction, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { CompleteFidgets } from "@/fidgets";
import { Card, CardContent } from "../atoms/card";
import { FidgetArgs, FidgetInstanceData, FidgetModule } from "@/common/fidgets";
import Modal from "../molecules/Modal";
import { FidgetOptionsService } from "@/common/data/services/fidgetOptionsService";
import { 
  FidgetOption, 
  StaticFidgetOption, 
  CuratedFidgetOption, 
  MiniAppFidgetOption
} from "@/common/types/fidgetOptions";
import { Input } from "../atoms/input";
import Image from "next/image";
import clankerLogo from "@/config/clanker/assets/nobg.png";

import { Search } from "lucide-react";

// Tag configuration for consistent styling - Core 8 categories
const TAG_CONFIG: Record<string, { color: string; icon: string | any; displayName?: string }> = {
  // Core Categories
  'social': { color: 'bg-pink-100 text-pink-800', icon: '👥', displayName: 'Social' },
  'defi': { color: 'bg-green-100 text-green-800', icon: '💰', displayName: 'DeFi' },
  'tools': { color: 'bg-gray-100 text-gray-800', icon: '🔧', displayName: 'Tools' },
  'content': { color: 'bg-purple-100 text-purple-800', icon: '🎨', displayName: 'Content' },
  'games': { color: 'bg-orange-100 text-orange-800', icon: '🎮', displayName: 'Games' },
  'governance': { color: 'bg-blue-100 text-blue-800', icon: '🗳️', displayName: 'Governance' },
  'mini-apps': { color: 'bg-violet-100 text-violet-800', icon: '📱', displayName: 'Mini Apps' },
  'social-impact': { color: 'bg-red-100 text-red-800', icon: '❤️', displayName: 'Social Impact' },
  
  // Essential specific tags
  'farcaster': { color: 'bg-purple-100 text-purple-800', icon: '🟣' },
  'swap': { color: 'bg-blue-100 text-blue-800', icon: '🔄' },
  'trading': { color: 'bg-yellow-100 text-yellow-800', icon: '📈' },
  'nft': { color: 'bg-purple-100 text-purple-800', icon: '🖼️' },
  'voting': { color: 'bg-blue-100 text-blue-800', icon: '🗳️' },
  'dao': { color: 'bg-purple-100 text-purple-800', icon: '🏛️' },
  'analytics': { color: 'bg-teal-100 text-teal-800', icon: '📊' },
  'blockchain': { color: 'bg-indigo-100 text-indigo-800', icon: '⛓️' },
  'lending': { color: 'bg-emerald-100 text-emerald-800', icon: '🏦' },
  'yield': { color: 'bg-teal-100 text-teal-800', icon: '📊' },
  'marketplace': { color: 'bg-green-100 text-green-800', icon: '🏪' },
  'publishing': { color: 'bg-rose-100 text-rose-800', icon: '📝' },
  'writing': { color: 'bg-amber-100 text-amber-800', icon: '✍️' },
  'art': { color: 'bg-pink-100 text-pink-800', icon: '🎨' },
  'price': { color: 'bg-yellow-100 text-yellow-800', icon: '💰' },
  'tracking': { color: 'bg-emerald-100 text-emerald-800', icon: '📊' },
  'explorer': { color: 'bg-indigo-100 text-indigo-800', icon: '🔍' },
  'dashboards': { color: 'bg-teal-100 text-teal-800', icon: '📊' },
  'treasury': { color: 'bg-blue-100 text-blue-800', icon: '🏦' },
  'aggregator': { color: 'bg-green-100 text-green-800', icon: '🔗' },
  'stablecoin': { color: 'bg-indigo-100 text-indigo-800', icon: '🪙' },
  'vaults': { color: 'bg-emerald-100 text-emerald-800', icon: '🏦' },
  'borrowing': { color: 'bg-amber-100 text-amber-800', icon: '💳' },
  'dex': { color: 'bg-green-100 text-green-800', icon: '🏪' },
  'utility': { color: 'bg-gray-100 text-gray-600', icon: '🔧' },
  'donation': { color: 'bg-red-100 text-red-800', icon: '❤️' },
  'community': { color: 'bg-pink-100 text-pink-800', icon: '👥' },
  'instagram': { color: 'bg-pink-100 text-pink-800', icon: '📷' },
  'tiktok': { color: 'bg-black text-white', icon: '🎵' },
  'skateboarding': { color: 'bg-orange-100 text-orange-800', icon: '🛹' },
  'aerodrome': { color: 'bg-blue-100 text-blue-800', icon: '✈️' },
  'clanker': { color: 'bg-purple-100 text-purple-800', icon: clankerLogo, displayName: 'Clanker' },
  'scheduling': { color: 'bg-blue-100 text-blue-800', icon: '📅' },
  'presentations': { color: 'bg-gray-100 text-gray-800', icon: '📊' },
  'networking': { color: 'bg-blue-100 text-blue-800', icon: '👥' },
  'interactive': { color: 'bg-purple-100 text-purple-800', icon: '🎮' },
  'betting': { color: 'bg-red-100 text-red-800', icon: '🎲' },
  'fishing': { color: 'bg-blue-100 text-blue-800', icon: '🎣' },
  'eggs': { color: 'bg-yellow-100 text-yellow-800', icon: '🥚' },
  'frames': { color: 'bg-purple-100 text-purple-800', icon: '🖼️' },
  'noice': { color: 'bg-green-100 text-green-800', icon: '🎯' },
  'miniapp': { color: 'bg-violet-100 text-violet-800', icon: '📱' },
  'gaming': { color: 'bg-orange-100 text-orange-800', icon: '🎮' },
  'entertainment': { color: 'bg-orange-100 text-orange-800', icon: '🎭' },
  'media': { color: 'bg-purple-100 text-purple-800', icon: '📺' },
  
  // Default for any tag not explicitly defined
  'default': { color: 'bg-gray-100 text-gray-600', icon: '🏷️' }
};

export interface FidgetPickerModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addFidget: (fidgetId: string, fidget: FidgetModule<any>) => void;
  addFidgetWithCustomSettings: (fidgetId: string, fidget: FidgetModule<any>, customSettings: any) => void;
  setExternalDraggedItem: Dispatch<
    SetStateAction<{ i: string; w: number; h: number } | undefined>
  >;
  setCurrentlyDragging: React.Dispatch<React.SetStateAction<boolean>>;
  generateFidgetInstance(
    fidgetId: string,
    fidget: FidgetModule<FidgetArgs>,
    customSettings?: any,
  ): FidgetInstanceData;
}

export const FidgetPickerModal: React.FC<FidgetPickerModalProps> = ({
  isOpen,
  setIsOpen,
  addFidget,
  addFidgetWithCustomSettings,
  setExternalDraggedItem,
  setCurrentlyDragging,
  generateFidgetInstance,
}) => {
  const [fidgetOptions, setFidgetOptions] = useState<FidgetOption[]>([]);
  // State for selected tags (single selection)
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMiniApps, setLoadingMiniApps] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);
  
  // Ref for debouncing search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const service = FidgetOptionsService.getInstance();

  // Get only the main category tags for filtering, sorted by order
  const mainCategoryTags = useMemo(() => {
    const categoryOrder: Record<string, number> = {
      'clanker': 0,
      'social': 1,
      'defi': 2,
      'content': 3,
      'tools': 4,
      'games': 5,
      'governance': 6,
      'social-impact': 7,
      'mini-apps': 99,
    };
    
    const mainCategories = ['clanker', 'social', 'defi', 'tools', 'content', 'games', 'governance', 'mini-apps', 'social-impact'];
    const availableCategories = mainCategories.filter(category => 
      fidgetOptions.some(option => option.tags.includes(category))
    );
    
    // Sort by order, with clanker first
    return availableCategories.sort((a, b) => {
      const orderA = categoryOrder[a] ?? 999;
      const orderB = categoryOrder[b] ?? 999;
      return orderA - orderB;
    });
  }, [fidgetOptions]);

  // Debounced search function
  const debouncedSearch = useCallback(async (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (query.trim()) {
        setSearchLoading(true);
        setIsSearchMode(true);
        try {
          const searchResponse = await service.searchFidgetOptions(query, { category: selectedTag });
          setFidgetOptions(searchResponse.options);
        } catch (error) {
          console.error('Error searching fidgets:', error);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setIsSearchMode(false);
        // Reload default options when search is cleared
        loadFidgetOptions();
      }
    }, 300); // 300ms debounce
  }, [selectedTag, service]);

  // Handle search query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, debouncedSearch]);

  // Filter fidget options based on selected tag (only for non-search mode)
  const filteredOptions = useMemo(() => {
    if (isSearchMode) {
      // In search mode, filtering is handled by the search API
      return fidgetOptions;
    }

    let filtered = fidgetOptions;

    // Filter by selected tag (single selection)
    if (selectedTag) {
      filtered = filtered.filter(option => option.tags.includes(selectedTag));
    }

    return filtered;
  }, [fidgetOptions, selectedTag, isSearchMode]);

  // Load data when modal opens and reset when closed
  useEffect(() => {
    if (isOpen) {
      loadFidgetOptions();
    } else {
      // Reset states when modal is closed
      setLoading(false);
      setLoadingMiniApps(false);
      setSearchLoading(false);
      setSearchQuery('');
      setSelectedTag('');
      setIsSearchMode(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
  }, [isOpen]);

  const loadFidgetOptions = async () => {
    setLoading(true);
    setLoadingMiniApps(true);
    
    try {
      // First, load local options immediately (static fidgets + curated sites)
      const localResponse = service.getLocalFidgetOptions({});
      setFidgetOptions(localResponse.options);
      setLoading(false); // Stop main loading spinner since we have content to show
      
      // Then, load all options including mini apps in the background
      const fullResponse = await service.getFidgetOptions({});
      setFidgetOptions(fullResponse.options);
      setLoadingMiniApps(false); // Stop mini apps loading indicator
    } catch (error) {
      console.error('Error loading fidget options:', error);
      setLoading(false);
      setLoadingMiniApps(false);
    }
  };

  const handleTagSelect = (tag: string) => {
    const newTag = selectedTag === tag ? '' : tag;
    setSelectedTag(newTag);
    
    // If in search mode, re-run the search with the new tag filter
    if (isSearchMode && searchQuery.trim()) {
      debouncedSearch(searchQuery);
    }
  };

  const handleFidgetSelect = (option: FidgetOption) => {
    if (option.type === 'static') {
      const staticOption = option as StaticFidgetOption;
      const fidgetModule = CompleteFidgets[staticOption.fidgetType];
      if (fidgetModule) {
        addFidget(staticOption.fidgetType, fidgetModule);
      }
    } else if (option.type === 'curated') {
      const curatedOption = option as CuratedFidgetOption;
      const iframeFidget = CompleteFidgets.iframe;
      if (iframeFidget) {
        // Create iframe fidget with pre-populated URL
        addFidgetWithCustomSettings('iframe', iframeFidget, {
          url: curatedOption.url,
          size: 1,
          cropOffsetX: 0,
          cropOffsetY: 0,
          isScrollable: false
        });
      }
    } else if (option.type === 'miniapp') {
      const miniappOption = option as MiniAppFidgetOption;
      const framesFidget = CompleteFidgets.FramesV2;
      if (framesFidget) {
        // Create FramesV2 fidget with pre-populated frame URL
        addFidgetWithCustomSettings('FramesV2', framesFidget, {
          url: miniappOption.frameUrl,
          collapsed: false,
          title: miniappOption.name,
          headingFont: 'Inter'
        });
      }
    }
  };

  const renderFidgetOption = (option: FidgetOption) => {
    const icon = typeof option.icon === 'string' ? option.icon : '🔗';
    
    // Function to render icon properly - handle URLs vs unicode/text
    const renderIcon = () => {
      if (typeof icon === 'string' && icon.startsWith('http')) {
        return (
          <img 
            src={icon} 
            alt={option.name} 
            className="w-8 h-8 rounded object-contain"
            onError={(e) => {
              // Fallback to emoji if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        );
      }
      return (
        <span
          className="text-lg leading-none text-black group-hover:text-black"
          role="img"
          aria-label={option.name}
        >
          {icon}
        </span>
      );
    };
    
    return (
      <div
        key={option.id}
        className="z-20 droppable-element flex justify-center items-center transition-transform duration-300"
        draggable={true}
        // unselectable helps with IE support
        // eslint-disable-next-line react/no-unknown-property
        unselectable="on"
        onDragStart={(e) => {
          setCurrentlyDragging(true);
          // For drag and drop, we'll need to handle different types
          if (option.type === 'static') {
            const staticOption = option as StaticFidgetOption;
            const fidgetModule = CompleteFidgets[staticOption.fidgetType];
            if (fidgetModule) {
              e.dataTransfer.setData(
                "text/plain",
                JSON.stringify(generateFidgetInstance(staticOption.fidgetType, fidgetModule)),
              );
              setExternalDraggedItem({
                i: staticOption.fidgetType,
                w: fidgetModule.properties.size.minWidth,
                h: fidgetModule.properties.size.minHeight,
              });
            }
          }
        }}
      >
        <button
          className="group w-full h-16 flex items-center gap-3 p-2 bg-transparent transform-gpu transition-transform will-change-transform hover:scale-[1.02]"
          onClick={() => handleFidgetSelect(option)}
        >
          <Card className="w-full h-full bg-[#F3F4F6] flex items-center p-3 rounded-lg">
            <CardContent className="overflow-hidden flex items-center gap-4 p-0 w-full">
              <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
                {renderIcon()}
                <span
                  className="text-lg leading-none text-black group-hover:text-black hidden"
                  role="img"
                  aria-label={option.name}
                >
                  🔗
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-black text-left leading-none group-hover:text-black truncate">
                    {option.name}
                  </span>
                </div>
                <p className="text-xs text-gray-600 text-left leading-tight truncate">
                  {option.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>
    );
  };

  return (
    <div className="[&_[data-radix-dialog-content]]:max-w-[1200px] [&_[data-radix-dialog-content]]:w-[95vw]">
      <Modal
        open={isOpen}
        setOpen={setIsOpen}
        title="Add Fidget"
        description="Choose a fidget to add to your space"
        showClose={true}
        overlay={true}
      >
        <div className="h-[75vh] max-h-[600px] w-full flex flex-col">
          {/* Search Input */}
          <div className="relative mb-4 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
              </div>
            )}
            <Input
              placeholder="Search fidgets by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
          </div>

          {/* Tag Filter */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tag filter buttons */}
            <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
              {mainCategoryTags.map((tag) => {
                const isSelected = selectedTag === tag;
                const config = TAG_CONFIG[tag] || TAG_CONFIG.default;
                
                return (
                  <button
                    key={tag}
                    onClick={() => handleTagSelect(tag)}
                    className={`flex items-center whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      isSelected
                        ? `${config.color} ring-2 ring-offset-2 ring-blue-500 shadow-sm`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {typeof config.icon === 'object' || (typeof config.icon === 'string' && (config.icon.startsWith('http') || config.icon.startsWith('/'))) ? (
                      <Image
                        src={config.icon}
                        alt={config.displayName || tag}
                        width={11}
                        height={11}
                        className="w-[11px] h-[11px] mr-1 object-contain flex-shrink-0"
                      />
                    ) : (
                      <span className="mr-1 flex-shrink-0">{config.icon}</span>
                    )}
                    <span className="flex-shrink-0">{config.displayName || tag}</span>
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading fidgets...</div>
                </div>
              ) : (
                <>
                  {/* All options */}
                  <div className="grid grid-cols-1 gap-2 pb-4">
                    {filteredOptions.map(renderFidgetOption)}
                  </div>

                  {/* Loading mini-apps indicator */}
                  {loadingMiniApps && filteredOptions.length > 0 && (
                    <div className="flex items-center justify-center py-4 border-t border-gray-200 mt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
                        Loading mini-apps...
                      </div>
                    </div>
                  )}

                  {/* No results */}
                  {filteredOptions.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500">
                        {searchQuery || selectedTag 
                          ? "No fidgets found matching your criteria" 
                          : "No fidgets available"}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}; 