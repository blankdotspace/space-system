export const normalizeTwitterHandle = (handle?: string): string | undefined => {
  if (!handle) {
    return undefined;
  }
  const trimmed = handle.trim();
  if (!trimmed) {
    return undefined;
  }
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  const withoutScheme = withoutAt.replace(/^https?:\/\//i, "");
  const withoutQuery = withoutScheme.split(/[?#]/)[0];
  const parts = withoutQuery.split("/");
  const lastPart = parts[parts.length - 1]?.replace(/^@/, "");
  if (!lastPart) {
    return undefined;
  }
  return `@${lastPart}`;
};
