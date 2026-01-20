import { msalInstance, loginRequest } from "./azure-auth";

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

export async function getGraphAccessToken(): Promise<string | null> {
  const account = msalInstance?.getActiveAccount();
  if (!account) return null;

  try {
    const response = await msalInstance?.acquireTokenSilent({
      scopes: ["User.Read.All"], // Request token specifically for Graph API
      account: account,
    });
    return response?.accessToken || null;
  } catch (error) {
    if (error instanceof Error && error.toString().includes("interaction_required")) {
         // Silently failing here is better than redirecting unexpectedly.
         // The component using this should handle "no token" or prompt user.
         console.warn("Silent token acquisition failed, interaction required.");
         return null;
    }
    console.error("Error acquiring token:", error);
    return null;
  }
}

export async function searchUsers(query: string): Promise<GraphUser[]> {
  const token = await getGraphAccessToken();
  if (!token) return [];

  if (!query || query.length < 3) return [];

  try {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);
    headers.append("Content-Type", "application/json");
    // ConsistencyLevel: eventual is required for advanced queries like $search
    headers.append("ConsistencyLevel", "eventual"); 

    // Using $search for "starts with" logic on displayName or mail
    // Standard 'eq' or 'startswith' in $filter is also an option but $search is more powerful with ConsistencyLevel header
    const searchUrl = `https://graph.microsoft.com/v1.0/users?$search="displayName:${query}"&$select=id,displayName,mail,userPrincipalName&$top=10`;

    const response = await fetch(searchUrl, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      console.error("Graph API Error:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}
