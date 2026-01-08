type MiniAppEmbedAction = {
  type: "launch_frame";
  url: string;
  name: string;
  splashImageUrl?: string;
  splashBackgroundColor?: string;
};

export type MiniAppEmbed = {
  version: "next";
  imageUrl: string;
  button: {
    title: string;
    action: MiniAppEmbedAction;
  };
};

type MiniAppEmbedOptions = {
  imageUrl: string;
  buttonTitle: string;
  actionUrl: string;
  actionName: string;
  splashImageUrl?: string | null;
  splashBackgroundColor?: string;
};

const DEFAULT_SPLASH_BACKGROUND_COLOR = "#FFFFFF";
const DEFAULT_BUTTON_TITLE_MAX_LENGTH = 32;

export const truncateMiniAppButtonTitle = (
  buttonTitle: string,
  maxLength: number = DEFAULT_BUTTON_TITLE_MAX_LENGTH,
): string => {
  const trimmed = buttonTitle.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  if (maxLength <= 3) {
    return trimmed.slice(0, maxLength);
  }

  return `${trimmed.slice(0, maxLength - 3)}...`;
};

export const buildMiniAppEmbed = ({
  imageUrl,
  buttonTitle,
  actionUrl,
  actionName,
  splashImageUrl,
  splashBackgroundColor = DEFAULT_SPLASH_BACKGROUND_COLOR,
}: MiniAppEmbedOptions): MiniAppEmbed => {
  const action: MiniAppEmbedAction = {
    type: "launch_frame",
    url: actionUrl,
    name: actionName,
    splashBackgroundColor,
  };

  if (splashImageUrl) {
    action.splashImageUrl = splashImageUrl;
  }

  return {
    version: "next",
    imageUrl,
    button: {
      title: truncateMiniAppButtonTitle(buttonTitle),
      action,
    },
  };
};
