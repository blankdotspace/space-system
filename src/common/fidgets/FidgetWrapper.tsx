import { Card, CardContent } from "@/common/components/atoms/card";
import CSSInput from "@/common/components/molecules/CSSInput";
import ScopedStyles from "@/common/components/molecules/ScopedStyles";
import { useAppStore } from "@/common/data/stores/app";
import { useFidgetSettings } from "@/common/lib/hooks/useFidgetSettings";
import { reduce, isEqual } from "lodash";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { FaX } from "react-icons/fa6";
import { toast } from "sonner";
import {
  FidgetArgs,
  FidgetBundle,
  FidgetConfig,
  FidgetData,
  FidgetProperties,
  FidgetRenderContext,
  FidgetSettings,
} from ".";
import GrabHandleIcon from "../components/atoms/icons/GrabHandle";
import StashIcon from "../components/atoms/icons/Stash";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/atoms/tooltip";
import FidgetSettingsEditor from "../components/organisms/FidgetSettingsEditor";

export type FidgetWrapperProps = {
  fidget: React.FC<FidgetArgs>;
  bundle: FidgetBundle;
  context?: FidgetRenderContext;
  saveConfig: (conf: FidgetConfig) => Promise<void>;
  setCurrentFidgetSettings: (currentFidgetSettings: React.ReactNode) => void;
  setSelectedFidgetID: (selectedFidgetID: string) => void;
  selectedFidgetID: string;
  removeFidget: (fidgetId: string) => void;
  minimizeFidget: (fidgetId: string) => void;
  borderRadius?: string;
};

export const getSettingsWithDefaults = (
  settings: FidgetSettings,
  config: FidgetProperties,
): FidgetSettings => {
  return reduce(
    config.fields,
    (acc, f) => {
      const value =
        settings && typeof settings === "object" && f.fieldName in settings
          ? (settings as any)[f.fieldName]
          : undefined;

      const hasValue =
        value !== undefined &&
        value !== null &&
        (typeof value !== "string" || value.trim() !== "");

      acc[f.fieldName] = hasValue ? value : f.default ?? "";
      return acc;
    },
    {},
  );
};

