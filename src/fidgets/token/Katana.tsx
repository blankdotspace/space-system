import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/atoms/select";
import {
  FidgetArgs,
  FidgetModule,
  FidgetProperties,
  type FidgetSettingsStyle,
} from "@/common/fidgets";
import { defaultStyleFields, WithMargin } from "@/fidgets/helpers";

const styleFields = defaultStyleFields.filter(
  (field) => field.fieldName !== "background",
);

const HOMEPAGE_OPTIONS = {
  overview: {
    label: "Overview",
    url: "https://app.katana.network/",
  },
  earn: {
    label: "Deposit & Earn",
    url: "https://app.katana.network/earn",
  },
  holdings: {
    label: "Holdings",
    url: "https://app.katana.network/holdings",
  },
  activity: {
    label: "Activity",
    url: "https://app.katana.network/activity",
  },
} as const;

type HomepageOption = keyof typeof HOMEPAGE_OPTIONS;

export type KatanaSettings = {
  homepage?: HomepageOption;
} & FidgetSettingsStyle;

const katanaProperties: FidgetProperties = {
  fidgetName: "Katana",
  icon: 0x1f5e1, // 🗡
  fields: [
    {
      fieldName: "homepage",
      displayName: "Homepage",
      displayNameHint: "Choose which Katana page to embed.",
      default: "overview",
      required: true,
      inputSelector: (props) => {
        const value = (props.value as HomepageOption) ?? "overview";
        return (
          <WithMargin>
            <Select
              value={value}
              onValueChange={(selected) => props.updateSettings(selected)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a Katana page">
                  {HOMEPAGE_OPTIONS[value]?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(HOMEPAGE_OPTIONS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WithMargin>
        );
      },
      group: "settings",
    },
    ...styleFields,
  ],
  size: {
    minHeight: 6,
    maxHeight: 36,
    minWidth: 4,
    maxWidth: 36,
  },
};

const Katana: React.FC<FidgetArgs<KatanaSettings>> = ({ settings }) => {
  const {
    homepage = "overview",
    fidgetBorderColor,
    fidgetBorderWidth,
    fidgetShadow,
  } = settings;

  const homepageUrl =
    HOMEPAGE_OPTIONS[homepage]?.url ?? HOMEPAGE_OPTIONS.overview.url;

  return (
    <div
      style={{
        overflow: "hidden",
        width: "100%",
        borderColor: fidgetBorderColor,
        borderWidth: fidgetBorderWidth,
        boxShadow: fidgetShadow,
      }}
      className="h-[calc(100dvh-220px)] md:h-full"
    >
      <iframe
        src={homepageUrl}
        title="Katana"
        className="size-full"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        allow="clipboard-write; encrypted-media; fullscreen"
      />
    </div>
  );
};

export default {
  fidget: Katana,
  properties: katanaProperties,
} as FidgetModule<FidgetArgs<KatanaSettings>>;
