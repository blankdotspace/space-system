import React from "react";

import Wagmi from "./Wagmi";
import Query from "./Query";
import Theme from "./Theme";
import Privy from "./Privy";
import AuthenticatorProvider from "./AuthenticatorProvider";
import { AppStoreProvider } from "@/common/data/stores/app";
import UserThemeProvider from "@/common/lib/theme/UserThemeProvider";
import LoggedInStateProvider from "./LoggedInStateProvider";
import VersionCheckProivder from "./VersionCheckProvider";
import { SidebarContextProvider } from "@/common/components/organisms/Sidebar";
import AnalyticsProvider from "./AnalyticsProvider";
import { ToastProvider } from "../components/atoms/Toast";
import MiniAppSdkProvider from "./MiniAppSdkProvider";
import MobilePreviewProvider from "./MobilePreviewProvider";
import { SharedDataProvider } from "./SharedDataProvider";
import { MiniKitContextProvider } from "./MiniKitProvider";
import { GlobalErrorHandler } from "./GlobalErrorHandler";
import { TopLevelMiniAppContextProvider } from "./TopLevelMiniAppContextProvider";

const RarelyUpdatedProviders = React.memo(
  function RarelyUpdatedProviders({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <MobilePreviewProvider>
        <AnalyticsProvider>
          <MiniAppSdkProvider>
            <SharedDataProvider>
              <ToastProvider>{children}</ToastProvider>
            </SharedDataProvider>
          </MiniAppSdkProvider>
        </AnalyticsProvider>
      </MobilePreviewProvider>
    );
  },
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalErrorHandler />
      <VersionCheckProivder>
        <Privy>
          <Query>
            <Wagmi>
              <MiniKitContextProvider>
                <Theme>
                  <AppStoreProvider>
                    <UserThemeProvider>
                      <AuthenticatorProvider>
                        <LoggedInStateProvider>
                          <TopLevelMiniAppContextProvider>
                            <SidebarContextProvider>
                              <RarelyUpdatedProviders>{children}</RarelyUpdatedProviders>
                            </SidebarContextProvider>
                          </TopLevelMiniAppContextProvider>
                        </LoggedInStateProvider>
                      </AuthenticatorProvider>
                    </UserThemeProvider>
                  </AppStoreProvider>
                </Theme>
              </MiniKitContextProvider>
            </Wagmi>
          </Query>
        </Privy>
      </VersionCheckProivder>
    </>
  );
}
