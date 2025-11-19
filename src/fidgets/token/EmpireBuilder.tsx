import React from "react";
import TextInput from "@/common/components/molecules/TextInput";
import {
  FidgetArgs,
  FidgetModule,
  FidgetProperties,
  type FidgetSettingsStyle,
} from "@/common/fidgets";
import { defaultStyleFields, WithMargin } from "@/fidgets/helpers";
import { GiCastle } from "react-icons/gi";

export type EmpireBuilderSettings = {
  contractAddress?: string;
} & FidgetSettingsStyle;

const styleFields = defaultStyleFields.filter(
  (field) => field.fieldName !== "background",
);

const empireBuilderProperties: FidgetProperties = {
  fidgetName: "Empire Builder",
  icon: 0x1f3f0, // 🏰
  mobileIcon: <GiCastle size={20} />,
  fields: [
    {
      fieldName: "contractAddress",
      displayName: "Contract address",
      displayNameHint:
        "Optional Ethereum contract address to load in Empire Builder",
      default: "",
      required: false,
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
    minWidth: 3,
    maxWidth: 36,
  },
};

const EmpireBuilder: React.FC<FidgetArgs<EmpireBuilderSettings>> = ({
  settings,
}) => {
  const { contractAddress, fidgetBorderColor, fidgetBorderWidth, fidgetShadow } =
    settings;
  const normalizedAddress = contractAddress?.trim();
  const url = normalizedAddress
    ? `https://www.empirebuilder.world/empire/${normalizedAddress}`
    : "https://www.empirebuilder.world";

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
      <iframe src={url} className="size-full" frameBorder="0" />
    </div>
  );
};

export default {
  fidget: EmpireBuilder,
  properties: empireBuilderProperties,
} as FidgetModule<FidgetArgs<EmpireBuilderSettings>>;
