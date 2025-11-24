"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useUserStore, User } from "@/store/userStore";
import { getOrCreateUser } from "@/utils/user";

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refetch: () => Promise<void>;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const { user: storeUser, isAuthenticated, setUser: setStoreUser, clearUser: clearStoreUser } = useUserStore();
  const [user, setUser] = useState<User | null>(storeUser);
  const [loading, setLoading] = useState<boolean>(!storeUser);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef<boolean>(false);

  
  useEffect(() => {
    setUser(storeUser);
    if (storeUser) {
      setLoading(false);
    }
  }, [storeUser]);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/check", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to check authentication status");
      }

      const authData = await res.json();

      if (authData.authenticated && authData.user) {
        const userData = await getOrCreateUser({
          username: authData.user.username,
          email: authData.user.email,
          name: authData.user.name,
        });
        setStoreUser(userData);
        setUser(userData);
      } else {
        clearStoreUser();
        setUser(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch user";
      setError(errorMessage);
      console.error("Error fetching user:", err);
      clearStoreUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [clearStoreUser, setStoreUser]);

  const refetch = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const clearUser = useCallback(() => {
    setUser(null);
    setError(null);
    clearStoreUser();
  }, [clearStoreUser]);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (storeUser) {
        setLoading(false);
        return;
      }
      fetchUser();
    }
  }, [storeUser, fetchUser]);

  const value: UserContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    refetch,
    clearUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

