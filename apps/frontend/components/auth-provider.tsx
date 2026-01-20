"use client";

import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "@/lib/azure-auth";
import { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // If MSAL failed to initialize (e.g. env vars missing), strictly render children without provider
  // effectively disabling auth but keeping the app running (graceful degradation)
  if (!msalInstance) {
    console.warn("MSAL Instance not finalized. Auth disabled.");
    return <>{children}</>;
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
