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
import { FilterType as FarcasterFilterType } from "@/fidgets/farcaster/Feed";
import { FeedType } from "@neynar/nodejs-sdk/build/api";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCircleInfo, FaTrashCan } from "react-icons/fa6";
import { toast } from "sonner";
import BackArrowIcon from "../atoms/icons/BackArrow";

export type FidgetSettingsEditorProps = {
  fidgetId: string;
  readonly properties: FidgetProperties;
  settings: FidgetSettings;
  onSave: (settings: FidgetSettings, shouldUnselect?: boolean) => void;
  onStateChange?: (settings: FidgetSettings) => void;
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
  isActive?: () => boolean;
}> = ({ fields, state, setState, onSave, fidgetId, isActive }) => {
  const applyFilterTypeChange = (
    current: FidgetSettings,
    nextFilterType: string,
  ): FidgetSettings => {
    const nextState: FidgetSettings = {
      ...current,
      filterType: nextFilterType,
    };

    if (nextFilterType === FarcasterFilterType.Users) {
      nextState.channel = "";
      nextState.keyword = "";
      return nextState;
    }

    if (nextFilterType === FarcasterFilterType.Channel) {
      nextState.users = "";
      nextState.username = "";
      nextState.keyword = "";
      return nextState;
    }

    if (nextFilterType === FarcasterFilterType.Keyword) {
      nextState.users = "";
      nextState.username = "";
      nextState.channel = "";
      return nextState;
    }

    return nextState;
  };

  return (
    <>
      {fields.map((field, i) => {
        const value =
          (field.fieldName in state && state[field.fieldName]) || "";
        const updateSettings = (partial: FidgetSettings) => {
          if (isActive && !isActive()) return;
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
              if (isActive && !isActive()) return;
              if (field.fieldName === "filterType" && typeof val === "string") {
                const nextState = applyFilterTypeChange(state, val);
                setState(nextState);
                onSave(nextState);
                return;
              }
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

const hasFilterTarget = (settings: FidgetSettings) => {
  const candidates = [
    settings.users,
    settings.username,
    settings.channel,
    settings.keyword,
  ];

  return candidates.some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
};

const isInvalidFeedFilter = (settings: FidgetSettings) =>
  settings.feedType === FeedType.Filter && !hasFilterTarget(settings);

const hasValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const inferFilterType = (
  settings: FidgetSettings,
): FarcasterFilterType | undefined => {
  if (hasValue(settings.channel)) return FarcasterFilterType.Channel;
  if (hasValue(settings.keyword)) return FarcasterFilterType.Keyword;
  if (hasValue(settings.username) || hasValue(settings.users)) {
    return FarcasterFilterType.Users;
  }
  return undefined;
};

export const FidgetSettingsEditor: React.FC<FidgetSettingsEditorProps> = ({
  fidgetId,
  properties,
  settings,
  onSave,
  onStateChange,
  unselect,
  removeFidget,
}) => {
  const fillWithDefaults = (
    input: FidgetSettings,
    options?: { skipDefaults?: string[] },
  ) =>
    properties.fields.reduce((acc, field) => {
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

  const normalizeFilterType = (
    input: FidgetSettings,
    allowDefault = true,
    allowInference = true,
  ) => {
    if (input.feedType !== FeedType.Filter) return input;
    const allowed = new Set([
      FarcasterFilterType.Users,
      FarcasterFilterType.Channel,
      FarcasterFilterType.Keyword,
    ]);
    const isValidType =
      typeof input.filterType === "string" && allowed.has(input.filterType as FarcasterFilterType);

    if (allowInference) {
      const inferredType = inferFilterType(input);
      if (inferredType && (!isValidType || input.filterType !== inferredType)) {
        return { ...input, filterType: inferredType };
      }
    }

    if (isValidType) {
      return input;
    }

    if (!allowDefault) {
      if (input.filterType && !allowed.has(input.filterType)) {
        return { ...input, filterType: undefined };
      }
      return input;
    }

    return { ...input, filterType: FarcasterFilterType.Users };
  };

  // Get current space/tab from zustand
  const currentSpaceId = useAppStore((state) => state.currentSpace.currentSpaceId);
  const currentTabName = useAppStore((state) => state.currentSpace.currentTabName);

  // Subscribe directly to zustand for settings - eliminates prop lag
  const zustandSettings = useFidgetSettings(currentSpaceId, currentTabName, fidgetId);

  // Use zustand settings if available, fall back to props
  const effectiveSettings = zustandSettings ?? settings;

  const normalizedSettings = useMemo(
    () =>
      normalizeFilterType(
        fillWithDefaults(effectiveSettings, { skipDefaults: ["filterType"] }),
        false,
        true,
      ),
    [effectiveSettings, properties.fields],
  );

  const [state, setState] = useState<FidgetSettings>(normalizedSettings);
  const activeIdRef = useRef(fidgetId);
  const uiColors = useUIColors();
  const notifyStateChange = (nextState: FidgetSettings) => {
    onStateChange?.(normalizeFilterType(fillWithDefaults(nextState), true, true));
  };
  const setStateWithNotify = (nextState: FidgetSettings) => {
    setState(nextState);
    notifyStateChange(nextState);
  };

  // Update local state when zustand settings change
  useEffect(() => {
    if (zustandSettings) {
      const normalized = normalizeFilterType(
        fillWithDefaults(zustandSettings, { skipDefaults: ["filterType"] }),
        false,
        true,
      );
      setState(normalized);
    }
  }, [zustandSettings, properties.fields]);

  useEffect(() => {
    activeIdRef.current = fidgetId;
  }, [fidgetId]);

  const saveWithValidation = (
    nextState: FidgetSettings,
    shouldUnselect?: boolean,
    showAlert?: boolean,
    enforceFilterTarget: boolean = true,
  ) => {
    const filledState = normalizeFilterType(
      fillWithDefaults(nextState),
      true,
      true,
    );

    if (enforceFilterTarget && isInvalidFeedFilter(filledState)) {
      if (showAlert) {
        toast.error(
          "Add a user/FID, channel, or keyword before saving a Filter feed.",
        );
      }
      return false;
    }

    setState(filledState);
    onStateChange?.(filledState);
    onSave(filledState, shouldUnselect);
    return true;
  };

  const safeOnSave = (nextState: FidgetSettings) => {
    if (activeIdRef.current !== fidgetId) return;
    // For inline edits, persist without enforcing target so the chosen filter type
    // sticks while the user is still filling fields. Final submit still validates.
    saveWithValidation(nextState, false, false, false);
  };

  const _onSave = (e) => {
    e.preventDefault();
    if (activeIdRef.current !== fidgetId) return;
    const didSave = saveWithValidation(state, true, true, true);
    if (didSave) {
      analytics.track(AnalyticsEvent.EDIT_FIDGET, {
        fidgetType: properties.fidgetName,
      });
    }
  };

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
      <div className="h-full overflow-auto">
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
                setState={setStateWithNotify}
                onSave={safeOnSave}
                isActive={() => activeIdRef.current === fidgetId}
              />
            </TabsContent>
            {groupedFields.style.length > 0 && (
              <TabsContent value="style" className={tabContentClasses}>
                <FidgetSettingsGroup
                  fidgetId={fidgetId}
                  fields={groupedFields.style}
                  state={state}
                  setState={setStateWithNotify}
                  onSave={safeOnSave}
                  isActive={() => activeIdRef.current === fidgetId}
                />
              </TabsContent>
            )}
            {groupedFields.code.length > 0 && (
              <TabsContent value="code" className={tabContentClasses}>
                <FidgetSettingsGroup
                  fidgetId={fidgetId}
                  fields={groupedFields.code}
                  state={state}
                  setState={setStateWithNotify}
                  onSave={safeOnSave}
                  isActive={() => activeIdRef.current === fidgetId}
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