export function FidgetWrapper({
  fidget,
  bundle,
  saveConfig,
  setCurrentFidgetSettings,
  setSelectedFidgetID,
  selectedFidgetID,
  removeFidget,
  minimizeFidget,
  borderRadius,
}: FidgetWrapperProps) {
  const { homebaseConfig } = useAppStore((state) => ({
    homebaseConfig: state.homebase.homebaseConfig,
  }));

  // Get current space/tab from zustand
  const currentSpaceId = useAppStore((state) => state.currentSpace.currentSpaceId);
  const currentTabName = useAppStore((state) => state.currentSpace.currentTabName);

  // Subscribe directly to zustand for settings - eliminates prop lag
  const zustandSettings = useFidgetSettings(currentSpaceId, currentTabName, bundle.id);

  const Fidget = fidget;

  // Generic settings backfill: any fidget can use lastFetchSettings in config.data
  // to automatically backfill empty settings. This is useful when fidgets are created
  // from external sources (e.g., URL parameters) and need to populate settings.
  const disableSettingsBackfill = bundle.properties.disableSettingsBackfill;
  const lastFetchSettings = disableSettingsBackfill
    ? undefined
    : (bundle.config?.data as {
        lastFetchSettings?: Partial<FidgetSettings>;
      } | undefined)?.lastFetchSettings;

  const derivedSettings = useMemo<FidgetSettings>(() => {
    // Use zustand settings directly (they're already the latest), fall back to props
    const baseSettings = (zustandSettings ?? bundle.config.settings ?? {}) as FidgetSettings;
    if (!lastFetchSettings || typeof lastFetchSettings !== "object") {
      return baseSettings;
    }

    const nextSettings: FidgetSettings = { ...baseSettings };
    let changed = false;

    // Helper to only fill empty settings
    const setValue = (key: string, value: unknown) => {
      const current = nextSettings[key];
      // Don't overwrite existing non-empty values
      if (current !== undefined && current !== null && current !== "") {
        return;
      }

      if (value !== undefined && value !== null) {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed) {
            nextSettings[key] = trimmed;
            changed = true;
          }
        } else {
          nextSettings[key] = value;
          changed = true;
        }
      }
    };

    // Backfill from lastFetchSettings (any fidget can use this pattern)
    Object.entries(lastFetchSettings).forEach(([key, value]) => {
      setValue(key, value);
    });

    return changed ? nextSettings : baseSettings;
  }, [zustandSettings, bundle.config.settings, lastFetchSettings]);

  const settingsWithDefaults = useMemo(
    () => getSettingsWithDefaults(derivedSettings, bundle.properties),
    [derivedSettings, bundle.properties],
  );

  const shouldAttemptBackfill =
    !!lastFetchSettings &&
    !isEqual(derivedSettings, bundle.config.settings ?? {});

  const lastBackfillAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldAttemptBackfill) {
      lastBackfillAttemptRef.current = null;
      return;
    }

    const serialized = JSON.stringify(derivedSettings);
    if (lastBackfillAttemptRef.current === serialized) {
      return;
    }
    lastBackfillAttemptRef.current = serialized;

    (async () => {
      try {
        await saveConfig({
          ...bundle.config,
          settings: derivedSettings,
        });
      } catch (error) {
        console.error("Failed to backfill settings from lastFetchSettings", error);
        lastBackfillAttemptRef.current = null;
      }
    })();
  }, [shouldAttemptBackfill, derivedSettings, bundle.config, saveConfig]);

  const saveData = useCallback(
    (data: FidgetData) =>
      saveConfig({
        ...bundle.config,
        data,
      }),
    [bundle.config, saveConfig],
  );

  const unselect = useCallback(() => {
    setSelectedFidgetID("");
    setCurrentFidgetSettings(<></>);
  }, [setSelectedFidgetID, setCurrentFidgetSettings]);

  const onSave = useCallback(
    async (newSettings: FidgetSettings, shouldUnselect?: boolean) => {
      try {
        // This updates zustand immediately (synchronously)
        // Component will re-render automatically via zustand subscription
        await saveConfig({
          ...bundle.config,
          settings: newSettings,
        });
        if (shouldUnselect) {
          unselect();
        }
      } catch (e) {
        toast.error("Failed to save fidget settings", { duration: 1000 });
      }
    },
    [bundle.config, saveConfig, unselect],
  );

  function onClickEdit() {
    setSelectedFidgetID(bundle.id);
    setCurrentFidgetSettings(
      <FidgetSettingsEditor
        fidgetId={bundle.id}
        properties={bundle.properties}
        settings={settingsWithDefaults}
        onSave={onSave}
        unselect={unselect}
        removeFidget={removeFidget}
      />,
    );
  }

  const userStyles = bundle.properties.fields
    .filter((f) => f.inputSelector === CSSInput)
    .map((f) => settingsWithDefaults[f.fieldName]);

  const homebaseTheme = homebaseConfig?.theme?.properties;
  const useDefaultColors = settingsWithDefaults.useDefaultColors;
  const resolvedBackground = useDefaultColors
    ? homebaseTheme?.fidgetBackground
    : settingsWithDefaults.background;
  const resolvedBorderColor = useDefaultColors
    ? homebaseTheme?.fidgetBorderColor
    : settingsWithDefaults.fidgetBorderColor;
  const resolvedBorderWidth = useDefaultColors
    ? homebaseTheme?.fidgetBorderWidth
    : settingsWithDefaults.fidgetBorderWidth;
  const resolvedBoxShadow = useDefaultColors
    ? homebaseTheme?.fidgetShadow
    : settingsWithDefaults.fidgetShadow;
  const resolvedBorderRadius =
    borderRadius !== undefined && borderRadius !== null
      ? borderRadius
      : homebaseTheme?.fidgetBorderRadius || "12px";

  return (
    <>
      <div
        className={
          selectedFidgetID === bundle.id
            ? "absolute -mt-7 opacity-80 transition-opacity ease-in flex flex-row h-6 z-50"
            : "absolute -mt-7 opacity-0 transition-opacity ease-in flex flex-row h-6 z-50"
        }
        data-fidget-controls
      >
        <Card className="h-full grabbable rounded-lg w-6 flex items-center justify-center bg-[#F3F4F6] hover:bg-sky-100 text-[#1C64F2]">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <GrabHandleIcon />
                </div>
              </TooltipTrigger>
              <TooltipContent>Drag to Move</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Card>
        <button
          onClick={() => {
            minimizeFidget(bundle.id);
          }}
        >
          <Card className="h-full rounded-lg ml-1 w-6 flex items-center justify-center bg-[#F3F4F6] hover:bg-sky-100 text-[#1C64F2]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <StashIcon />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Stash in Fidget Tray</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Card>
        </button>
        <button
          onClick={() => {
            removeFidget(bundle.id);
          }}
        >
          <Card className="h-full rounded-lg ml-1 w-6 flex items-center justify-center bg-[#F3F4F6] hover:bg-red-100 text-[#1C64F2]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <FaX className="w-5/12" />
                </TooltipTrigger>
                <TooltipContent>Remove Fidget</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Card>
        </button>
      </div>
      <Card
        className={
          selectedFidgetID === bundle.id
            ? "size-full border-solid border-sky-600 border-4 overflow-hidden"
            : "size-full overflow-hidden"
        }
        style={{
          background: resolvedBackground,
          borderColor: resolvedBorderColor,
          borderWidth: resolvedBorderWidth,
          boxShadow: resolvedBoxShadow,
          borderRadius: resolvedBorderRadius,
        }}
      >
        {bundle.config.editable && (
          <button
            onMouseDown={onClickEdit}
            className="items-center justify-center opacity-0 hover:opacity-50 duration-500 absolute inset-0 z-30 flex bg-slate-400 bg-opacity-50 rounded-md"
          ></button>
        )}
        <ScopedStyles cssStyles={userStyles} className="size-full">
          <CardContent className="size-full p-0">
            <Fidget
              {...{
                settings: settingsWithDefaults,
                data: bundle.config.data,
                saveData,
              }}
            />
          </CardContent>
        </ScopedStyles>
      </Card>
    </>
  );
}
