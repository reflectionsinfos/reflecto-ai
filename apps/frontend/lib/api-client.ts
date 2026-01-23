import { msalInstance, loginRequest } from "./azure-auth";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        console.warn("No MSAL accounts found.");
        return null;
      }

      const activeAccount = msalInstance.getActiveAccount() || accounts[0];
      // Ensure active account is set if we found one
      if (!msalInstance.getActiveAccount()) {
         msalInstance.setActiveAccount(activeAccount);
      }

      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: activeAccount,
      });

      return response.accessToken;
    } catch (error) {
      console.error("Silent token acquisition failed", error);
      if (error instanceof InteractionRequiredAuthError) {
        // In a real app, you might trigger a redirect here or throw to let the UI handle it
        throw error;
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseURL}${endpoint}`;
    const headers = await this.getHeaders(
        options.headers && (options.headers as any)["Content-Type"] === null ? null : "application/json"
    );

    // Merge headers
    const finalOptions: RequestInit = {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        }
    };
    
    // If Content-Type was set to null (for formData), remove it from the merged headers 
    // to let the browser set it with boundary
    const mergedHeaders = finalOptions.headers as Record<string, string>;
    if(mergedHeaders["Content-Type"] === undefined && (options.headers as any)?.["Content-Type"] === undefined) {
         delete mergedHeaders["Content-Type"];
    }




    const response = await fetch(url, finalOptions);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error ${response.status}`;
      try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch (e) {
          errorMessage = `${errorMessage}: ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": null as any // Hack to signal getHeaders to omit content-type
      }
    });
  }
  
  async delete<T>(endpoint: string, data?: any): Promise<T> {
      return this.request<T>(endpoint, {
        method: "DELETE",
        body: data ? JSON.stringify(data) : undefined,
      });
  }
}

export const apiClient = new ApiClient();

