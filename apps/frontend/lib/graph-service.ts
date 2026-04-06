import { graphTokenRequest, msalInstance } from "./azure-auth";

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
      ...graphTokenRequest,
      account: account,
    });
    return response?.accessToken || null;
  } catch (error) {
    if (error instanceof Error && error.toString().includes("interaction_required")) {
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

  const q = query.trim();
  if (!q || q.length < 2) return [];

  try {
    const headers = new Headers({
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "ConsistencyLevel": "eventual",
    });

    const isEmail = q.includes("@");

    // Build $search value: email queries search mail+UPN, name queries search displayName+mail
    const searchValue = isEmail
      ? `"mail:${q}" OR "userPrincipalName:${q}"`
      : `"displayName:${q}" OR "mail:${q}"`;

    const params = new URLSearchParams({
      "$search": searchValue,
      "$select": "id,displayName,mail,userPrincipalName",
      "$top": "10",
      "$count": "true",
    });

    const searchUrl = `https://graph.microsoft.com/v1.0/users?${params.toString()}`;

    const response = await fetch(searchUrl, { method: "GET", headers });

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
