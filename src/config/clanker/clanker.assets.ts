// Source images colocated with config, emitted by bundler
import logo from './assets/logo.svg';
import icon from './assets/logo.svg';
import favicon from './assets/favicon.ico';
import og from './assets/og.jpg';
import applePng from './assets/apple.png';

export const clankerAssets = {
  logos: {
    // Export plain strings resolved by the bundler
    main: logo.src,
    icon: icon.src,
    favicon: favicon.src,
    // Apple touch must be PNG; use local clanker asset
    appleTouch: applePng.src,
    og: og.src,
    splash: og.src
  }
};
