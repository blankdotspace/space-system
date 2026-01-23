import type { FontFamily } from "@/common/lib/theme";
import { FONT_FAMILY_OPTIONS_BY_NAME } from "@/common/lib/theme/fonts";

export function resolveUiFontFamily(fontName?: FontFamily): string | undefined {
  if (!fontName) return undefined;

  return (
    FONT_FAMILY_OPTIONS_BY_NAME[fontName]?.config?.style?.fontFamily ?? fontName
  );
}
