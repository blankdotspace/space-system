import React from "react";
import SettingsSelector from "@/common/components/molecules/SettingsSelector";
import TextInput from "@/common/components/molecules/TextInput";
import ThemeColorSelector from "@/common/components/molecules/ThemeColorSelector";
import FontSelector from "@/common/components/molecules/FontSelector";
import {
  type FidgetProperties,
} from "@/common/fidgets";
import { defaultStyleFields, WithMargin } from "@/fidgets/helpers";
import {
  NETWORK_OPTIONS,
  SORT_OPTIONS,
  LAYOUT_OPTIONS,
  ASSET_TYPE_OPTIONS,
  INCLUDE_OPTIONS,
  SOURCE_OPTIONS,
  CHANNEL_FILTER_OPTIONS,
  CSV_TYPE_OPTIONS,
  CSV_SORT_OPTIONS,
} from "./constants";
import type { DirectoryFidgetSettings } from "./types";

const HiddenField: React.FC<any> = () => null;

const styleFields = defaultStyleFields.filter((field) =>
  [
    "background",
    "fidgetBorderColor",
    "fidgetBorderWidth",
    "fidgetShadow",
    "showOnMobile",
    "customMobileDisplayName",
    "mobileIconName",
  ].includes(field.fieldName),
);

export const directoryProperties: FidgetProperties<DirectoryFidgetSettings> = {
  fidgetName: "Directory",
  icon: 0x1f465,
  fields: [
    {
      fieldName: "source",
      displayName: "Source",
      default: "tokenHolders",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <SettingsSelector
            {...props}
            className="[&_label]:!normal-case"
            settings={SOURCE_OPTIONS}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "subheader",
      displayName: "Subheader",
      default: "",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput
            {...props}
            className="[&_label]:!normal-case"
            placeholder="Optional subheader"
          />
        </WithMargin>
      ),
      group: "settings",
    },
    // CSV-specific settings
    {
      fieldName: "csvType",
      displayName: "Type",
      default: "username",
      required: true,
      disabledIf: (settings) => settings?.source !== "csv",
      inputSelector: (props) => (
        <WithMargin>
          <SettingsSelector
            {...props}
            className="[&_label]:!normal-case"
            settings={CSV_TYPE_OPTIONS}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "csvUpload",
      displayName: "Upload CSV",
      required: false,
      disabledIf: (settings) => settings?.source !== "csv",
      inputSelector: ({ updateSettings }) => {
        const fileInputRef = React.useRef<HTMLInputElement | null>(null);
        const handleSelectClick = () => fileInputRef.current?.click();
        const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            updateSettings?.({
              csvContent: text,
              csvUpload: new Date().toISOString(),
              csvFilename: file.name,
            });
            console.log("[Directory] CSV selected:", file.name, "size:", file.size);
          } catch (err) {
            console.error("Failed to read CSV", err);
          } finally {
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }
        };

        return (
          <WithMargin>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-black/5"
                onClick={handleSelectClick}
              >
                Select CSV…
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          </WithMargin>
        );
      },
      group: "settings",
    },
    {
      fieldName: "csvContent",
      displayName: "CSV Content",
      required: false,
      disabledIf: () => true,
      inputSelector: HiddenField,
      group: "settings",
    },
    {
      fieldName: "csvFilename",
      displayName: "CSV File",
      default: "",
      required: false,
      disabledIf: (settings) => settings?.source !== "csv",
      inputSelector: (props) => (
        <WithMargin>
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold">{String(props.value || "—")}</span>
          </div>
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "csvSortBy",
      displayName: "Sort by",
      default: "followers",
      required: true,
      disabledIf: (settings) => settings?.source !== "csv",
      inputSelector: (props) => (
        <WithMargin>
          <SettingsSelector
            {...props}
            className="[&_label]:!normal-case"
            settings={CSV_SORT_OPTIONS}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "network",
      displayName: "Network",
      default: "base",
      required: true,
      disabledIf: (settings) => settings?.source !== "tokenHolders",
      inputSelector: (props) => (
        <WithMargin>
          <SettingsSelector
            {...props}
            className="[&_label]:!normal-case"
            settings={NETWORK_OPTIONS}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "assetType",
      displayName: "Type",
      default: "token",
      required: true,
      disabledIf: (settings) => settings?.source !== "tokenHolders",
      inputSelector: (props) => (
        <WithMargin>
          <SettingsSelector
            {...props}
            className="[&_label]:!normal-case"
            settings={ASSET_TYPE_OPTIONS}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "contractAddress",
      displayName: "Contract Address",
      default: "",
      required: true,
      disabledIf: (settings) => settings?.source !== "tokenHolders",
      validator: (value: string) =>
        !value || /^0x[a-fA-F0-9]{40}$/.test(value.trim()),
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} className="[&_label]:!normal-case" />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "sortBy",
      displayName: "Sort by",
      default: "tokenHoldings",
      required: true,
      disabledIf: (settings) => settings?.source !== "tokenHolders",
      inputSelector: (props) => (
        <WithMargin>
          <SettingsSelector
            {...props}
            className="[&_label]:!normal-case"
            settings={SORT_OPTIONS}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "layoutStyle",
      displayName: "Style",
      default: "cards",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <SettingsSelector
            {...props}
            className="[&_label]:!normal-case"
            settings={LAYOUT_OPTIONS}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "include",
      displayName: "Filter",
      default: "holdersWithFarcasterAccount",
      required: true,
      disabledIf: (settings) => settings?.source !== "tokenHolders",
      inputSelector: (props) => (
        <WithMargin>
          <SettingsSelector
            {...props}
            className="[&_label]:!normal-case"
            settings={INCLUDE_OPTIONS}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    // Farcaster Channel specific settings
    {
      fieldName: "channelName",
      displayName: "Channel Name",
      default: "",
      required: true,
      disabledIf: (settings) => settings?.source !== "farcasterChannel",
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} className="[&_label]:!normal-case" />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "channelFilter",
      displayName: "Filter",
      default: "members",
      required: true,
      disabledIf: (settings) => settings?.source !== "farcasterChannel",
      inputSelector: (props) => (
        <WithMargin>
          <SettingsSelector
            {...props}
            className="[&_label]:!normal-case"
            settings={CHANNEL_FILTER_OPTIONS}
          />
        </WithMargin>
      ),
      group: "settings",
    },
    {
      fieldName: "refreshToken",
      displayName: "Refresh Data",
      default: "",
      required: false,
      disabledIf: (settings) => {
        const source = settings?.source ?? "tokenHolders";
        if (source === "tokenHolders") {
          return !settings?.contractAddress;
        }
        if (source === "farcasterChannel") {
          return !(settings?.channelName && settings.channelName.trim().length > 0);
        }
        if (source === "csv") {
          return !(settings?.csvUpload ?? settings?.csvUploadedAt);
        }
        return true;
      },
      inputSelector: ({ updateSettings }) => {
        return (
          <WithMargin>
            <button
              type="button"
              onClick={() => updateSettings?.({ refreshToken: new Date().toISOString() })}
              className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-black/5"
            >
              Refresh Members
            </button>
          </WithMargin>
        );
      },
      group: "settings",
    },
    {
      fieldName: "primaryFontFamily",
      displayName: "Primary Font",
      displayNameHint: "Applied to titles, member names, and other prominent text.",
      default: "var(--user-theme-headings-font)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <FontSelector {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "primaryFontColor",
      displayName: "Primary Font Color",
      displayNameHint: "Color used for headings and primary text accents.",
      default: "var(--user-theme-headings-font-color)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ThemeColorSelector
            {...props}
            themeVariable="var(--user-theme-headings-font-color)"
            defaultColor="#000000"
            colorType="font color"
          />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "secondaryFontFamily",
      displayName: "Secondary Font",
      displayNameHint: "Used for body copy and supporting text.",
      default: "var(--user-theme-font)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <FontSelector {...props} />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "secondaryFontColor",
      displayName: "Secondary Font Color",
      displayNameHint: "Color applied to body text within the directory.",
      default: "var(--user-theme-font-color)",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ThemeColorSelector
            {...props}
            themeVariable="var(--user-theme-font-color)"
            defaultColor="#1f2933"
            colorType="font color"
          />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "buttonColor",
      displayName: "Button Color",
      displayNameHint: "Background color for the Follow button.",
      default: "",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ThemeColorSelector
            {...props}
            themeVariable=""
            defaultColor="#3b82f6"
            colorType="background"
          />
        </WithMargin>
      ),
      group: "style",
    },
    {
      fieldName: "buttonFontColor",
      displayName: "Button Font Color",
      displayNameHint: "Text color for the Follow button.",
      default: "",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ThemeColorSelector
            {...props}
            themeVariable=""
            defaultColor="#ffffff"
            colorType="font color"
          />
        </WithMargin>
      ),
      group: "style",
    },
    ...styleFields,
  ],
  size: {
    minHeight: 4,
    maxHeight: 36,
    minWidth: 4,
    maxWidth: 36,
  },
};

