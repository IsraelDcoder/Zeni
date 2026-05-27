import React, { createContext, useContext, useEffect, useState } from "react";
import { zeniApi } from "@/lib/api-client";
import { isSupabaseConfigured } from "@/lib/supabase";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  monthlyIncome: number;
  monthlyExpenseTarget: number;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      await zeniApi.initialize();
      // Try to get user profile if token exists
      const profile = await zeniApi.getUserProfile();
      if (profile) {
        setUser(profile);
      }
    } catch (error) {
      console.log("No active session");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ error: string | null }> => {
    try {
      const response = await zeniApi.signup(email, password, firstName, lastName);
      if (response?.user) {
        setUser(response.user);
      }
      return { error: null };
    } catch (error: any) {
      return { error: zeniApi.getErrorMessage(error) };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const response = await zeniApi.signin(email, password);
      if (response?.user) {
        setUser(response.user);
      }
      return { error: null };
    } catch (error: any) {
      return { error: zeniApi.getErrorMessage(error) };
    }
  };

  const signOut = async () => {
    try {
      await zeniApi.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    try {
      await zeniApi.resetPassword(email);
      return { error: null };
    } catch (error: any) {
      return { error: zeniApi.getErrorMessage(error) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
