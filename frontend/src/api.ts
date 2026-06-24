import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

async function getToken(): Promise<string | null> {
  return await storage.secureGet<string>("auth_token", "");
}

export async function setToken(token: string) {
  await storage.secureSet("auth_token", token);
}

export async function clearToken() {
  await storage.secureRemove("auth_token");
}

async function req<T = any>(
  path: string,
  opts: { method?: string; body?: any; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/api${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.detail || JSON.stringify(data);
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

export const api = {
  signup: (name: string, email: string, password: string) =>
    req("/auth/signup", { method: "POST", body: { name, email, password }, auth: false }),
  login: (email: string, password: string) =>
    req("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  me: () => req("/me"),
  onboard: (city: string, locality: string) =>
    req("/me/onboard", { method: "POST", body: { city, locality } }),
  localities: () => req<Record<string, string[]>>("/localities", { auth: false }),
  listPosts: (category?: string) =>
    req(`/posts${category && category !== "all" ? `?category=${category}` : ""}`),
  createPost: (content: string, category: string, image_base64?: string | null) =>
    req("/posts", { method: "POST", body: { content, category, image_base64 } }),
  likePost: (id: string) => req(`/posts/${id}/like`, { method: "POST" }),
  listEvents: () => req("/events"),
  rsvp: (id: string) => req(`/events/${id}/rsvp`, { method: "POST" }),
  listMarket: () => req("/marketplace"),
  translate: (text: string, target: "hindi" | "english") =>
    req("/ai/translate", { method: "POST", body: { text, target } }),
};

export const CATEGORIES = [
  { key: "general", label: "General", color: "#4A4A48" },
  { key: "recommendations", label: "Recos", color: "#437A53" },
  { key: "safety", label: "Safety", color: "#B83A3A" },
  { key: "events", label: "Events", color: "#B58500" },
  { key: "forsale", label: "For Sale", color: "#2E5C3B" },
] as const;
