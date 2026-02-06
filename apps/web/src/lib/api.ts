const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type ApiOptions = RequestInit & { json?: any };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const res = await fetch(`${API_BASE}${normalizedPath}`, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    credentials: "include"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}
