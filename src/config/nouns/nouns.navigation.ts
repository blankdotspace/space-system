import { NavigationConfig } from "../systemConfig";

export const nounsNavigation: NavigationConfig = {
  items: [
    { id: 'home', label: 'Home', href: '/home', icon: 'home' },
    { id: 'explore', label: 'Explore', href: '/explore', icon: 'explore' },
    { id: 'notifications', label: 'Notifications', href: '/notifications', icon: 'notifications', requiresAuth: true },
    { id: 'space-token', label: '$SPACE', href: '/t/base/0xbf63463eE6F105EDC5AdeAa28A0fE8c297aD0b07/Token', icon: 'space' },
  ]
};

export default nounsNavigation;
