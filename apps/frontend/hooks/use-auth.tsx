import { useState, useEffect } from "react";
import { msalInstance, loginRequest } from "../lib/azure-auth";
import { useMsal } from "@azure/msal-react";
import { EventType, AuthenticationResult } from "@azure/msal-browser";
import { apiClient } from "../lib/api-client";

// Define User type based on backend/schema
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
  image?: string;
}

export function useAuth() {
  const { instance, accounts } = useMsal();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check if Azure Auth is enabled
  const azureAuthEnabled = process.env.NEXT_PUBLIC_AZURE_AUTH_ENABLED !== 'false';

  useEffect(() => {
    if (!azureAuthEnabled) {
      // Dev mock user
      setUser({
        id: "mock-user-1",
        name: "Demo User",
        email: "demo@example.com",
        role: "admin",
      });
      setIsLoading(false);
      return;
    }

    const account = accounts[0];
    if (account) {
        // User is signed in with MSAL
        // Create a basic user object from the token first
        // Then potentially fetch more details from backend
        // For now, we'll construct it from the ID token claims
        const u: User = {
            id: account.localAccountId,
            name: account.name || "User",
            email: account.username,
            role: "user", // Default, should fetch from backend
        };
        setUser(u);
        setIsLoading(false);
        
        // Ensure the active account is set
        if (!instance.getActiveAccount()) {
            instance.setActiveAccount(account);
        }
    } else {
      // Fallback: Check for Demo User in LocalStorage
      const isDemoAuth = typeof window !== "undefined" && localStorage.getItem("isAuthenticated") === "true";
      if (isDemoAuth) {
          const storedUser = localStorage.getItem("userInfo");
          const parsedUser = storedUser ? JSON.parse(storedUser) : {};
          setUser({
              id: "demo-user-id",
              name: parsedUser.name || "Demo User",
              email: parsedUser.email || "demo@example.com",
              role: parsedUser.role || "user",
          });
          setIsLoading(false);
      } else {
          setUser(null);
          setIsLoading(false);
      }
    }
  }, [accounts, azureAuthEnabled, instance]);

  const login = async () => {
    if (!azureAuthEnabled) return;
    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      setError(err as Error);
    }
  };

  const logout = () => {
    if (!azureAuthEnabled) {
        setUser(null);
        return;
    }
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    });
  };

  return {
    user,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
