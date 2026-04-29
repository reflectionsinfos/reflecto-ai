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
    // storeAuthStateInCookie is not a valid property in standard MSAL browser configuration or defaults to false/auto. 
    // If needed for IE11, it is storeAuthStateInCookie: true, but better to omit if type error.
  },

};

export const msalInstance = new PublicClientApplication(msalConfig);

export const apiTokenRequest = {
  scopes: [
    apiScope,
    "openid",
    "profile",
    "offline_access"
  ]
};

export const loginRequest = apiTokenRequest;

export const graphTokenRequest = {
  scopes: ["User.Read.All"],
};


