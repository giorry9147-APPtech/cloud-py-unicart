// constants/api.ts
import { API_BASE } from "../lib/api";

export async function parseProduct(url: string) {
  const res = await fetch(`${API_BASE}/api/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("parseProduct error status:", res.status, text);
    throw new Error(`Parse API failed: ${res.status}`);
  }

  return res.json() as Promise<{
    url: string;
    title: string;
    price: number;
    shop: string;
    image?: string;
  }>;
}
