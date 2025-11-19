import React, { useMemo } from "react";
import TextInput from "@/common/components/molecules/TextInput";
import {
  FidgetArgs,
  FidgetModule,
  FidgetProperties,
  type FidgetSettingsStyle,
} from "@/common/fidgets";
import { defaultStyleFields, WithMargin } from "@/fidgets/helpers";

export type LevrSettings = {
  contractAddress: string;
} & FidgetSettingsStyle;

const styleFields = defaultStyleFields.filter(
  (field) => field.fieldName !== "background",
);

const frameConfig: FidgetProperties = {
  fidgetName: "Levr",
  icon: 0x1fa99, // 🪙
  fields: [
    {
      fieldName: "contractAddress",
      displayName: "Contract Address",
      displayNameHint: "Enter the contract address for the Levr project",
      required: false,
      default: "",
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
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

const baseUrl = "https://www.levr.world/";

const Levr: React.FC<FidgetArgs<LevrSettings>> = ({ settings }) => {
  const { contractAddress, fidgetBorderColor, fidgetBorderWidth, fidgetShadow } =
    settings;

  const projectUrl = useMemo(() => {
    const trimmedAddress = contractAddress?.trim();
    if (!trimmedAddress) return baseUrl;
    return `${baseUrl}project/${encodeURIComponent(trimmedAddress)}`;
  }, [contractAddress]);

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
        src={projectUrl}
        title="Levr Project"
        className="size-full"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        allow="clipboard-write; encrypted-media; fullscreen"
      />
    </div>
  );
};

export default {
  fidget: Levr,
  properties: frameConfig,
} as FidgetModule<FidgetArgs<LevrSettings>>;
