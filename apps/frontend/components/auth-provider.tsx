"use client";

import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "@/lib/azure-auth";
import { ReactNode, useEffect, useState } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

// Detect if we're inside MSAL's silent-auth hidden iframe.
// Must be evaluated before initialize() clears the URL hash.
function isInMsalSilentIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.parent === window) return false;
    const params = new URLSearchParams(window.location.hash.substring(1));
    const state = params.get("state");
    if (!state) return false;
    const decoded = JSON.parse(atob(state));
    return decoded?.meta?.interactionType === "silent";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  // Computed once at mount — before initialize() wipes the hash.
  const [inSilentIframe] = useState(isInMsalSilentIframe);

  useEffect(() => {
    msalInstance.initialize()
      .then(() => { if (!inSilentIframe) setIsInitialized(true); })
      .catch((error) => {
        console.error("Failed to initialize MSAL:", error);
        if (!inSilentIframe) setIsInitialized(true);
      });
  }, [inSilentIframe]);

  // Inside the silent iframe: just let MSAL process the response.
  // Rendering the full app here causes the block_iframe_reload loop.
  if (inSilentIframe) return null;
  if (!isInitialized) return null;

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}

