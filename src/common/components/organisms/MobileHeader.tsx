"use client";

import { useLoadFarcasterUser } from "@/common/data/queries/farcaster";
import { useAppStore } from "@/common/data/stores/app";
import { useFarcasterSigner } from "@/fidgets/farcaster";
import CreateCast from "@/fidgets/farcaster/components/CreateCast";
import { first } from "lodash";
import { LogIn, Menu } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CgProfile } from "react-icons/cg";
import { RiQuillPenLine } from "react-icons/ri";
import { Button } from "../atoms/button";
import { Drawer, DrawerContent } from "../atoms/drawer";
import BrandHeader from "../molecules/BrandHeader";
import Modal from "../molecules/Modal";
import Navigation from "./Navigation";
import { useSidebarContext } from "./Sidebar";
import type { DialogContentProps } from "@radix-ui/react-dialog";
import { eventIsFromCastModalInteractiveRegion } from "@/common/lib/utils/castModalInteractivity";
import {
  CastModalPortalBoundary,
  CastDiscardPrompt,
} from "../molecules/CastModalHelpers";
import { toFarcasterCdnUrl } from "@/common/lib/utils/farcasterCdn";
import { useUIColors } from "@/common/lib/hooks/useUIColors";
import { SystemConfig } from "@/config";

type MobileHeaderProps = {
  systemConfig: SystemConfig;
};

