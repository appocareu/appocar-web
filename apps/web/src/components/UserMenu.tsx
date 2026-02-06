"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";
import { backendLogout, getBackendMe, isAdminUser, type BackendUser } from "@/lib/backend";

export function UserMenu() {
  const { user, signOut, ready } = useAuth();
  const { t } = useI18n();
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);

  useEffect(() => {
    let mounted = true;
    getBackendMe()
      .then((res) => {
        if (!mounted) return;
        setBackendUser(res.user);
      })
      .catch(() => {
        if (!mounted) return;
        setBackendUser(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return <div className="badge">{t("auth.loading")}</div>;
  }

  if (backendUser) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span className="badge">{isAdminUser(backendUser) ? "Host" : backendUser.email}</span>
        <button
          className="secondary"
          onClick={async () => {
            await backendLogout().catch(() => undefined);
            window.location.reload();
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  if (!user) {
    return <div className="badge">{t("auth.guest")}</div>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <span className="badge">{user.email}</span>
      <button className="secondary" onClick={signOut}>Sign out</button>
    </div>
  );
}
