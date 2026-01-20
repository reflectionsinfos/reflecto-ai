import { msalInstance, loginRequest, initializeMsal } from "./azure-auth";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async getAuthToken(): Promise<string | null> {
    if (!msalInstance) return null;

    try {
      // Ensure MSAL is initialized (required for v3)
      await initializeMsal();
      
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        console.warn("No MSAL accounts found. User might not be signed in.");
        return null;
      }

      // If active account isn't set, try to set the first one
      if (!msalInstance.getActiveAccount() && accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
      }

      const activeAccount = msalInstance.getActiveAccount();
      if (!activeAccount) return null;

      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: activeAccount,
      });

      return response.accessToken;
      return null;
    } catch (error) {
      console.error("Silent token acquisition failed", error);
      if (error instanceof InteractionRequiredAuthError) {
        console.warn("User needs to sign in again (interaction required)");
      }
      
      // Fallback for Demo User
      if (typeof window !== "undefined" && localStorage.getItem("isAuthenticated") === "true") {
          return "demo-token";
      }

      return null;
    }
  }

  private async getHeaders(contentType: string | null = "application/json"): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  async get<T>(endpoint: string): Promise<T> {
    // Determine if endpoint is absolute or relative
    // If relative, prepend base URL. If it starts with /api, remove it if base url includes it or adjust logic.
    // Here we assume base URL is http://localhost:4000 and endpoint is /api/foo
    
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseURL}${endpoint}`;
    console.log(`ApiClient.get calling: ${url}`);
    const headers = await this.getHeaders();

    const response = await fetch(url, { method: "GET", headers });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseURL}${endpoint}`;
    const headers = await this.getHeaders();

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }
  
  // Basic file upload support (multipart/form-data)
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseURL}${endpoint}`;
    // Content-Type must be undefined for FormData to let browser set boundary
    const headers = await this.getHeaders(null);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
       const error = await response.text();
       throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }
  
  async delete<T>(endpoint: string, data?: any): Promise<T> {
      const url = endpoint.startsWith("http") ? endpoint : `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders();
  
      const response = await fetch(url, {
        method: "DELETE",
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
  
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error ${response.status}: ${error}`);
      }
  
      return response.json();
    }
}

export const apiClient = new ApiClient();
