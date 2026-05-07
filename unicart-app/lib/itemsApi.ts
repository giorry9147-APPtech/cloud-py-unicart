import { API_BASE } from "./api";
import { auth } from "./firebaseConfig";

export async function createItemFromUrl(url: string, partial?: {
  title?: string;
  price?: number | null;
  shop?: string;
  image_url?: string;
  currency?: string;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/api/items/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url,
      source: "app_manual",
      ...(partial ?? {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return data as { ok: true; itemId: string };
}
