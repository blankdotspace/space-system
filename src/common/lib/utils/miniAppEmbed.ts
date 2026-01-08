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

export const truncateMiniAppButtonTitle = (title: string) => {
  if (title.length <= MAX_BUTTON_TITLE_LENGTH) {
    return title;
  }
  const ellipsis = "...";
  const sliceLimit = Math.max(0, MAX_BUTTON_TITLE_LENGTH - ellipsis.length);
  return `${title.slice(0, sliceLimit)}${ellipsis}`;
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
