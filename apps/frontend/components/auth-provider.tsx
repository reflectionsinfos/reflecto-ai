"use client";

import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "@/lib/azure-auth";
import { ReactNode, useEffect, useState } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await msalInstance.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize MSAL:", error);
      }
    };
    initialize();
  }, []);

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}

