export const resolveMiniAppDomain = (baseUrl: string): string => {
  if (!baseUrl) {
    return "";
  }

  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname;
  } catch {
    return baseUrl
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .split(":")[0];
  }
};
