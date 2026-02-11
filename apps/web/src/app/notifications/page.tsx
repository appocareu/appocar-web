"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/components/I18nProvider";
import { useAuth } from "@/components/AuthProvider";
import { AuthPanel } from "@/components/AuthPanel";
import { api } from "@/lib/api";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body?: string;
  read_at?: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api<{ items: NotificationItem[] }>("/api/notifications")
      .then((res) => setItems(Array.isArray(res.items) ? res.items : []))
      .finally(() => setLoading(false));
  }, [user]);

  const markRead = async (id: string) => {
    await api(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => undefined);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item)));
  };

  return (
    <AppShell active="/notifications">
      <div className="page-header">
        <div>
          <h2 className="section-title">{t("header.notifications")}</h2>
          <p className="muted">{t("notifications.subtitle")}</p>
        </div>
      </div>
      {!ready ? (
        <div className="glass" style={{ padding: "1.5rem" }}>{t("auth.loading")}</div>
      ) : !user ? (
        <AuthPanel />
      ) : (
        <div className="surface" style={{ padding: "1.5rem", display: "grid", gap: "0.8rem" }}>
          {loading && <div className="muted">{t("auth.loading")}</div>}
          {!loading && items.length === 0 && <div className="muted">{t("notifications.empty")}</div>}
          {items.map((item) => (
            <button
              key={item.id}
              className="message-card"
              style={{ textAlign: "left" }}
              onClick={() => markRead(item.id)}
            >
              <strong>{item.title}</strong>
              {item.body && <div className="muted" style={{ marginTop: "0.2rem" }}>{item.body}</div>}
              <div className="muted" style={{ fontSize: "0.75rem", marginTop: "0.4rem" }}>
                {new Date(item.created_at).toLocaleString()} {item.read_at ? `· ${t("notifications.read")}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
