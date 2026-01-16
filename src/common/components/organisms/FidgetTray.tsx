import React, { Dispatch, SetStateAction } from "react";
import { map } from "lodash";
import { FidgetBundle, FidgetInstanceData } from "@/common/fidgets";
import { CompleteFidgets } from "@/fidgets";
import { Button } from "@/common/components/atoms/button";
import AddFidgetIcon from "@/common/components/atoms/icons/AddFidget";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/common/components/atoms/tooltip";
import { FaInfoCircle } from "react-icons/fa";
import { useUIColors } from "@/common/lib/hooks/useUIColors";
export interface FidgetTrayProps {
  setExternalDraggedItem: Dispatch<
    SetStateAction<{ i: string; w: number; h: number } | undefined>
  >;
  contents: FidgetInstanceData[];
  openFidgetPicker: () => void;
  saveTrayContents: (fidgetTrayContents: FidgetInstanceData[]) => Promise<void>;
  removeFidget(fidgetId: string): void;
  setCurrentlyDragging: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFidgetID: string | null;
  selectFidget: (fidgetBundle: FidgetBundle) => void;
}

export const FidgetTray: React.FC<FidgetTrayProps> = ({
  setCurrentlyDragging,
  contents,
  setExternalDraggedItem,
  openFidgetPicker,
  saveTrayContents,
  removeFidget,
  selectedFidgetID,
  selectFidget,
}) => {
  const uiColors = useUIColors();
  const hasContents = contents.length > 0;
  
  return (
    <div className="w-full h-screen flex flex-col justify-start items-center gap-2 bg-sky-50 py-7 px-6 overflow-auto">
      <div 
        className={`
          transition-all duration-300 ease-in-out w-full flex flex-col justify-start items-center gap-2
          ${hasContents ? 'opacity-100 delay-150' : 'opacity-0 delay-0'}
        `}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <center>
                <FaInfoCircle color="#D1D5DB" />
              </center>
            </TooltipTrigger>
            <TooltipContent side="left">
              <div className="flex flex-col gap-1">
                <div>
                  Click the + to browse Fidgets.
                  <br />
                  Then, drag them to your Space
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <h5 className="text-xs font-medium text-center -mx-3 mb-3">
          Fidget Tray
        </h5>
        {map(contents, (fidgetData: FidgetInstanceData) => {
          const fidgetBundle = {
            ...fidgetData,
            properties: CompleteFidgets[fidgetData.fidgetType].properties,
            config: { ...fidgetData.config, editable: true },
          };

          const onClick = () => {
            // console.log("fidgetBundle", fidgetBundle);
            selectFidget(fidgetBundle);
          };

          return (
            <div key={fidgetData.id} className="w-full">
              <div
                className={`z-20 droppable-element px-2 py-2 flex justify-center items-center border rounded-md hover:bg-sky-100 group cursor-pointer ${
                  selectedFidgetID === fidgetData.id
                    ? "outline outline-4 outline-offset-1 outline-sky-600"
                    : ""
                }`}
                draggable={true}
                // unselectable helps with IE support
                // eslint-disable-next-line react/no-unknown-property
                unselectable="off"
                onClick={onClick}
                onDragStart={(e) => {
                  setCurrentlyDragging(true);
                  e.dataTransfer.setData(
                    "text/plain",
                    JSON.stringify(fidgetData),
                  );
                  setExternalDraggedItem({
                    i: fidgetData.id,
                    w: CompleteFidgets[fidgetData.fidgetType].properties.size
                      .minWidth,
                    h: CompleteFidgets[fidgetData.fidgetType].properties.size
                      .minHeight,
                  });
                }}
              >
                {String.fromCodePoint(
                  CompleteFidgets[fidgetData.fidgetType].properties.icon,
                )}
              </div>
            </div>
          );
        })}
        <div className="flex justify-center items-center w-full">
          <Button 
            onClick={openFidgetPicker} 
            withIcon
            className="text-white font-medium transition-colors"
            style={{ backgroundColor: uiColors.primaryColor }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = uiColors.primaryHoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = uiColors.primaryColor;
            }}
          >
            <div className="text-white [&_svg_path]:stroke-white">
              <AddFidgetIcon />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FidgetTray;
