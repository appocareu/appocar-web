"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type BackendUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
};

type AuthContextValue = {
  user: BackendUser | null;
  session: null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; verificationRequired?: boolean; message?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ ok: boolean; verificationRequired?: boolean; message?: string }>;
  signInWithProvider: (provider: "google" | "facebook") => Promise<string | null>;
  requestVerification: (email?: string) => Promise<{ ok: boolean; message?: string }>;
  refreshUser: () => Promise<BackendUser | null>;
  justVerified: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [session, setSession] = useState<null>(null);
  const [ready, setReady] = useState(false);
  const [justVerified, setJustVerified] = useState(false);

  useEffect(() => {
    let mounted = true;
    api<{ user: BackendUser | null }>("/api/auth/me")
      .then((res) => {
        if (!mounted) return;
        setUser(res.user);
        setReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    ready,
    justVerified,
    signIn: async (email, password) => {
      try {
        const res = await api<{ user: BackendUser }>("/api/auth/login", {
          method: "POST",
          json: { email, password }
        });
        setUser(res.user);
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        const verificationRequired = message.includes("email_not_verified");
        return { ok: false, verificationRequired, message };
      }
    },
    signUp: async (email, password, fullName) => {
      try {
        const res = await api<{ user?: BackendUser; verificationRequired?: boolean }>(
          "/api/auth/register",
          {
            method: "POST",
            json: { email, password, name: fullName }
          }
        );
        const needsVerification = Boolean(res.verificationRequired || res.user?.emailVerified === false);
        if (needsVerification) {
          if (res.user) setUser(res.user);
          return { ok: false, verificationRequired: true };
        }
        if (res.user) {
          setUser(res.user);
          return { ok: true };
        }
        return { ok: false, message: "Signup failed" };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Signup failed";
        return { ok: false, message };
      }
    },
    signInWithProvider: async (provider) => {
      if (typeof window === "undefined") return "Not available";
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const redirect = encodeURIComponent(window.location.origin);
      window.location.href = `${base}/auth/${provider}?redirect=${redirect}`;
      return null;
    },
    requestVerification: async (email) => {
      try {
        await api("/api/auth/verify/request", {
          method: "POST",
          json: email ? { email } : undefined
        });
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Verification failed";
        return { ok: false, message };
      }
    },
    refreshUser: async () => {
      try {
        const res = await api<{ user: BackendUser | null }>("/api/auth/me");
        if (user?.emailVerified === false && res.user?.emailVerified === true) {
          setJustVerified(true);
          setTimeout(() => setJustVerified(false), 3500);
        }
        setUser(res.user);
        return res.user;
      } catch {
        setUser(null);
        return null;
      }
    },
    signOut: async () => {
      await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      setUser(null);
    }
  }), [user, session, ready, justVerified]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
