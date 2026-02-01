import { Button } from "@/common/components/atoms/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/atoms/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/common/components/atoms/tooltip";
import { AnalyticsEvent } from "@/common/constants/analyticsEvents";
import {
  FidgetFieldConfig,
  FidgetProperties,
  FidgetSettings,
} from "@/common/fidgets";
import { useAppStore } from "@/common/data/stores/app";
import { useFidgetSettings } from "@/common/lib/hooks/useFidgetSettings";
import { useUIColors } from "@/common/lib/hooks/useUIColors";
import {
  tabContentClasses,
  tabListClasses,
  tabTriggerClasses,
} from "@/common/lib/theme/helpers";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import { analytics } from "@/common/providers/AnalyticsProvider";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaCircleInfo, FaTrashCan } from "react-icons/fa6";
import BackArrowIcon from "../atoms/icons/BackArrow";

export type FidgetSettingsEditorProps = {
  fidgetId: string;
  readonly properties: FidgetProperties;
  settings: FidgetSettings;
  onSave: (settings: FidgetSettings, shouldUnselect?: boolean) => void;
  unselect: () => void;
  removeFidget: (fidgetId: string) => void;
};

type FidgetSettingsRowProps = {
  field: FidgetFieldConfig;
  value: any;
  onChange: (value: any) => void;
  hide?: boolean;
  id: string;
  updateSettings?: (partial: FidgetSettings) => void;
};

export const fieldsByGroup = (fields: FidgetFieldConfig[]) => {
  return fields.reduce(
    (acc, field) => {
      if (field.group) {
        acc[field.group].push(field);
      } else {
        acc["settings"].push(field);
      }
      return acc;
    },
    { settings: [], style: [], code: [] } as Record<
      string,
      FidgetFieldConfig[]
    >,
  );
};

