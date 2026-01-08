type MiniAppEmbedAction = {
  type: "launch_miniapp";
  name: string;
  url: string;
  splashImageUrl: string;
  splashBackgroundColor?: string;
};

export type MiniAppEmbed = {
  version: "1";
  imageUrl: string;
  button: {
    title: string;
    action: MiniAppEmbedAction;
  };
};

const MAX_BUTTON_TITLE_LENGTH = 32;

export const truncateMiniAppButtonTitle = (
  buttonTitle: string,
  maxLength: number = MAX_BUTTON_TITLE_LENGTH,
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

type BuildMiniAppEmbedOptions = {
  imageUrl: string;
  buttonTitle: string;
  actionUrl: string;
  actionName: string;
  splashImageUrl: string;
  splashBackgroundColor?: string;
};

export const buildMiniAppEmbed = ({
  imageUrl,
  buttonTitle,
  actionUrl,
  actionName,
  splashImageUrl,
  splashBackgroundColor = "#FFFFFF",
}: BuildMiniAppEmbedOptions): MiniAppEmbed => ({
  version: "1",
  imageUrl,
  button: {
    title: truncateMiniAppButtonTitle(buttonTitle),
    action: {
      type: "launch_miniapp",
      name: actionName,
      url: actionUrl,
      splashImageUrl,
      splashBackgroundColor,
    },
  },
});
