"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!supabaseClient) {
      setReady(true);
      return () => undefined;
    }

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setReady(true);
    });

    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    ready,
    signIn: async (email, password) => {
      if (!supabaseClient) return "Supabase env vars are missing.";
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      return error?.message ?? null;
    },
    signUp: async (email, password, fullName) => {
      if (!supabaseClient) return "Supabase env vars are missing.";
      const { error, data } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) return error.message;
      if (data.user) {
        await supabaseClient.from("profiles").insert({
          user_id: data.user.id,
          full_name: fullName,
          type: "Private"
        });
      }
      return null;
    },
    signOut: async () => {
      if (!supabaseClient) return;
      await supabaseClient.auth.signOut();
    }
  }), [user, session, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
