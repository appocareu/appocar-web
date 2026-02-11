"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  getAdminOverview,
  getBackendHealth,
  getBackendMe,
  isAdminUser,
  getModerationQueue,
  getAdminAnalytics,
  getAdminEmailStats,
  resolveModerationEvent,
  triggerAdminWebhook,
  runEmailCampaigns,
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
  const [moderationItems, setModerationItems] = useState<any[]>([]);
  const [moderationStatus, setModerationStatus] = useState("rejected");
  const [moderationDecision, setModerationDecision] = useState("pending");
  const [moderationQuery, setModerationQuery] = useState("");
  const [moderationEmail, setModerationEmail] = useState("");
  const [moderationFrom, setModerationFrom] = useState("");
  const [moderationTo, setModerationTo] = useState("");
  const [moderationCount, setModerationCount] = useState(0);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationNote, setModerationNote] = useState<Record<string, string>>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [emailStats, setEmailStats] = useState<any>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const allowAdmin = useMemo(() => isAdminUser(user), [user]);

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

  useEffect(() => {
    if (!allowAdmin) return;
    setModerationLoading(true);
    getModerationQueue(
      {
        status: moderationStatus === "all" ? "" : moderationStatus,
        decision: moderationDecision || "",
        q: moderationQuery || "",
        userEmail: moderationEmail || "",
        from: moderationFrom || "",
        to: moderationTo || ""
      },
      50,
      0
    )
      .then((res) => {
        setModerationItems(Array.isArray(res.items) ? res.items : []);
        setModerationCount(typeof res.count === "number" ? res.count : res.items?.length ?? 0);
      })
      .catch(() => setModerationItems([]))
      .finally(() => setModerationLoading(false));
  }, [allowAdmin, moderationStatus, moderationDecision, moderationQuery, moderationEmail, moderationFrom, moderationTo]);

  useEffect(() => {
    if (!allowAdmin) return;
    getAdminAnalytics(30)
      .then((res) => setAnalytics(res))
      .catch(() => setAnalytics(null));
  }, [allowAdmin]);

  useEffect(() => {
    if (!allowAdmin) return;
    getAdminEmailStats(30)
      .then((res) => setEmailStats(res))
      .catch(() => setEmailStats(null));
  }, [allowAdmin]);

  const onWebhook = async () => {
    setWebhookStatus(null);
    try {
      const res = await triggerAdminWebhook();
      setWebhookStatus(res.message || "Webhook sent.");
    } catch (err) {
      setWebhookStatus(err instanceof Error ? err.message : "Webhook failed.");
    }
  };

  const onEmailRun = async () => {
    setEmailStatus(null);
    try {
      await runEmailCampaigns();
      setEmailStatus("Email campaigns triggered.");
      const res = await getAdminEmailStats(30);
      setEmailStats(res);
    } catch (err) {
      setEmailStatus(err instanceof Error ? err.message : "Email campaigns failed.");
    }
  };

  const resolveAndRefresh = async (id: string, decision: string) => {
    try {
      await resolveModerationEvent(id, decision, moderationNote[id]);
      const res = await getModerationQueue(
        {
          status: moderationStatus === "all" ? "" : moderationStatus,
          decision: moderationDecision || "",
          q: moderationQuery || "",
          userEmail: moderationEmail || "",
          from: moderationFrom || "",
          to: moderationTo || ""
        },
        50,
        0
      );
      setModerationItems(Array.isArray(res.items) ? res.items : []);
      setModerationCount(typeof res.count === "number" ? res.count : res.items?.length ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve moderation item.");
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
      <div className="page-header">
        <div>
          <h2 className="section-title">Admin cockpit</h2>
          <p className="muted">Secure control panel for APPOCAR operations.</p>
        </div>
        <div className="page-header__badge">
          {health === "ok" ? "Backend connected" : "Backend unavailable"}
        </div>
      </div>

      <div className="surface card" style={{ padding: "1.2rem" }}>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <span className="badge">User: {user?.email}</span>
          <span className="badge">Role: Owner</span>
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
        {analytics && (
          <div className="surface card" style={{ gridColumn: "span 2" }}>
            <div className="card-title">Analytics (last {analytics.rangeDays} days)</div>
            <div className="admin-grid" style={{ marginTop: "0.8rem" }}>
              <div className="surface card">
                <div className="kpi">{analytics.impressions?.toLocaleString?.() ?? analytics.impressions}</div>
                <div className="muted">Search impressions</div>
              </div>
              <div className="surface card">
                <div className="kpi">{analytics.views?.toLocaleString?.() ?? analytics.views}</div>
                <div className="muted">Listing views</div>
              </div>
              <div className="surface card">
                <div className="kpi">{analytics.ctr}%</div>
                <div className="muted">CTR</div>
              </div>
              <div className="surface card">
                <div className="kpi">{analytics.contacts?.toLocaleString?.() ?? analytics.contacts}</div>
                <div className="muted">Contact clicks</div>
              </div>
              <div className="surface card">
                <div className="kpi">{analytics.contactRate}%</div>
                <div className="muted">Contact rate</div>
              </div>
              <div className="surface card">
                <div className="kpi">{analytics.unreadNotifications ?? 0}</div>
                <div className="muted">Unread notifications</div>
              </div>
            </div>
            {Array.isArray(analytics.recentEvents) && analytics.recentEvents.length > 0 && (
              <div style={{ marginTop: "1rem", display: "grid", gap: "0.4rem" }}>
                <div className="muted">Recent events</div>
                {analytics.recentEvents.slice(0, 6).map((event: any, index: number) => (
                  <div key={`${event.event_type}-${index}`} className="muted">
                    {event.event_type} · {event.user_email || "anon"} · {new Date(event.created_at).toLocaleString()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {emailStats && (
          <div className="surface card" style={{ gridColumn: "span 2" }}>
            <div className="card-title">Email campaigns (last {emailStats.rangeDays} days)</div>
            <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.6rem" }}>
              {emailStats.items.length === 0 && <div className="muted">No email events yet.</div>}
              {emailStats.items.map((item: any, index: number) => (
                <div key={`${item.type}-${item.variant}-${index}`} className="surface" style={{ padding: "0.7rem 0.9rem", borderRadius: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <strong>{item.type}</strong> · Variant {item.variant}
                    </div>
                    <div className="muted">
                      {item.sent} sent{typeof item.opens === "number" ? ` · ${item.opens} opens` : ""}
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    Last sent: {item.lastSent ? new Date(item.lastSent).toLocaleString() : "—"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button className="primary" onClick={onEmailRun}>Run campaigns now</button>
              {emailStatus && <div className="muted">{emailStatus}</div>}
            </div>
          </div>
        )}
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
            <h3 className="section-title" style={{ fontSize: "1.25rem" }}>Moderation queue</h3>
            <p className="muted">Review uploads and violation logs. Total: {moderationCount}</p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <select
              className="input"
              style={{ maxWidth: 180 }}
              value={moderationStatus}
              onChange={(event) => setModerationStatus(event.target.value)}
            >
              <option value="rejected">Rejected</option>
              <option value="error">Errors</option>
              <option value="accepted">Accepted</option>
              <option value="all">All</option>
            </select>
            <select
              className="input"
              style={{ maxWidth: 160 }}
              value={moderationDecision}
              onChange={(event) => setModerationDecision(event.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cleared">Cleared</option>
              <option value="">Any decision</option>
            </select>
            <input
              className="input"
              placeholder="Search reason / file"
              value={moderationQuery}
              onChange={(event) => setModerationQuery(event.target.value)}
            />
            <input
              className="input"
              placeholder="User email"
              value={moderationEmail}
              onChange={(event) => setModerationEmail(event.target.value)}
            />
            <input
              className="input"
              type="date"
              value={moderationFrom}
              onChange={(event) => setModerationFrom(event.target.value)}
            />
            <input
              className="input"
              type="date"
              value={moderationTo}
              onChange={(event) => setModerationTo(event.target.value)}
            />
          </div>
        </div>
        {moderationLoading && <div className="muted">Loading moderation queue...</div>}
        {!moderationLoading && moderationItems.length === 0 && (
          <div className="muted">No moderation events found.</div>
        )}
        <div className="grid" style={{ gap: "1rem" }}>
          {moderationItems.map((item) => (
            <div key={item.id} className="surface card" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <strong>{item.reason || item.status}</strong>
                  <div className="muted">{item.userEmail || "Unknown user"} · {new Date(item.createdAt).toLocaleString()}</div>
                </div>
                <div className="badge">{item.status}</div>
              </div>
              {item.fileUrl && (
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <img
                    src={item.fileUrl}
                    alt="Moderation preview"
                    style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }}
                  />
                  <div className="muted" style={{ maxWidth: 420 }}>
                    {item.meta?.ocrText && <div>OCR: {String(item.meta.ocrText)}</div>}
                    {item.meta?.ip && <div>IP: {String(item.meta.ip)}</div>}
                    {item.meta?.userAgent && <div>UA: {String(item.meta.userAgent)}</div>}
                  </div>
                </div>
              )}
              <textarea
                className="input"
                placeholder="Add moderation note (optional)"
                value={moderationNote[item.id] || ""}
                onChange={(event) =>
                  setModerationNote((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button
                  className="secondary"
                  onClick={() => resolveAndRefresh(item.id, "approved")}
                >
                  Approve
                </button>
                <button
                  className="secondary"
                  onClick={() => resolveAndRefresh(item.id, "rejected")}
                >
                  Keep rejected
                </button>
                <button
                  className="ghost"
                  onClick={() => resolveAndRefresh(item.id, "cleared")}
                >
                  Clear
                </button>
              </div>
              {item.decisionStatus && (
                <div className="muted">Decision: {item.decisionStatus} · {item.reviewedBy || "system"}</div>
              )}
            </div>
          ))}
        </div>
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
