/* eslint-disable react/react-in-jsx-scope */
import { Button } from "@/common/components/atoms/button";
import BackArrowIcon from "@/common/components/atoms/icons/BackArrow";
import {
  Tabs,
  TabsContent
} from "@/common/components/atoms/tabs";
import { MiniApp } from "@/common/components/molecules/MiniAppSettings";
import { VideoSelector } from "@/common/components/molecules/VideoSelector";
import AiChatSidebar from "@/common/components/organisms/AgentChat";
import NogsGateButton from "@/common/components/organisms/NogsGateButton";
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";
import { useAppStore } from "@/common/data/stores/app";
import { FidgetInstanceData } from "@/common/fidgets";
import { ThemeSettings } from "@/common/lib/theme";
import { ThemeCard } from "@/common/lib/theme/ThemeCard";
import DEFAULT_THEME from "@/common/lib/theme/defaultTheme";
import { FONT_FAMILY_OPTIONS_BY_NAME } from "@/common/lib/theme/fonts";
import {
  tabContentClasses,
} from "@/common/lib/theme/helpers";
import { ThemeEditorTab } from "@/common/lib/theme/types";
import { analytics } from "@/common/providers/AnalyticsProvider";
import { useMobilePreview } from "@/common/providers/MobilePreviewProvider";
import { DEFAULT_FIDGET_ICON_MAP } from "@/constants/mobileFidgetIcons";
import { THEMES } from "@/constants/themes";
import { CompleteFidgets } from "@/fidgets";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useState } from "react";
import { FaDownload, FaFloppyDisk, FaTriangleExclamation, FaX } from "react-icons/fa6";
import { MdMenuBook } from "react-icons/md";
import CodeTabContent from "./components/CodeTabContent";
import MobileTabContent from "./components/MobileTabContent";
import SpaceTabContent from "./components/SpaceTabContent";
import StyleTabContent from "./components/StyleTabContent";
import ThemeSettingsTabs from "./components/ThemeSettingsTabs";
import ThemeSettingsTooltip from "./components/ThemeSettingsTooltip";
import { BackgroundGenerator } from "./BackgroundGenerator";

export type ThemeSettingsEditorArgs = {
  theme: ThemeSettings;
  saveTheme: (newTheme: ThemeSettings) => void;
  saveExitEditMode: () => void;
  cancelExitEditMode: () => void;
  onExportConfig?: () => void;
  fidgetInstanceDatums: { [key: string]: FidgetInstanceData };
  saveFidgetInstanceDatums: (newFidgetInstanceDatums: {
    [key: string]: FidgetInstanceData;
  }) => Promise<void>;
  getCurrentSpaceContext?: () => any;
  onApplySpaceConfig?: (config: any) => Promise<void>;
};

