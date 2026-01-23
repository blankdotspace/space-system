import React, { useEffect, useState, useRef } from "react";
import TextInput from "@/common/components/molecules/TextInput";
import { FidgetArgs, FidgetProperties, FidgetModule } from "@/common/fidgets";
import { FontFamily, Color } from "@/common/lib/theme";

export type ZoraFidgetSettings = {
  text: string;
  fontFamily: FontFamily;
  fontColor: Color;
  headingsFontFamily: FontFamily;
  headingsFontColor: Color;
  background: Color;
  fidgetBorderWidth: string;
  fidgetBorderColor: Color;
  fidgetShadow: string;
  fidgetWidth: string;
  fidgetHeight: string;
};

export const ZoraProperties: FidgetProperties = {
  fidgetName: "zora",
  icon: 0x1f535,
  fields: [
    {
      fieldName: "text",
      default:
        "https://zora.co/coin/0x460779723619a8e25632bce2e74b6b9ce4915c7b/4",
      required: true,
      inputSelector: TextInput,
      group: "settings",
    },
  ],
  size: {
    minHeight: 1,
    maxHeight: 36,
    minWidth: 1,
    maxWidth: 36,
  },
};

export const Zora: React.FC<FidgetArgs<ZoraFidgetSettings>> = ({
  settings: {
    text,
    background,
    fidgetBorderWidth,
    fidgetBorderColor,
    fidgetShadow,
    fidgetWidth,
    fidgetHeight,
  },
}) => {
  const [zoraSource, setZoraSource] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const transformTextIntoIframeString = (text: string): string => {
    //todo: replace referral to blankspace wallet
    return text + "/embed?referrer=0x41CB654D1F47913ACAB158a8199191D160DAbe4A";
  };

  useEffect(() => {
    const transformedEmbed = transformTextIntoIframeString(text);
    setZoraSource(transformedEmbed);
  }, [text]);

  return null;

  return (
    <div
      style={{
        background,
        height: "100%",
        borderWidth: fidgetBorderWidth,
        borderColor: fidgetBorderColor,
        boxShadow: fidgetShadow,
        overflow: "hidden",
        width: "100%",
        position: "relative",
      }}
    >
      {zoraSource && (
        <iframe
          ref={iframeRef}
          src={zoraSource}
          width="100%"
          height="100%"
          frameBorder="0"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            border: "none",
          }}
        ></iframe>
      )}
    </div>
  );
};

export default {
  fidget: Zora,
  properties: ZoraProperties,
} as FidgetModule<FidgetArgs<ZoraFidgetSettings>>;
