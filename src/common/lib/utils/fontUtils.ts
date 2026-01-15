export function extractFontFamilyFromUrl(fontUrl?: string): string | undefined {
  if (!fontUrl) return undefined;

  const familyParam = fontUrl.split("family=")[1];
  if (!familyParam) return undefined;

  const family = decodeURIComponent(familyParam.split("&")[0]).replace(/\+/g, " ");
  const familyName = family.split(":")[0];

  return familyName || undefined;
}
