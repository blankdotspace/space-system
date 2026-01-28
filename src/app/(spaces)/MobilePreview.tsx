"use client";
import CustomHTMLBackground from "@/common/components/molecules/CustomHTMLBackground";
import { ThemeSettings } from "@/common/lib/theme";
import { getMobileFidgetOrder } from "@/common/utils/layoutFormatUtils";
import { isNil, isUndefined } from "lodash";
import PhoneFrame from "@/common/components/atoms/PhoneFrame";
import { usePathname } from "next/navigation";
import React, { ReactNode, Suspense, useMemo } from "react";
import MobileViewSimplified from "./MobileViewSimplified";
import SpaceLoading from "./SpaceLoading";

import { SpaceConfig } from "./Space";

interface MobilePreviewProps {
  config: SpaceConfig;
  editMode: boolean;
  portalRef: React.RefObject<HTMLDivElement | null>;
  profile?: ReactNode;
  tabBar: ReactNode;
  feed?: ReactNode;
  saveTheme: (newTheme: ThemeSettings) => void;
  saveExitEditMode: () => void;
  cancelExitEditMode: () => void;
  saveConfig: (config: any) => Promise<void>;
  tabNames?: string[];
  fid?: number;
}

const MobilePreview: React.FC<MobilePreviewProps> = ({
  config,
  editMode,
  portalRef,
  profile,
  tabBar,
  feed,
  saveTheme,
  saveExitEditMode,
  cancelExitEditMode,
  saveConfig,
  tabNames,
  fid,
}) => {
  const pathname = usePathname();
  const isHomebasePath = pathname?.startsWith('/homebase');

  const layoutFidgetIds = useMemo(() => {
   // Use the utility function to get the correct order
    return getMobileFidgetOrder(config.layoutDetails, config.fidgetInstanceDatums);
  }, [config.layoutDetails, config.fidgetInstanceDatums]);

  return (
    <>
      <div 
        className="w-full h-full min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{ backgroundImage: "url('/ui/space-background.png')" }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="relative w-[344px] h-[744px]">
            <div className="absolute top-[32px] left-[12px] z-0">
              <div
                className="w-[320px] h-[680px] relative overflow-hidden rounded-[28px] shadow-lg"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: config.theme?.properties.background || 'white',
                  transform: 'scale(1.0)',
                  transformOrigin: 'top left'
                }}
              >
                <CustomHTMLBackground
                  html={config.theme?.properties.backgroundHTML}
                  className="absolute inset-0 pointer-events-none w-full h-full"
                />
                <div className="flex-1 w-full overflow-auto">
                  <div className="relative w-full h-full flex flex-col">
                    <div className="w-full bg-white">
                      {!isUndefined(profile) ? (
                        <div className="w-full max-h-fit">
                          <div className="rounded-md shadow-sm overflow-hidden">
                            {profile}
                          </div>
                        </div>
                      ) : null}

                      <div className="border-b relative">
                        <div className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide">
                          {tabBar}
                        </div>
                      </div>
                    </div>

                    <Suspense fallback={
                      <SpaceLoading
                        hasProfile={!isNil(profile)}
                        hasFeed={!isNil(feed)}
                      />
                    }>
                      <MobileViewSimplified
                        theme={config.theme}
                        fidgetInstanceDatums={config.fidgetInstanceDatums}
                        fidgetTrayContents={config.fidgetTrayContents}
                        saveConfig={saveConfig}
                        inEditMode={false}
                        saveExitEditMode={saveExitEditMode}
                        cancelExitEditMode={cancelExitEditMode}
                        portalRef={portalRef}
                        hasProfile={!isNil(profile)}
                        hasFeed={!isNil(feed)}
                        feed={feed}
                        tabNames={tabNames}
                        fid={fid}
                        layoutFidgetIds={layoutFidgetIds}
                        isHomebasePath={isHomebasePath}
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>
            <PhoneFrame className="pointer-events-none select-none absolute z-10"/>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobilePreview; 