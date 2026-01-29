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

export const NavIconBadge: React.FC<NavIconBadgeProps> = ({ children, systemConfig }) => {
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
  /** Controls whether text label is shown (for delayed appearance after sidebar expands) */
  showText?: boolean;
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
  showText,
}) => {
  // Show text if explicitly set, otherwise fall back to !shrunk for backwards compatibility
  const shouldShowText = showText !== undefined ? showText : !shrunk;
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

  /**
   * Handles keyboard navigation for accessibility
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (disable) {
        e.preventDefault();
        return;
      }

      // Enter or Space key activates the link
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (e.key === " ") {
          // Prevent page scroll on Space
          e.preventDefault();
        }
        handleClick(e as unknown as React.MouseEvent<HTMLAnchorElement>);
      }
    },
    [disable, handleClick]
  );

  // Match if pathname exactly equals href, or if pathname starts with href + "/"
  // This allows tabs like /home/Settings to match the /home navigation item
  const isSelected = pathname !== null && (
    pathname === href || 
    (href.startsWith('/') && pathname.startsWith(href + '/'))
  );

  return (
    <li role="none">
      <Link
        href={disable ? "#" : href}
        className={mergeClasses(
          "flex relative items-center p-0 text-inherit rounded-lg dark:text-white hover:bg-[rgba(128,128,128,0.15)] w-full group min-h-[40px]",
          isSelected ? "bg-[rgba(128,128,128,0.2)]" : "",
          disable ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        target={openInNewTab ? "_blank" : undefined}
        aria-label={shrunk ? label : undefined}
        aria-current={isSelected ? "page" : undefined}
        tabIndex={disable ? -1 : 0}
      >
        {/* Fixed-width icon container matching condensed sidebar - icons always centered here */}
        <div className="w-[82px] flex justify-center shrink-0 relative">
          {badgeText && <NavIconBadge systemConfig={systemConfig}>{badgeText}</NavIconBadge>}
          <Icon aria-hidden="true" />
        </div>
        {/* Text overlays icon container with negative margin, fades in after sidebar expands */}
        <span
          className={mergeClasses(
            "relative z-10 whitespace-nowrap transition-opacity duration-200 -ml-3",
            shouldShowText ? "opacity-100" : "opacity-0 invisible"
          )}
        >
          {label}
        </span>
      </Link>
    </li>
  );
};

NavigationItemComponent.displayName = 'NavigationItem';

/**
 * Memoized navigation item component with custom comparison
 * 
 * Only re-renders when props that affect rendering actually change.
 * Compares systemConfig by communityId (stable) rather than object reference
 * to avoid unnecessary re-renders when systemConfig object reference changes.
 */
export const NavigationItem = React.memo(
  NavigationItemComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.label === nextProps.label &&
      prevProps.href === nextProps.href &&
      prevProps.shrunk === nextProps.shrunk &&
      prevProps.disable === nextProps.disable &&
      prevProps.openInNewTab === nextProps.openInNewTab &&
      prevProps.badgeText === nextProps.badgeText &&
      prevProps.showText === nextProps.showText &&
      // Compare systemConfig by stable communityId instead of object reference
      prevProps.systemConfig.communityId === nextProps.systemConfig.communityId
    );
  }
);

export interface NavigationButtonProps {
  label: string;
  Icon: React.FC;
  onClick?: () => void;
  disable?: boolean;
  badgeText?: string | null;
  shrunk?: boolean;
  systemConfig: SystemConfig;
  /** Controls whether text label is shown (for delayed appearance after sidebar expands) */
  showText?: boolean;
}

const NavigationButtonComponent: React.FC<NavigationButtonProps> = ({
  label,
  Icon,
  onClick,
  disable = false,
  badgeText = null,
  shrunk = false,
  systemConfig,
  showText,
}) => {
  // Show text if explicitly set, otherwise fall back to !shrunk for backwards compatibility
  const shouldShowText = showText !== undefined ? showText : !shrunk;
  /**
   * Handles keyboard navigation for accessibility
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disable) {
        e.preventDefault();
        return;
      }

      // Enter or Space key activates the button
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.();
      }
    },
    [disable, onClick]
  );

  return (
    <li role="none">
      <button
        disabled={disable}
        className={mergeClasses(
          "flex relative items-center p-0 text-inherit rounded-lg dark:text-white w-full group min-h-[40px]",
          "hover:bg-[rgba(128,128,128,0.15)]",
          disable ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={shrunk ? label : undefined}
        tabIndex={disable ? -1 : 0}
      >
        {/* Fixed-width icon container matching condensed sidebar - icons always centered here */}
        <div className="w-[82px] flex justify-center shrink-0 relative">
          {badgeText && <NavIconBadge systemConfig={systemConfig}>{badgeText}</NavIconBadge>}
          <Icon aria-hidden="true" />
        </div>
        {/* Text overlays icon container with negative margin, fades in after sidebar expands */}
        <span
          className={mergeClasses(
            "relative z-10 whitespace-nowrap transition-opacity duration-200 -ml-3",
            shouldShowText ? "opacity-100" : "opacity-0 invisible"
          )}
        >
          {label}
        </span>
      </button>
    </li>
  );
};

NavigationButtonComponent.displayName = 'NavigationButton';

/**
 * Memoized navigation button component with custom comparison
 * 
 * Only re-renders when props that affect rendering actually change.
 * Compares systemConfig by communityId (stable) rather than object reference.
 */
export const NavigationButton = React.memo(
  NavigationButtonComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.label === nextProps.label &&
      prevProps.shrunk === nextProps.shrunk &&
      prevProps.disable === nextProps.disable &&
      prevProps.badgeText === nextProps.badgeText &&
      prevProps.showText === nextProps.showText &&
      // Compare systemConfig by stable communityId instead of object reference
      prevProps.systemConfig.communityId === nextProps.systemConfig.communityId
    );
  }
);