export const FidgetSettingsRow: React.FC<FidgetSettingsRowProps> = ({
  field,
  value,
  onChange,
  hide,
  id,
  updateSettings,
}) => {
  const InputComponent = field.inputSelector;
  const isValid = !field.validator || field.validator(value);
  const errorMessage =
    !isValid && field.errorMessage
      ? typeof field.errorMessage === "function"
        ? field.errorMessage(value)
        : field.errorMessage
      : undefined;

  return (
    <div
      className={mergeClasses(
        "text-gray-700 md:flex-col md:items-center",
        hide && "hidden",
        !isValid && "text-red-500"
      )}
      id={id}
    >
      <div className="md:mb-0 md:w-full flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-900 dark:text-white">
          {field.displayName || field.fieldName}
        </label>
        {field.displayNameHint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <FaCircleInfo color="#D1D5DB" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-44">{field.displayNameHint}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <InputComponent
          id={id}
          value={value}
          onChange={onChange}
          // Provide extended API for custom inputs that need to update multiple settings
          updateSettings={updateSettings}
          className={mergeClasses(
            "!h-9 !rounded-md font-medium !shadow-none",
            !isValid && "border-red-500"
          )}
        />
        {errorMessage && (
          <p className="text-xs text-red-500" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export const FidgetSettingsGroup: React.FC<{
  fidgetId: string;
  fields: FidgetFieldConfig[];
  state: FidgetSettings;
  setState: (state: FidgetSettings) => void;
  onSave: (state: FidgetSettings) => void;
}> = ({ fields, state, setState, onSave, fidgetId }) => {
  return (
    <>
      {fields.map((field, i) => {
        const value =
          (field.fieldName in state && state[field.fieldName]) || "";
        const updateSettings = (partial: FidgetSettings) => {
          const data = { ...state, ...partial };
          setState(data);
          onSave(data);
        };
        return (
          <FidgetSettingsRow
            field={field}
            key={`${fidgetId}-${i}-${field.fieldName}`}
            id={`${fidgetId}-${i}-${field.fieldName}`}
            value={value}
            onChange={(val) => {
              const data = {
                ...state,
                [field.fieldName]: val,
              };

              setState(data);
              onSave(data);
            }}
            updateSettings={updateSettings}
            hide={field.disabledIf && field.disabledIf(state)}
          />
        );
      })}
    </>
  );
};

const fillWithDefaults = (
  input: FidgetSettings,
  fields: FidgetFieldConfig[],
  options?: { skipDefaults?: string[] },
) =>
  fields.reduce((acc, field) => {
    const value =
      input && typeof input === "object"
        ? (input as any)[field.fieldName]
        : undefined;
    const hasValue =
      value !== undefined &&
      value !== null &&
      (typeof value !== "string" || value.trim() !== "");
    const skipDefault = options?.skipDefaults?.includes(field.fieldName);
    acc[field.fieldName] = hasValue
      ? value
      : skipDefault
      ? undefined
      : field.default ?? "";
    return acc;
  }, {} as FidgetSettings);

export const FidgetSettingsEditor: React.FC<FidgetSettingsEditorProps> = ({
  fidgetId,
  properties,
  settings,
  onSave,
  unselect,
  removeFidget,
}) => {

  // Get current space/tab from zustand
  const currentSpaceId = useAppStore((state) => state.currentSpace.currentSpaceId);
  const currentTabName = useAppStore((state) => state.currentSpace.currentTabName);

  // Subscribe directly to zustand for settings - eliminates prop lag
  const zustandSettings = useFidgetSettings(currentSpaceId, currentTabName, fidgetId);

  const normalizedSettings = useMemo(
    () => fillWithDefaults(zustandSettings ?? settings, properties.fields),
    [zustandSettings, settings, properties.fields],
  );

  const [state, setState] = useState<FidgetSettings>(normalizedSettings);
  const uiColors = useUIColors();

  // Update local state when zustand settings change
  useEffect(() => {
    if (zustandSettings) {
      const normalized = fillWithDefaults(zustandSettings, properties.fields);
      setState(normalized);
    }
  }, [zustandSettings, properties.fields]);

  const saveWithValidation = useCallback(
    (nextState: FidgetSettings, shouldUnselect?: boolean) => {
      const filledState = fillWithDefaults(nextState, properties.fields);
      setState(filledState);
      onSave(filledState, shouldUnselect);
    },
    [properties.fields, onSave],
  );

  // Save handler for inline field changes (doesn't unselect editor)
  const onInlineSave = useCallback(
    (nextState: FidgetSettings) => {
      saveWithValidation(nextState, false);
    },
    [saveWithValidation],
  );

  const _onSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      saveWithValidation(state, true);
      analytics.track(AnalyticsEvent.EDIT_FIDGET, {
        fidgetType: properties.fidgetName,
      });
    },
    [state, saveWithValidation, properties.fidgetName],
  );

  const groupedFields = useMemo(
    () => fieldsByGroup(properties.fields),
    [properties.fields],
  );

  return (
    <form
      key={fidgetId}
      onSubmit={_onSave}
      className="flex-col flex h-full"
    >
      <div className="h-full overflow-auto" style={{ overscrollBehavior: "contain" }}>
        <div className="flex pb-4 m-2">
          <button onClick={unselect} className="my-auto">
            <BackArrowIcon />
          </button>
          <h1 className="capitalize text-lg pl-4">
            Edit {properties.fidgetName} Fidget
          </h1>
        </div>
        <div className="gap-3 flex flex-col">
          <Tabs defaultValue="settings">
            <TabsList className={tabListClasses}>
              <TabsTrigger value="settings" className={tabTriggerClasses}>
                Settings
              </TabsTrigger>
              {groupedFields.style.length > 0 && (
                <TabsTrigger value="style" className={tabTriggerClasses}>
                  Style
                </TabsTrigger>
              )}
              {groupedFields.code.length > 0 && (
                <TabsTrigger value="code" className={tabTriggerClasses}>
                  Code
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="settings" className={tabContentClasses}>
              <FidgetSettingsGroup
                fidgetId={fidgetId}
                fields={groupedFields.settings}
                state={state}
                setState={setState}
                onSave={onInlineSave}
              />
            </TabsContent>
            {groupedFields.style.length > 0 && (
              <TabsContent value="style" className={tabContentClasses}>
                <FidgetSettingsGroup
                  fidgetId={fidgetId}
                  fields={groupedFields.style}
                  state={state}
                  setState={setState}
                  onSave={onInlineSave}
                />
              </TabsContent>
            )}
            {groupedFields.code.length > 0 && (
              <TabsContent value="code" className={tabContentClasses}>
                <FidgetSettingsGroup
                  fidgetId={fidgetId}
                  fields={groupedFields.code}
                  state={state}
                  setState={setState}
                  onSave={onInlineSave}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      <div className="shrink-0 flex flex-col gap-3 pb-8">
        <div className="pt-2 gap-2 flex items-center justify-center">
          <Button
            type="button"
            onClick={() => removeFidget(fidgetId)}
            size="icon"
            variant="secondary"
          >
            <FaTrashCan className="h-8l shrink-0" aria-hidden="true" />
          </Button>

          <Button type="submit" width="auto" className="text-white font-medium transition-colors"
            style={{ backgroundColor: uiColors.primaryColor }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = uiColors.primaryHoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = uiColors.primaryColor;
            }}
          >
            <div className="flex items-center">Done</div>
          </Button>
        </div>
      </div>
    </form>
  );
};

export default FidgetSettingsEditor;
