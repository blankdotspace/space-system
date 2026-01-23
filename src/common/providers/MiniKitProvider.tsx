'use client';


import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import React, { ReactNode } from 'react';
import { base } from 'wagmi/chains';

export function MiniKitContextProvider({ children }: { children: ReactNode }) {
  // If API key is not configured, still render children to prevent breaking the app
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY;
  
  if (!apiKey) {
    console.warn("[MiniKitContextProvider] OnchainKit API key not configured. MiniKit features may be limited.");
    return <>{children}</>;
  }
  
  return (
    <MiniKitProvider apiKey={apiKey} chain={base}>
      {children}
    </MiniKitProvider>
  );
}