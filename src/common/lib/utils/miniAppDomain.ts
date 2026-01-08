export const resolveMiniAppDomain = (baseUrl: string): string => {
  if (!baseUrl) {
    return "";
  }

  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname;
  } catch {
    const trimmed = baseUrl.replace(/^https?:\/\//i, "");
    return trimmed.split("/")[0]?.split(":")[0] ?? "";
  }
};
