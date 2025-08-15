"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

// Types
interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  token: string;
  wallet?: number;
  score?: number;
  createdAt?: string;
  games?: Record<string, any>;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
  }) => Promise<boolean>;
  signOut: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  refreshUserData: () => Promise<void>;
  error: string;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "faydaClubAuth";
const USER_API_BASE = "https://ai.rajatkhandelwal.com/arcade";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedAuth) {
          const parsedAuth = JSON.parse(savedAuth);
          if (parsedAuth.user && parsedAuth.user.token && parsedAuth.user.id) {
            setUser(parsedAuth.user);
            setIsAuthenticated(true);

            // Optionally refresh user data from server
            try {
              await refreshUserDataInternal(parsedAuth.user);
            } catch (error) {
              // If refresh fails, continue with cached data
              console.warn("Failed to refresh user data on mount:", error);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load auth state:", error);
        // Clear corrupted data
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    loadAuthState();
  }, []);

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    if (user && isAuthenticated) {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user, isAuthenticated })
      );
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user, isAuthenticated]);

  const refreshUserDataInternal = async (currentUser: User) => {
    if (!currentUser.id) {
      console.warn("Cannot refresh user data: no user ID");
      return;
    }

    try {
      const response = await fetch(`/api/users/${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // Update user with latest data from server
          const updatedUser = {
            ...currentUser,
            ...data.user,
            token: currentUser.token, // Keep the original token
          };
          setUser(updatedUser);
        }
      } else {
        console.warn(
          "Failed to refresh user data:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);

        // Refresh user data to get wallet and score if user has ID
        if (data.user.id) {
          try {
            await refreshUserDataInternal(data.user);
          } catch (error) {
            // If refresh fails, continue with login data
            console.warn("Failed to refresh user data after signin:", error);
          }
        }

        return true;
      } else {
        setError(data.message || "Sign in failed");
        return false;
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
  }): Promise<boolean> => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success && responseData.user) {
        setUser(responseData.user);
        setIsAuthenticated(true);

        // Refresh user data to get wallet and score if user has ID
        if (responseData.user.id) {
          try {
            await refreshUserDataInternal(responseData.user);
          } catch (error) {
            // If refresh fails, continue with signup data
            console.warn("Failed to refresh user data after signup:", error);
          }
        }

        return true;
      } else {
        setError(responseData.message || "Sign up failed");
        return false;
      }
    } catch (err) {
      console.error("Sign up error:", err);
      setError("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setUser(null);
    setError("");
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Also remove the old authToken if it exists
    localStorage.removeItem("authToken");
  };

  const updateProfile = async (updateData: Partial<User>): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          ...updateData,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update user with new data
        const updatedUser = { ...user, ...updateData };
        setUser(updatedUser);
        return true;
      } else {
        setError(data.message || "Update failed");
        return false;
      }
    } catch (err) {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async (): Promise<void> => {
    if (!user) return;

    try {
      await refreshUserDataInternal(user);
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  const clearError = () => {
    setError("");
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUserData,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
