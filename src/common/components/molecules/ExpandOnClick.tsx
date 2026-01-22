import React, { useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/common/components/atoms/dialog";

interface ExpandOnClickProps {
  children: React.ReactNode;
  expandedChildren?: React.ReactNode;
}

const ExpandOnClick: React.FC<ExpandOnClickProps> = ({ children, expandedChildren }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback((e: React.MouseEvent) => {
    setIsOpen(true);
  }, []);

  const onOpenAutoFocus = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  return (
    <>
      <div
        onClick={handleOpen}
        className="cursor-pointer size-full max-h-[inherit]"
      >
        {children}
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="p-0 bg-transparent border-none shadow-none max-w-fit max-h-fit"
          onOpenAutoFocus={onOpenAutoFocus}
          showCloseButton={false}
        >
          {expandedChildren || children}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpandOnClick;