const MobileHeader = ({ systemConfig }: MobileHeaderProps) => {
  const setModalOpen = useAppStore((state) => state.setup.setModalOpen);
  const isLoggedIn = useAppStore((state) => state.getIsAccountReady());
  const isInitializing = useAppStore((state) => state.getIsInitializing());
  
  const uiColors = useUIColors({ systemConfig });

  const { setEditMode, sidebarEditable } = useSidebarContext();

  const [navOpen, setNavOpen] = useState(false);
  const [castOpen, setCastOpen] = useState(false);
  const [shouldConfirmCastClose, setShouldConfirmCastClose] = useState(false);
  const [showCastDiscardPrompt, setShowCastDiscardPrompt] = useState(false);

  const closeCastModal = useCallback(() => {
    setCastOpen(false);
    setShowCastDiscardPrompt(false);
    setShouldConfirmCastClose(false);
  }, []);

  const { fid } = useFarcasterSigner("mobile-header");
  const { data } = useLoadFarcasterUser(fid);
  const user = useMemo(() => first(data?.users), [data]);

  const openLogin = useCallback(() => setModalOpen(true), [setModalOpen]);
  const openNav = useCallback(() => setNavOpen(true), []);
  const enterEditMode = useCallback(() => setEditMode(true), [setEditMode]);

  // Memoize the touch handlers to prevent recreation on each render
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const EDGE_THRESHOLD = 20;
    const x = e.touches[0].clientX;
    if (x <= EDGE_THRESHOLD) {
      (e.currentTarget as any)._startX = x;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const target = e.currentTarget as any;
      if (target._startX !== undefined) {
        const deltaX = e.changedTouches[0].clientX - target._startX;
        if (deltaX > 50) {
          setNavOpen(true);
        }
        target._startX = undefined;
      }
    },
    [setNavOpen]
  );

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  // Memoize the component parts to avoid re-renders
  const userAvatar = useMemo(() => {
    if (!isLoggedIn) return null;
    return (
      <button
        onClick={openNav}
        className="rounded-full overflow-hidden w-8 h-8 bg-gray-200 flex items-center justify-center"
      >
        {user?.pfp_url ? (
          <img src={toFarcasterCdnUrl(user.pfp_url || '')} alt={user?.username} className="object-cover w-full h-full" />
        ) : (
          <CgProfile />
        )}
      </button>
    );
  }, [isLoggedIn, user, openNav]);

  const menuButton = useMemo(() => {
    if (isLoggedIn) return null;
    return (
      <Button variant="ghost" size="icon" onClick={openNav} aria-label="Menu">
        <Menu className="w-5 h-5" />
      </Button>
    );
  }, [isLoggedIn, openNav]);

  // fallback: if it takes more than 3s to initialize, it shows the login/cast button normally
  const [timedOut, setTimedOut] = React.useState(false);
  useEffect(() => {
    if (isInitializing) {
      const t = setTimeout(() => setTimedOut(true), 3000);
      return () => clearTimeout(t);
    } else {
      setTimedOut(false);
    }
  }, [isInitializing]);

  const actionButton = useMemo(() => {
    if (isInitializing && !timedOut) {
      // Shows a loading while initializing
      return (
        <Button 
          size="icon" 
          disabled
          className="text-white font-medium rounded-md"
          style={{ backgroundColor: uiColors.primaryColor }}
        >
          <span className="animate-spin">⏳</span>
        </Button>
      );
    }
    if (isLoggedIn) {
      return (
        <Button 
          size="icon" 
          onClick={() => setCastOpen(true)} 
          aria-label="Cast"
          className="text-white font-medium rounded-md transition-colors"
          style={{ backgroundColor: uiColors.castButton.backgroundColor }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = uiColors.castButton.hoverColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = uiColors.castButton.backgroundColor;
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.backgroundColor = uiColors.castButton.activeColor;
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.backgroundColor = uiColors.castButton.hoverColor;
          }}
        >
          <RiQuillPenLine className="w-5 h-5 text-white" />
        </Button>
      );
    }
    return (
      <Button 
        size="sm" 
        onClick={openLogin} 
        withIcon
        className="text-white font-medium rounded-md transition-colors"
        style={{ backgroundColor: uiColors.primaryColor }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = uiColors.primaryHoverColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = uiColors.primaryColor;
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.backgroundColor = uiColors.primaryActiveColor;
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.backgroundColor = uiColors.primaryHoverColor;
        }}
      >
        <LogIn size={16} />
        Sign In
      </Button>
    );
  }, [isLoggedIn, isInitializing, timedOut, openLogin, uiColors]);

  // Memoize drawer change handler
  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setNavOpen(open);
    if (!open) {
      window.scrollTo({ top: 0 });
    }
  }, []);

  const handleCastModalChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (shouldConfirmCastClose) {
          setShowCastDiscardPrompt(true);
          return;
        }

        closeCastModal();
        return;
      }

      setShowCastDiscardPrompt(false);
      setCastOpen(true);
    },
    [closeCastModal, shouldConfirmCastClose],
  );

  const handleCastModalInteractOutside = useCallback<
    NonNullable<DialogContentProps["onInteractOutside"]>
  >(
    (event) => {
      const originalEvent = (event as any)?.detail?.originalEvent as Event | undefined;
      const eventTarget =
        (originalEvent?.target as EventTarget | null) ??
        ((event as any)?.target as EventTarget | null);

      if (eventIsFromCastModalInteractiveRegion(originalEvent, eventTarget)) {
        event.preventDefault();
        return;
      }

      if (!shouldConfirmCastClose) {
        return;
      }

      event.preventDefault();
      setShowCastDiscardPrompt(true);
    },
    [shouldConfirmCastClose],
  );

  const handleCancelDiscard = useCallback(() => {
    setShowCastDiscardPrompt(false);
  }, []);

  const handleDiscardCast = useCallback(() => {
    closeCastModal();
  }, [closeCastModal]);

  useEffect(() => {
    if (!shouldConfirmCastClose) {
      setShowCastDiscardPrompt(false);
    }
  }, [shouldConfirmCastClose]);

  return (
    <header className="z-30 flex items-center justify-between h-14 px-4 bg-white overflow-hidden sticky top-0">
      <div className="flex items-center gap-2">{isLoggedIn ? userAvatar : menuButton}</div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <BrandHeader systemConfig={systemConfig} />
      </div>
      <div className="flex items-center gap-2">{actionButton}</div>
      <Drawer open={navOpen} onOpenChange={handleDrawerOpenChange}>
        <DrawerContent className="p-0" showCloseButton={false}>
          <Navigation
            systemConfig={systemConfig}
            isEditable={sidebarEditable}
            enterEditMode={enterEditMode}
            mobile
            onNavigate={() => {
              setNavOpen(false);
              window.scrollTo({ top: 0 });
            }}
          />
        </DrawerContent>
      </Drawer>
      <Modal
        open={castOpen}
        setOpen={handleCastModalChange}
        focusMode={false}
        showClose={false}
        onInteractOutside={handleCastModalInteractOutside}
        onPointerDownOutside={handleCastModalInteractOutside}
      >
        <CastModalPortalBoundary>
          <>
            <CreateCast
              afterSubmit={closeCastModal}
              onShouldConfirmCloseChange={setShouldConfirmCastClose}
            />
            <CastDiscardPrompt
              open={showCastDiscardPrompt}
              onClose={handleCancelDiscard}
              onDiscard={handleDiscardCast}
            />
          </>
        </CastModalPortalBoundary>
      </Modal>
    </header>
  );
};

export default React.memo(MobileHeader);
