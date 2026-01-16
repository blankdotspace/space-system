import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";

export type ModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  showClose?: boolean;

  // The modality of the dialog. When set to true, interaction with outside elements
  // will be disabled and only dialog content will be visible to screen readers.
  focusMode?: boolean;
  onInteractOutside?: Dialog.DialogContentProps["onInteractOutside"];
  onPointerDownOutside?: Dialog.DialogContentProps["onPointerDownOutside"];
};

const ModalContentContext = React.createContext<HTMLElement | null>(null);

export const useModalContentContainer = () =>
  React.useContext(ModalContentContext);

const Modal = ({
  open,
  setOpen,
  title,
  description,
  children,
  focusMode = true,
  showClose = true,
  overlay = true,
  onInteractOutside,
  onPointerDownOutside,
}: ModalProps) => {
  const [contentNode, setContentNode] = React.useState<HTMLDivElement | null>(null);
  const dialogFontStyles: React.CSSProperties = {
    fontFamily:
      "var(--ns-nav-font, var(--font-sans, Inter, system-ui, -apple-system, sans-serif))",
    color: "var(--ns-nav-font-color, #0f172a)",
    backgroundColor: "var(--ns-background-color, #ffffff)",
  };

  const handleContentRef = React.useCallback((node: HTMLDivElement | null) => {
    setContentNode(node);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen} modal={focusMode}>
      <Dialog.Portal>
        {overlay && open && (
          <Dialog.Overlay className="bg-muted/95 data-[state=open]:animate-overlayShow fixed inset-0 z-40" />
        )}
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <Dialog.Content
            ref={handleContentRef}
            className={mergeClasses(
              "pointer-events-auto data-[state=open]:animate-contentShow bg-background",
              "w-[100vw] max-w-[600px] rounded-[10px] p-[25px]",
              "shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none",
              "relative overflow-visible",
            )}
            style={dialogFontStyles}
            // Fixes issue causing grid items to remain draggable behind open modal
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onInteractOutside={(event) => {
              onInteractOutside?.(event);
            }}
            onPointerDownOutside={(event) => {
              onPointerDownOutside?.(event);
            }}
          >
            <ModalContentContext.Provider value={contentNode}>
              {
                <Dialog.Title
                  className={
                    title
                      ? "text-card-foreground m-0 text-[17px] font-medium"
                      : "invisible"
                  }
                >
                  {title}
                </Dialog.Title>
              }
              {
                <Dialog.Description
                  className={
                    description
                      ? "text-card-foreground/80 mt-[10px] mb-5 text-[15px] leading-normal"
                      : "invisible"
                  }
                >
                  {description}
                </Dialog.Description>
              }
              {children}
              {showClose ? (
                <Dialog.Close asChild>
                  <button
                    className={mergeClasses(
                      "absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] items-center justify-center",
                      "z-50 appearance-none rounded-full bg-background/90 text-gray-400 text-card-foreground/80",
                      "focus:shadow-background/90 focus:shadow-[0_0_0_2px] focus:outline-none",
                    )}
                    aria-label="Close"
                  >
                    <Cross2Icon />
                  </button>
                </Dialog.Close>
              ) : null}
            </ModalContentContext.Provider>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Modal;
