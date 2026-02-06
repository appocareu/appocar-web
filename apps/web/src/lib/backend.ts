import { api } from "@/lib/api";

export type BackendUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
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
