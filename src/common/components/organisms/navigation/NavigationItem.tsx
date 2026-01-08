import React, { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";
import { SystemConfig } from "@/config";
import { Badge } from "@/common/components/atoms/badge";
import { useUIColors } from "@/common/lib/hooks/useUIColors";

interface NavIconBadgeProps {
  children: React.ReactNode;
  systemConfig: SystemConfig;
}

const NavIconBadge: React.FC<NavIconBadgeProps> = ({ children, systemConfig }) => {
  const uiColors = useUIColors({ systemConfig });
  return (
    <Badge
      className="justify-center text-[11px]/[12px] min-w-[18px] min-h-[18px] font-medium shadow-md px-[3px] rounded-full absolute left-[19px] top-[4px] border-white text-white"
      style={{ backgroundColor: uiColors.primaryColor }}
    >
      {children}
    </Badge>
  );
};

export interface NavigationItemProps {
  label: string;
  Icon: React.FC;
  href: string;
  onClick?: () => void;
  disable?: boolean;
  openInNewTab?: boolean;
  badgeText?: string | null;
  shrunk?: boolean;
  systemConfig: SystemConfig;
  onNavigate?: () => void;
}

const NavigationItemComponent: React.FC<NavigationItemProps> = ({
  label,
  Icon,
  href,
  onClick,
  disable = false,
  openInNewTab = false,
  badgeText = null,
  shrunk = false,
  systemConfig,
  onNavigate,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (disable) {
        e.preventDefault();
        return;
      }

      const isPrimary = e.button === 0;
      const hasMod = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

      if (!openInNewTab && href && href.startsWith("/") && isPrimary && !hasMod) {
        e.preventDefault();
        router.push(href);
        // Execute callbacks after navigation
        React.startTransition(() => {
          onClick?.();
          onNavigate?.();
        });
        return;
      }
      onClick?.();
      onNavigate?.();
    },
    [onClick, onNavigate, href, disable, openInNewTab, router]
  );

  return (
    <li>
      <Link
        href={disable ? "#" : href}
        className={mergeClasses(
          "flex relative items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 w-full group",
          href === pathname ? "bg-gray-100" : "",
          shrunk ? "justify-center" : "",
          disable ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
        )}
        onClick={handleClick}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        target={openInNewTab ? "_blank" : undefined}
      >
        {badgeText && <NavIconBadge systemConfig={systemConfig}>{badgeText}</NavIconBadge>}
        <Icon />
        {!shrunk && <span className="ms-3 relative z-10">{label}</span>}
      </Link>
    </li>
  );
};

NavigationItemComponent.displayName = 'NavigationItem';

export const NavigationItem = React.memo(NavigationItemComponent);

export interface NavigationButtonProps {
  label: string;
  Icon: React.FC;
  onClick?: () => void;
  disable?: boolean;
  badgeText?: string | null;
  shrunk?: boolean;
  systemConfig: SystemConfig;
}

const NavigationButtonComponent: React.FC<NavigationButtonProps> = ({
  label,
  Icon,
  onClick,
  disable = false,
  badgeText = null,
  shrunk = false,
  systemConfig,
}) => {
  return (
    <li>
      <button
        disabled={disable}
        className={mergeClasses(
          "flex relative items-center p-2 text-gray-900 rounded-lg dark:text-white w-full group",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          shrunk ? "justify-center" : "",
          disable ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
        )}
        onClick={onClick}
      >
        {badgeText && <NavIconBadge systemConfig={systemConfig}>{badgeText}</NavIconBadge>}
        <Icon aria-hidden="true" />
        {!shrunk && <span className="ms-3 relative z-10">{label}</span>}
      </button>
    </li>
  );
};

NavigationButtonComponent.displayName = 'NavigationButton';

export const NavigationButton = React.memo(NavigationButtonComponent);

