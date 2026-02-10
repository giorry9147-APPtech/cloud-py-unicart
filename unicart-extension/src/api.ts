const API_BASE = "http://localhost:3000";


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

  return {
    url: data.url || url,
    title: data.title || "",
    shop: data.shop || "",
    price: data.price ?? null,
    image: data.image || "",
    domain: domainFromUrl(data.url || url),
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
