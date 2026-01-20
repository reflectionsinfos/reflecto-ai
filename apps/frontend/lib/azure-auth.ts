import { Configuration, PublicClientApplication } from "@azure/msal-browser";

// Environment variables should be defined in your .env.local file
const azureAuthEnabled = process.env.NEXT_PUBLIC_AZURE_AUTH_ENABLED !== 'false';

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : "",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
};

// Create the MSAL instance
export const msalInstance = typeof window !== "undefined" && azureAuthEnabled 
  ? new PublicClientApplication(msalConfig) 
  : null;

// Helper to ensure MSAL is initialized (required for v3)
let msalInitialized = false;
export async function initializeMsal(): Promise<PublicClientApplication | null> {
    if (!msalInstance) return null;
    if (msalInitialized) return msalInstance;
    
    try {
        await msalInstance.initialize();
        msalInitialized = true;
        return msalInstance;
    } catch (error) {
        console.error("MSAL Initialization failed:", error);
        return null;
    }
}

// Login request scope
export const loginRequest = {
  scopes: [
    process.env.NEXT_PUBLIC_AZURE_SCOPE || "",
    "openid",
    "profile",
    "offline_access"
  ].filter(Boolean) as string[],
};
