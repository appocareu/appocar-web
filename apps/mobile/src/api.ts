export const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "";

export async function fetchListings(query = "", token?: string) {
  if (!API_BASE) return null;
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  const res = await fetch(`${API_BASE}/api/listings?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchListing(id: string, token?: string) {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/listings/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!res.ok) return null;
  return res.json();
}

export async function login(email: string, name?: string) {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name })
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getMe(token: string) {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return res.json();
}

export async function logout(token: string) {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return res.json();
}
