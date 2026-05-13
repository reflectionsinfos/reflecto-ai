import { Configuration, PublicClientApplication } from "@azure/msal-browser";

const apiScope =
  process.env.NEXT_PUBLIC_AZURE_SCOPE ||
  `api://${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID}/access_as_user`;

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : "",
  },
  cache: {
    cacheLocation: "localStorage",
  },
  system: {
    iframeHashTimeout: 10000,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

// Used for acquiring API tokens silently — only the API scope so MSAL can
// find the cached access token without a scope-mismatch cache miss.
export const apiTokenRequest = {
  scopes: [apiScope],
};

// Used for the initial interactive login — includes OIDC scopes to obtain
// the ID token and a refresh token alongside the API access token.
export const loginRequest = {
  scopes: [apiScope, "openid", "profile", "offline_access"],
};

export const graphTokenRequest = {
  scopes: ["User.Read.All"],
};


