import { api } from "@/lib/api";

export type BackendUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
};

export type AdminOverview = {
  stats: Array<{ label: string; value: string }>;
  tasks: string[];
};

const fallbackOverview: AdminOverview = {
  stats: [
    { label: "Active listings", value: "12,842" },
    { label: "Pending approvals", value: "148" },
    { label: "Flagged items", value: "23" },
    { label: "Revenue (MTD)", value: "EUR 182k" }
  ],
  tasks: [
    "Review dealer verification queue",
    "Approve premium placements",
    "Audit flagged listings",
    "Send weekly performance report"
  ]
};

export async function getBackendHealth() {
  return api<{ ok: boolean }>("/api/health");
}

export async function getBackendMe() {
  return api<{ user: BackendUser | null }>("/api/auth/me");
}

export async function backendLogout() {
  return api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function getBackendListings() {
  return api<{ items: any[] }>("/api/listings");
}

export async function getAdminOverview() {
  try {
    return await api<AdminOverview>("/api/admin/overview");
  } catch {
    return fallbackOverview;
  }
}

export async function getModerationQueue(
  filters: {
    status?: string;
    decision?: string;
    userEmail?: string;
    reason?: string;
    q?: string;
    from?: string;
    to?: string;
  } = {},
  limit = 50,
  offset = 0
) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.decision) params.set("decision", filters.decision);
  if (filters.userEmail) params.set("userEmail", filters.userEmail);
  if (filters.reason) params.set("reason", filters.reason);
  if (filters.q) params.set("q", filters.q);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return api<{ items: any[]; count?: number }>(`/api/admin/moderation?${params.toString()}`);
}

export async function getAdminAnalytics(days = 30) {
  const params = new URLSearchParams();
  params.set("days", String(days));
  return api<{
    rangeDays: number;
    views: number;
    impressions: number;
    ctr: number;
    contacts: number;
    contactRate: number;
    unreadNotifications: number;
    recentEvents: Array<{ event_type: string; user_email?: string; listing_id?: string; created_at: string }>;
  }>(`/api/admin/analytics?${params.toString()}`);
}

export async function getAdminEmailStats(days = 30) {
  const params = new URLSearchParams();
  params.set("days", String(days));
  return api<{ rangeDays: number; items: Array<{ type: string; variant: string; sent: number; opens?: number; lastSent?: string }> }>(
    `/api/admin/email-stats?${params.toString()}`
  );
}

export async function runEmailCampaigns() {
  return api<{ ok: boolean; result?: any }>(`/api/admin/marketing/run`, { method: "POST" });
}

export async function resolveModerationEvent(id: string, decision: string, note?: string) {
  return api<{ ok: boolean }>(`/api/admin/moderation/${id}/resolve`, {
    method: "POST",
    json: { decision, note }
  });
}

export async function triggerAdminWebhook() {
  return api<{ ok: boolean; message?: string }>("/api/admin/webhook/test", {
    method: "POST",
    json: { source: "appocar-admin" }
  });
}

export function isAdminUser(user: BackendUser | null) {
  if (!user) return false;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "appocar.eu@gmail.com";
  return user.role === "admin" || user.email?.toLowerCase() === adminEmail.toLowerCase();
}
