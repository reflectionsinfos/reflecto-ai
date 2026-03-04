import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../lib/azure-auth";

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
  const { instance, accounts, inProgress } = useMsal();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (inProgress === "none" && accounts.length > 0) {
      const account = accounts[0];
      
      // Ensure active account is set
      if (!instance.getActiveAccount()) {
          instance.setActiveAccount(account);
      }
      
      const fetchUserRole = async () => {
        try {
          const tokenResponse = await instance.acquireTokenSilent({
            ...loginRequest,
            account: account
          });

          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
            headers: {
              'Authorization': `Bearer ${tokenResponse.accessToken}`
            }
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to fetch user: ${response.status} ${text}`);
          }

          const userData = await response.json();
          setUser(userData);
        } catch (err) {
          console.error("Auth error:", err);
          setError(err as Error);
        } finally {
          setIsLoading(false);
        }
      };

      
      fetchUserRole();
    } else if (inProgress === "none" && accounts.length === 0) {
        setUser(null);
        setIsLoading(false);
    }
  }, [accounts, inProgress, instance]);

  const login = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      console.error("Login failed", err);
      setError(err as Error);
    }
  };

  const logout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    });
  };

  return {
    user,
    isLoading: isLoading || inProgress !== "none",
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
}