// Handle theme-related logic
const useThemeManager = (theme: ThemeSettings, saveTheme: (theme: ThemeSettings) => void) => {
  const [activeTheme, setActiveTheme] = useState(theme.id);

  const themePropSetter = useCallback(<_T extends string>(property: string): (value: string) => void => {
    return (value: string): void => {
      const newTheme = {
        ...theme,
        properties: {
          ...theme.properties,
          [property]: value,
        },
      };
      
      if (property === "musicURL") {
        analytics.track(AnalyticsEvent.MUSIC_UPDATED, { url: value });
      }

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

  const handleApplyTheme = useCallback((selectedTheme: ThemeSettings) => {
    saveTheme(selectedTheme);
    setActiveTheme(selectedTheme.id);
  }, [saveTheme]);

  return { activeTheme, setActiveTheme, themePropSetter, handleApplyTheme };
};

// Manage mobile app settings
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

  const handleReorderMiniApps = useCallback((apps: MiniApp[]) => {
    const newDatums: { [key: string]: FidgetInstanceData } = {};
    
    apps.forEach((app) => {
      const datum = fidgetInstanceDatums[app.id];
      if (!datum) return;
      
      newDatums[app.id] = {
        ...datum,
        config: {
          ...datum.config,
          settings: {
            ...datum.config.settings,
          },
        },
      };
    });
    
    saveFidgetInstanceDatums(newDatums);
  }, [fidgetInstanceDatums, saveFidgetInstanceDatums]);

  return { miniApps, handleUpdateMiniApp, handleReorderMiniApps };
};

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
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const { mobilePreview, setMobilePreview } = useMobilePreview();
  const [tabValue, setTabValue] = useState(mobilePreview ? ThemeEditorTab.MOBILE : ThemeEditorTab.SPACE);
  const [showVibeEditor, setShowVibeEditor] = useState(false);

  // Our theme and mobile app helpers
  const { activeTheme, themePropSetter, handleApplyTheme } = useThemeManager(theme, saveTheme);
  const { miniApps, handleUpdateMiniApp, handleReorderMiniApps } = useMobileAppsManager(
    fidgetInstanceDatums, 
    saveFidgetInstanceDatums
  );

  // Use checkpoint store for theme change tracking
  const { createCheckpointFromContext } = useAppStore((state) => ({
    createCheckpointFromContext: state.checkpoints.createCheckpointFromContext,
  }));

  // Get fresh space context for AI chat
  const getFreshSpaceContextForChat = useCallback(() => {
    if (getCurrentSpaceContext) {
      const context = getCurrentSpaceContext();
      // Ensure the context includes the current theme being edited
      return {
        ...context,
        theme: theme,
      };
    }
    return { theme: theme };
  }, [getCurrentSpaceContext, theme]);

  useEffect(() => {
    setMobilePreview(tabValue === ThemeEditorTab.MOBILE);
  }, [tabValue, setMobilePreview]);

  const {
    background,
    font,
    fontColor,
    headingsFont,
    headingsFontColor,
    backgroundHTML,
    fidgetBackground,
    fidgetBorderWidth,
    fidgetBorderColor,
    fidgetShadow,
    fidgetBorderRadius,
    gridSpacing,
  } = theme.properties;

  function saveAndClose() {
    saveTheme(theme);
    saveExitEditMode();
  }

  const handleVibeEditorApplyConfig = async (config: any) => {
    // Create checkpoint before AI applies changes
    if (getCurrentSpaceContext) {
      createCheckpointFromContext(
        getCurrentSpaceContext,
        'Before AI vibe editor changes',
        'theme-editor'
      );
    }

    // Apply the AI-generated configuration to the theme and potentially the full space
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

  // If showing vibe editor, render the AI chat interface
  if (showVibeEditor) {
    return (
      <div className="flex flex-col h-full">
        {/* Header with back button */}
        <div className="flex pb-3 px-2 border-b">
          <button onClick={() => setShowVibeEditor(false)} className="my-auto">
            <BackArrowIcon />
          </button>
          <h1 className="text-lg pl-4 font-semibold">
            Vibe Editor
          </h1>
        </div>

        {/* AI Chat Sidebar with fresh context provider */}
        <div className="flex-1 overflow-hidden">
          <AiChatSidebar
            onClose={() => setShowVibeEditor(false)}
            onApplySpaceConfig={handleVibeEditorApplyConfig}
            getCurrentSpaceContext={getFreshSpaceContextForChat}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full gap-6">
        {/* Theme Editor Title */}
        <div className="flex-col items-center">
          <div className="font-semibold">Edit Theme</div>
          <p className="text-gray-400 text-sm">
            Select a template or{" "}
            <a
              href="https://nounspace.notion.site/Quick-start-Customization-f5aae8f1bef24309a13ca561d7b80fa7?pvs=4"
              target="_blank"
              rel="noreferrer noopener"
              className="underline cursor-pointer"
            >
              learn how to customize
            </a>
          </p>
        </div>
        <div className="h-full overflow-auto flex flex-col gap-4 -mx-2 px-2">
          <div className="grid gap-4">
            <label>
              <input
                className="peer/showLabel absolute scale-0"
                type="checkbox"
              />
              {/* Templates Dropdown */}
              <span className="block max-h-14 max-w-xs overflow-hidden rounded-lg transition-all duration-300 peer-checked/showLabel:max-h-full p-1">
                <div className="flex flex-row w-full">
                  <div className="flex basis-3/4 grow">
                    {/* Theme Card Example */}
                    <ThemeCard themeProps={theme.properties} />
                  </div>
                  <div className="flex basis-1/4 items-center justify-center">
                    <MdMenuBook className="w-6 h-6" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3 pt-3">
                  {THEMES.map((theme, i) => (
                    <ThemeCard
                      key={`${theme.id}-${i}`}
                      themeProps={theme.properties}
                      onClick={() => handleApplyTheme(theme)}
                      active={activeTheme === theme.id}
                    />
                  ))}
                </div>
              </span>
            </label>

            {/* Templates Dropdown */}
            <div className="min-w-0">
              <Tabs value={tabValue} onValueChange={(value) => setTabValue(value as ThemeEditorTab)}>
                {/* controlled Tabs */}
                <ThemeSettingsTabs activeTab={tabValue} onTabChange={setTabValue} />
                {/* Fonts */}
                <TabsContent value={ThemeEditorTab.SPACE} className={tabContentClasses}>
                  <SpaceTabContent 
                    background={background}
                    headingsFontColor={headingsFontColor}
                    headingsFont={headingsFont}
                    fontColor={fontColor}
                    font={font}
                    onPropertyChange={themePropSetter}
                  />
                  
                  <div className="grid gap-2 mt-4">
                    <div className="flex flex-row gap-1">
                      <h4 className="text-sm">Music</h4>
                      <ThemeSettingsTooltip text="Search or paste Youtube link for any song, video, or playlist." />
                    </div>
                    <VideoSelector
                      initialVideoURL={theme.properties.musicURL}
                      onVideoSelect={themePropSetter("musicURL")}
                    />
                    {/* Custom HTML/CSS Background Input & Generator Button */}
                    <div className="flex flex-col gap-2 mt-4">
                      <BackgroundGenerator
                        backgroundHTML={backgroundHTML}
                        onChange={themePropSetter("backgroundHTML")}
                      />
                    </div>
                  </div>
                </TabsContent>
                {/* Style */}
                <TabsContent value={ThemeEditorTab.FIDGETS} className={tabContentClasses}>
                  <StyleTabContent 
                    fidgetBackground={fidgetBackground}
                    fidgetBorderColor={fidgetBorderColor}
                    fidgetBorderWidth={fidgetBorderWidth}
                    fidgetShadow={fidgetShadow}
                    fidgetBorderRadius={fidgetBorderRadius}
                    gridSpacing={gridSpacing}
                    onPropertyChange={themePropSetter}
                  />
                </TabsContent>
                {/* Code */}
                <TabsContent value={ThemeEditorTab.CODE} className={tabContentClasses}>
                  <CodeTabContent 
                    backgroundHTML={backgroundHTML}
                    onPropertyChange={themePropSetter}
                    onExportConfig={onExportConfig}
                  />
                </TabsContent>
                {/* Mobile */}
                <TabsContent value={ThemeEditorTab.MOBILE} className={tabContentClasses}>
                  <MobileTabContent 
                    miniApps={miniApps}
                    onUpdateMiniApp={handleUpdateMiniApp}
                    onReorderMiniApps={handleReorderMiniApps}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {tabValue === ThemeEditorTab.SPACE && (
            <NogsGateButton
              className="flex gap-1 items-center border-2 border-orange-600 text-orange-600 bg-orange-100 rounded-lg p-2 text-sm font-medium cursor-pointer"
              onClick={() => setShowVibeEditor(true)}
            >
              <p>
                <span className="font-bold">New!</span> Vibe editor is here!
              </p>
              {/* <HiOutlineSparkles size={32} /> */}
              <SparklesIcon className="size-8" />
            </NogsGateButton>
          )}

          {/* Actions */}
          <div className="shrink-0 flex flex-col gap-3 pb-8">
            {showConfirmCancel ? (
              // Back Button and Exit Button (shows second)
              <>
                <p className="w-full text-center text-xs pt-1 pl-8 pr-8">
                  If you exit, any changes made will not be saved.
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <Button
                    onClick={() => setShowConfirmCancel(false)}
                    size="icon"
                    variant="secondary"
                  >
                    <BackArrowIcon />
                  </Button>
                  <Button
                    onClick={cancelExitEditMode}
                    variant="destructive"
                    width="auto"
                    withIcon
                  >
                    <FaTriangleExclamation
                      className="h-8l shrink-0"
                      aria-hidden="true"
                    />
                    <span>Exit</span>
                  </Button>
                </div>
              </>
            ) : (
              // X Button and Save Button (shows first)
              <>
                {onExportConfig && (
                  <div className="gap-2 pt-2 flex items-center justify-center">
                    <Button
                      onClick={onExportConfig}
                      variant="secondary"
                      width="auto"
                      withIcon
                      className="w-full"
                    >
                      <FaDownload aria-hidden="true" />
                      <span>Export Config</span>
                    </Button>
                  </div>
                )}
                <div className="gap-2 pt-2 flex items-center justify-center">
                  <Button
                    onClick={() => setShowConfirmCancel(true)}
                    size="icon"
                    variant="secondary"
                  >
                    <FaX aria-hidden="true" />
                  </Button>

                  <Button
                    onClick={saveAndClose}
                    variant="primary"
                    width="auto"
                    withIcon
                  >
                    <FaFloppyDisk aria-hidden="true" />
                    <span>Save</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


export default ThemeSettingsEditor;