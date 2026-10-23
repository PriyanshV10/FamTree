"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { syncLocalAndSupabase } from "@/lib/sync/sync-service";

export interface UserProfile {
  id: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (!configured) {
      return {
        id: "local-curator",
        fullName: "Local Curator",
        email: "curator@famtree.local",
      };
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => configured);

  const fetchProfile = useCallback(async (userId: string, email?: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (data) {
        setProfile({
          id: data.id,
          fullName: data.full_name || email?.split("@")[0] || "Curator",
          email,
          avatarUrl: data.avatar_url ?? undefined,
        });
      } else {
        setProfile({
          id: userId,
          fullName: email?.split("@")[0] || "Curator",
          email,
        });
      }
    } catch {
      setProfile({
        id: userId,
        fullName: email?.split("@")[0] || "Curator",
        email,
      });
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    // Load initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("famtree_auth_user_id", currentSession.user.id);
        }
        fetchProfile(currentSession.user.id, currentSession.user.email);
        syncLocalAndSupabase(currentSession.user.id, supabase).catch(() => {});
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem("famtree_auth_user_id");
        }
      }
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("famtree_auth_user_id", newSession.user.id);
        }
        await fetchProfile(newSession.user.id, newSession.user.email);
        syncLocalAndSupabase(newSession.user.id, supabase).catch(() => {});
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem("famtree_auth_user_id");
        }
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured, fetchProfile]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return {
        error: "Supabase connection is not configured in .env.local. You are currently in local demo mode.",
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    router.push("/dashboard");
    router.refresh();
    return {};
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error?: string; needsConfirmation?: boolean }> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return {
        error: "Supabase connection is not configured in .env.local. You are currently in local demo mode.",
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user && data.session) {
      // Auto logged-in
      router.push("/dashboard");
      router.refresh();
      return {};
    }

    // Email confirmation required
    return { needsConfirmation: true };
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("famtree_auth_user_id");
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    router.push("/");
    router.refresh();
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return {
        error: "Supabase is not configured. Password reset is only available when connected to Supabase.",
      };
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/settings`,
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const updateProfile = async (fullName: string) => {
    setProfile((prev) => (prev ? { ...prev, fullName } : { id: "local-curator", fullName }));
    if (typeof window !== "undefined") {
      localStorage.setItem("famtree_curator_name", fullName);
    }
    if (configured && user) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        });
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isConfigured: configured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
