import IFrameWidthSlider from "@/common/components/molecules/IframeScaleSlider";
import TextInput from "@/common/components/molecules/TextInput";
import {
  FidgetArgs,
  FidgetModule,
  FidgetProperties,
  type FidgetSettingsStyle,
} from "@/common/fidgets";
import { useLoadFarcasterUser } from "@/common/data/queries/farcaster";
import useCurrentFid from "@/common/lib/hooks/useCurrentFid";
import { defaultStyleFields, WithMargin } from "@/fidgets/helpers";
import React, { useCallback, useMemo, useState } from "react";
import { BsPeople, BsPeopleFill } from "react-icons/bs";

export type Top8FidgetSettings = {
  username: string;
  size: number;
} & FidgetSettingsStyle;

type Top8UsernameInputProps = React.ComponentProps<typeof TextInput> & {
  value: string;
  onChange?: (value: string) => void;
};

const Top8UsernameInput: React.FC<Top8UsernameInputProps> = ({
  value,
  onChange,
  ...props
}) => {
  const currentFid = useCurrentFid();
  const { data: currentUserData } = useLoadFarcasterUser(currentFid ?? -1);
  const currentUsername = useMemo(
    () => currentUserData?.users?.[0]?.username?.trim(),
    [currentUserData],
  );
  const [touched, setTouched] = useState(false);

  const normalizedValue = value ?? "";
  const hasValue = normalizedValue.trim() !== "";
  const displayValue =
    !touched && !hasValue && currentUsername ? currentUsername : normalizedValue;

  const handleChange = useCallback(
    (nextValue: string) => {
      setTouched(true);
      onChange?.(nextValue);
    },
    [onChange],
  );

  return <TextInput {...props} value={displayValue} onChange={handleChange} />;
};

const top8Properties: FidgetProperties = {
  fidgetName: "Top 8",
  icon: 0x1f465, // 👥
  mobileIcon: <BsPeople size={20} />,
  mobileIconSelected: <BsPeopleFill size={20} />,
  disableSettingsBackfill: true,
  fields: [
    {
      fieldName: "username",
      displayName: "Farcaster Username",
      displayNameHint: "Leave blank to use the logged-in user.",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <Top8UsernameInput {...props} />
        </WithMargin>
      ),
      group: "settings",
    },
    ...defaultStyleFields,
    {
      fieldName: "size",
      displayName: "Scale",
      required: false,
      default: 0.6,
      inputSelector: IFrameWidthSlider,
      group: "style",
    },
  ],
  size: {
    minHeight: 5,
    maxHeight: 36,
    minWidth: 4,
    maxWidth: 36,
  },
};

const Top8: React.FC<FidgetArgs<Top8FidgetSettings>> = ({ settings }) => {
  const {
    username = "",
    size = 0.6,
    background,
    fidgetBorderColor,
    fidgetBorderWidth,
    fidgetShadow,
  } = settings;

  const currentFid = useCurrentFid();
  const { data: currentUserData } = useLoadFarcasterUser(currentFid ?? -1);
  const currentUsername = useMemo(
    () => currentUserData?.users?.[0]?.username?.trim(),
    [currentUserData],
  );

  const normalizedSettingsUsername = username?.trim().replace(/^@/, "");
  const normalizedCurrentUsername = currentUsername?.trim().replace(/^@/, "");
  const shouldUseLoggedIn = !normalizedSettingsUsername;
  const effectiveUsername = shouldUseLoggedIn
    ? normalizedCurrentUsername
    : normalizedSettingsUsername;

  const iframeUrl = effectiveUsername
    ? `https://top8-pi.vercel.app/${encodeURIComponent(effectiveUsername)}`
    : "";

  return (
    <div
      style={{
        overflow: "hidden",
        width: "100%",
        background,
        borderColor: fidgetBorderColor,
        borderWidth: fidgetBorderWidth,
        boxShadow: fidgetShadow,
      }}
      className="h-[calc(100dvh-220px)] md:h-full"
    >
      {effectiveUsername ? (
        <iframe
          key={effectiveUsername}
          src={iframeUrl}
          title="Top 8"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          style={{
            transform: `scale(${size})`,
            transformOrigin: "0 0",
            width: `${100 / size}%`,
            height: `${100 / size}%`,
          }}
          className="size-full"
          frameBorder="0"
        />
      ) : null}
    </div>
  );
};

export default {
  fidget: Top8,
  properties: top8Properties,
} as FidgetModule<FidgetArgs<Top8FidgetSettings>>;
