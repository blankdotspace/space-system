export function resolveAssetUrl(
  assetUrl: string | null | undefined,
  baseUrl?: string,
): string | undefined {
  if (!assetUrl) {
    return undefined;
  }

  const trimmed = assetUrl.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^[a-z][a-z0-9+.-]*:/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    if (baseUrl) {
      try {
        const { protocol } = new URL(baseUrl);
        return `${protocol}${trimmed}`;
      } catch {
        return `https:${trimmed}`;
      }
    }
    return `https:${trimmed}`;
  }

  if (!baseUrl) {
    return trimmed;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return trimmed;
  }
}
