"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  getAdminOverview,
  getBackendHealth,
  getBackendMe,
  isAdminUser,
  triggerAdminWebhook,
  type AdminOverview,
  type BackendUser
} from "@/lib/backend";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<BackendUser | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [health, setHealth] = useState<"ok" | "down" | "loading">("loading");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setError(null);
      try {
        const [meRes, healthRes, adminRes] = await Promise.all([
          getBackendMe().catch(() => ({ user: null })),
          getBackendHealth().catch(() => ({ ok: false })),
          getAdminOverview()
        ]);

        setUser(meRes.user);
        setHealth(healthRes.ok ? "ok" : "down");

        if (!isAdminUser(meRes.user)) {
          setOverview(null);
          return;
        }

        setOverview(adminRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load admin data.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const allowAdmin = useMemo(() => isAdminUser(user), [user]);

  const onWebhook = async () => {
    setWebhookStatus(null);
    try {
      const res = await triggerAdminWebhook();
      setWebhookStatus(res.message || "Webhook sent.");
    } catch (err) {
      setWebhookStatus(err instanceof Error ? err.message : "Webhook failed.");
    }
  };

  if (loading) {
    return (
      <AppShell active="/admin">
        <div className="glass" style={{ padding: "1.5rem" }}>Loading admin dashboard...</div>
      </AppShell>
    );
  }

  if (!allowAdmin) {
    return (
      <AppShell active="/admin">
        <div className="glass" style={{ padding: "1.5rem", display: "grid", gap: "0.8rem" }}>
          <h2 className="section-title">Admin access only</h2>
          <p className="muted">This area is available only for the APPOCAR owner account.</p>
          <div className="muted">Signed in as: {user?.email || "Guest"}</div>
          <button className="secondary" onClick={() => router.push("/")}>Back to home</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="/admin">
      <div className="glass" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 className="section-title">Admin cockpit</h2>
            <p className="muted">Secure control panel for APPOCAR operations.</p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <span className="badge">User: {user?.email}</span>
            <span className="badge">Backend: {health === "ok" ? "Connected" : "Unavailable"}</span>
          </div>
        </div>

        {error && <div className="muted">{error}</div>}
      </div>

      <div className="admin-grid">
        {overview?.stats.map((stat) => (
          <div key={stat.label} className="surface card">
            <div className="kpi">{stat.value}</div>
            <div className="muted">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="surface" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
        <h3 className="section-title" style={{ fontSize: "1.3rem" }}>Tasks</h3>
        <ul style={{ display: "grid", gap: "0.6rem", paddingLeft: "1.2rem" }}>
          {overview?.tasks.map((task) => (
            <li key={task} className="muted">{task}</li>
          ))}
        </ul>
      </div>

      <div className="surface" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h3 className="section-title" style={{ fontSize: "1.25rem" }}>Backend tools</h3>
            <p className="muted">Trigger backend integrations and validate handler wiring.</p>
          </div>
          <button className="primary" onClick={onWebhook}>Trigger webhook</button>
        </div>
        {webhookStatus && <div className="muted">{webhookStatus}</div>}
      </div>
    </AppShell>
  );
}
