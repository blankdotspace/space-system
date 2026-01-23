import React, { useMemo } from "react";
import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FaTimes } from "react-icons/fa";
import * as Toast from "@radix-ui/react-toast";
import { useAppStore } from "@/common/data/stores/app";
import { useFarcasterSigner } from "@/fidgets/farcaster";
import { useLoadFarcasterUser } from "@/common/data/queries/farcaster";
import { first } from "lodash";
import { Suspense } from "react";

export default function InfoToast() {
  return null;
  // return (
  //   <Suspense fallback={<div>Loading...</div>}>
  //     <InfoToastContent />
  //   </Suspense>
  // );
}

function InfoToastContent() {
  const [isDisplayed, setIsDisplayed] = useState(false);
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState(10000);
  const pathname = usePathname();
  const queryParams = useSearchParams();
  const spaceFarcasterName = queryParams?.get("handle");
  const { fid } = useFarcasterSigner("navigation");
  const { data } = useLoadFarcasterUser(fid);
  const user = useMemo(() => first(data?.users), [data]);
  const username = useMemo(() => user?.username, [user]);
  const { getIsLoggedIn } = useAppStore((state) => ({
    getIsLoggedIn: state.getIsAccountReady,
  }));
  const isLoggedIn = getIsLoggedIn();

  const checkPageType = (pathname, spaceFarcasterName, username) => {
    if (pathname === "/homebase") {
      return {
        type: "homebase",
        storedStateKey: "homebaseToastDisplayed",
        message:
          "Your homebase is a space that only you can see. Click the paintbrush to customize it 🚀",
      };
    } else if (pathname.startsWith("/s/") && spaceFarcasterName === username) {
      return {
        type: "profile",
        storedStateKey: "profileToastDisplayed",
        message:
          "This is your profile. Click the paintbrush to customize your space.",
      };
    }
    return null;
  };

  useEffect(() => {
    const pageType = checkPageType(pathname, spaceFarcasterName, username);
    if (pageType) {
      const storedState = localStorage.getItem(pageType.storedStateKey);
      if (!storedState && isLoggedIn) {
        setIsDisplayed(true);
        setMessage(pageType.message);
        setDuration(10000);
      } else {
        setIsDisplayed(false);
      }
    } else {
      setIsDisplayed(false);
    }
  }, [pathname, spaceFarcasterName, username]);

  const closeToast = () => {
    setIsDisplayed(false);
    const pageType = checkPageType(pathname, spaceFarcasterName, username);
    if (pageType) {
      localStorage.setItem(pageType.storedStateKey, "true");
    }
  };

  return (
    <Toast.Provider>
      <Toast.Root
        open={isDisplayed}
        onOpenChange={setIsDisplayed}
        duration={duration}
        className="fixed bottom-4 right-4 p-4 bg-blue-100 border border-blue-300 rounded-md shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/images/tom_alerts.png"
              alt="rocket"
              className="w-8 h-8 object-contain"
            />
            <p className="text-blue-600 ml-2">{message}</p>
          </div>
          <Toast.Action altText="Close" asChild>
            <button onClick={closeToast} className="bg-transparent">
              <FaTimes className="text-blue-600" />
            </button>
          </Toast.Action>
        </div>
      </Toast.Root>
      <Toast.Viewport />
    </Toast.Provider>
  );
}
