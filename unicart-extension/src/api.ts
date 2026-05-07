const API_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE)
  ? (import.meta as any).env.VITE_API_BASE
  : "https://unicart-web.vercel.app";


function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "unknown";
  }
}

export async function getActiveTabUrl(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) throw new Error("No active tab URL");
  return tab.url;
}

export async function parseUrl(url: string) {
  const res = await fetch(`${API_BASE}/api/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) throw new Error(`Parse failed (${res.status})`);
  const data = await res.json();

  const finalUrl = data.canonicalUrl || data.url || url;

  return {
    url: finalUrl,
    title: data.title || "",
    shop: "",
    price: data.price ?? null,
    image: data.imageUrl || "",
    currency: data.currency || null,
    domain: data.domain || domainFromUrl(finalUrl),
  };
}

export async function saveItemToApi(
  idToken: string,
  item: {
    title: string;
    url: string;
    shop: string;
    price: number | null;
    image: string;
    currency: string | null;
    domain: string;
    category: string | null;
  }
) {
  const res = await fetch(`${API_BASE}/api/extension/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, item }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Save failed (${res.status})`);
  return json;
}
