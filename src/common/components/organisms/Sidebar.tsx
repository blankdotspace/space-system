"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useMemo,
} from "react";
import Navigation from "./Navigation";
import { SystemConfig } from "@/config";

export type SidebarContextProviderProps = { children: React.ReactNode };

export type SidebarContextValue = {
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  sidebarEditable: boolean;
  setSidebarEditable: (value: boolean) => void;
  portalRef: React.RefObject<HTMLDivElement>;
};

export const SidebarContext = createContext<SidebarContextValue>(
  {} as SidebarContextValue,
);

export const SidebarContextProvider: React.FC<SidebarContextProviderProps> = ({
  children,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [sidebarEditable, setSidebarEditable] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);

  const value = useMemo(
    () => ({
      editMode,
      setEditMode,
      sidebarEditable,
      setSidebarEditable,
      portalRef,
    }),
    [editMode, sidebarEditable, portalRef],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};

export const useSidebarContext = (): SidebarContextValue => {
  return useContext(SidebarContext);
};

type SidebarProps = {
  systemConfig: SystemConfig;
};

export const Sidebar: React.FC<SidebarProps> = ({ systemConfig }) => {
  const { editMode, setEditMode, sidebarEditable, portalRef } =
    useSidebarContext();

  function enterEditMode() {
    setEditMode(true);
  }

  const navStyles = {
    position: "sticky" as const,
    top: 0,
  };

  // Retornando às classes originais para preservar funcionalidade completa
  // Isso mantém o comportamento de expansão/contração da barra lateral
  const navWrapperClass = editMode
    ? "hidden"
    : "md:flex mx-auto h-screen hidden relative z-50";

  return (
    <>
      <div ref={portalRef} className={editMode ? "w-full" : ""}></div>
      <div className={navWrapperClass} style={navStyles}>
        <Navigation
          systemConfig={systemConfig}
          isEditable={sidebarEditable}
          enterEditMode={enterEditMode}
        />
      </div>
    </>
  );
};

export default Sidebar;