import { NavigationConfig } from "../systemConfig";

export const nounsNavigation: NavigationConfig = {
  logoTooltip: {
    text: "wtf is nouns?",
    href: "https://nouns.wtf",
  },
  items: [
    { id: 'home', label: 'Home', href: '/home', icon: 'home' },
    { id: 'explore', label: 'Explore', href: '/explore', icon: 'explore' },
    { id: 'notifications', label: 'Notifications', href: '/notifications', icon: 'notifications', requiresAuth: true },
    { id: 'space-token', label: '$SPACE', href: '/t/base/0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab/Profile', icon: 'space' },
  ]
};

export default nounsNavigation;

