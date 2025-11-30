import {
  gradientAndWave,
  squareGrid,
  floatingShapes,
  tesseractPattern,
  colorBlobs,
  shootingStar,
  imageParallax,
  retro,
  nounish,
} from "./animatedBackgroundsHtml";
import { themes } from "@/config/shared/themes";

// Use themes from shared file (not from config, since themes are shared across communities)
// Convert configuration themes to the expected format
export const THEMES = [
  themes.default,
  {
    ...themes.gradientAndWave,
    properties: {
      ...themes.gradientAndWave.properties,
      backgroundHTML: gradientAndWave,
    },
  },
  {
    ...themes.colorBlobs,
    properties: {
      ...themes.colorBlobs.properties,
      backgroundHTML: colorBlobs,
    },
  },
  {
    ...themes.floatingShapes,
    properties: {
      ...themes.floatingShapes.properties,
      backgroundHTML: floatingShapes,
    },
  },
  {
    ...themes.imageParallax,
    properties: {
      ...themes.imageParallax.properties,
      backgroundHTML: imageParallax,
    },
  },
  {
    ...themes.shootingStar,
    properties: {
      ...themes.shootingStar.properties,
      backgroundHTML: shootingStar,
    },
  },
  {
    ...themes.squareGrid,
    properties: {
      ...themes.squareGrid.properties,
      backgroundHTML: squareGrid,
    },
  },
  {
    ...themes.tesseractPattern,
    properties: {
      ...themes.tesseractPattern.properties,
      backgroundHTML: tesseractPattern,
    },
  },
  {
    ...themes.retro,
    properties: {
      ...themes.retro.properties,
      backgroundHTML: retro,
    },
  },
  {
    ...themes.nounish,
    properties: {
      ...themes.nounish.properties,
      backgroundHTML: nounish,
    },
  },
];