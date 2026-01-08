export const resolveMiniAppDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    const trimmed = url.replace(/^https?:\/\//i, "");
    return trimmed.split("/")[0]?.split(":")[0] ?? "";
  }
};
