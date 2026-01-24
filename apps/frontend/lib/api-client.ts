import { msalInstance, loginRequest } from "./azure-auth";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

/**
 * Computes the API base URL dynamically.
 * IMPORTANT: This must be called at REQUEST time, not module load time,
 * because during SSR/build, `window` is undefined.
 */
const getBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  console.log("[ApiClient:getBaseUrl] Starting URL resolution...");
  console.log("[ApiClient:getBaseUrl] NEXT_PUBLIC_API_URL =", envUrl);
  console.log("[ApiClient:getBaseUrl] typeof window =", typeof window);
  
  // If we are on the client side (browser)
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const fullUrl = window.location.href;
    
    console.log("[ApiClient:getBaseUrl] Running in BROWSER");
    console.log("[ApiClient:getBaseUrl] hostname =", hostname);
    console.log("[ApiClient:getBaseUrl] fullUrl =", fullUrl);
    
    // Check if we are running locally
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    console.log("[ApiClient:getBaseUrl] isLocal =", isLocal);
    
    // If not local (i.e. we are on a real domain like reflecto-ai.onreflections.com), 
    // ALWAYS use relative path to ensure we hit the nginx proxy correctly.
    if (!isLocal) {
      console.log("[ApiClient:getBaseUrl] ✅ Non-local environment detected. Returning '/api'");
      return "/api";
    }

    // If local, allow env var override or fallback to localhost:4000
    if (envUrl && envUrl !== "undefined") {
      console.log("[ApiClient:getBaseUrl] ✅ Local environment with env var. Returning:", envUrl);
      return envUrl;
    }
    console.log("[ApiClient:getBaseUrl] ✅ Local environment, no valid env var. Returning 'http://localhost:4000'");
    return "http://localhost:4000";
  }
  
  // Server-side fallback (used during SSR)
  console.log("[ApiClient:getBaseUrl] Running in SERVER (SSR)");
  
  // During SSR in Docker, we need to use the internal network URL
  if (envUrl && envUrl !== "undefined" && envUrl !== "/api") {
    // If we have a valid absolute URL, use it
    console.log("[ApiClient:getBaseUrl] ✅ SSR with valid absolute env var. Returning:", envUrl);
    return envUrl;
  }
  
  // Default SSR fallback - this should be the backend's internal Docker network URL
  // For production, backend is accessible at http://backend:4000 or http://localhost:4000
  console.log("[ApiClient:getBaseUrl] ✅ SSR fallback. Returning 'http://localhost:4000'");
  return "http://localhost:4000";
};

class ApiClient {
  // Note: baseURL is computed lazily in getEffectiveBaseUrl(), not stored
  
  /**
   * Gets the effective base URL at request time.
   * This ensures we always have the correct URL in browser context.
   */
  private getEffectiveBaseUrl(): string {
    return getBaseUrl();
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
    console.log("[ApiClient:request] ========== NEW REQUEST ==========");
    console.log("[ApiClient:request] endpoint =", endpoint);
    console.log("[ApiClient:request] method =", options.method || "GET");
    
    let baseUrl = this.getEffectiveBaseUrl();
    console.log("[ApiClient:request] baseUrl from getEffectiveBaseUrl() =", baseUrl);
    console.log("[ApiClient:request] typeof baseUrl =", typeof baseUrl);
    
    // Safety check: if baseUrl is undefined or contains "undefined", fix it
    if (!baseUrl || baseUrl === "undefined" || baseUrl.includes("undefined")) {
      console.warn(`[ApiClient:request] ⚠️ Invalid baseUrl detected: "${baseUrl}". Falling back to /api`);
      baseUrl = "/api";
    }
    
    let url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
    console.log("[ApiClient:request] Constructed URL =", url);
    
    // Additional validation: ensure URL doesn't contain "undefined"
    if (url.includes("undefined")) {
      console.error(`[ApiClient:request] ❌ Malformed URL detected: ${url}. Attempting to fix.`);
      url = `/api${endpoint}`;
      console.log("[ApiClient:request] Fixed URL =", url);
    }
    
    console.log("[ApiClient:request] ✅ Final URL =", url);
    
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

    console.log("[ApiClient:request] Making fetch call to:", url);

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

