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
      
      // Fetch user role from backend
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
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Fallback to basic user if API call fails
            setUser({
              id: account.localAccountId,
              name: account.name || "User",
              email: account.username,
              role: "user"
            });
          }
        } catch (err) {
          console.error("Failed to fetch user role", err);
          // Fallback to basic user
          setUser({
            id: account.localAccountId,
            name: account.name || "User",
            email: account.username,
            role: "user"
          });
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

