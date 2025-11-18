import { NavigationConfig } from "../systemConfig";

export const clankerNavigation: NavigationConfig = {
  logoTooltip: {
    text: "clanker.world",
    href: "https://www.clanker.world",
  },
  items: [
    { id: 'home', label: 'Home', href: '/home', icon: 'home' },
    { id: 'explore', label: 'Explore', href: '/explore', icon: 'explore' },
    { id: 'notifications', label: 'Notifications', href: '/notifications', icon: 'notifications', requiresAuth: true },
    { id: 'clanker-token', label: '$CLANKER', href: '/t/base/0x1bc0c42215582d5a085795f4badbac3ff36d1bcb/Profile', icon: 'robot' },
  ],
  showMusicPlayer: false,
  showSocials: false,
};

export default clankerNavigation;

