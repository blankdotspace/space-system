"use client";

import React from "react";
import * as Toast from "@radix-ui/react-toast";
import { FaTimes } from "react-icons/fa";
import { useToastStore } from "@/common/data/stores/toastStore";

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isDisplayed, message, duration, hideToast } = useToastStore();

  return (
    <Toast.Provider>
      {children}
      <Toast.Root
        open={isDisplayed}
        onOpenChange={() => hideToast()}
        duration={duration}
        className="fixed bottom-4 right-4 p-4 bg-blue-100 border border-blue-300 rounded-md shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/ui/tom_alerts.png"
              alt="rocket"
              className="w-8 h-8 object-contain"
            />
            <p className="text-blue-600 ml-2">{message}</p>
          </div>
          <Toast.Action altText="Close" asChild>
            <button onClick={() => hideToast()} className="bg-transparent ml-2">
              <FaTimes className="text-blue-600" />
            </button>
          </Toast.Action>
        </div>
      </Toast.Root>
      <Toast.Viewport />
    </Toast.Provider>
  );
};
