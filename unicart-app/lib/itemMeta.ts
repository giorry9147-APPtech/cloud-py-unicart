// lib/itemMeta.ts

export type ItemCategory =
  | "tshirt"
  | "broek"
  | "shoes"
  | "hoodie"
  | "jacket"
  | "accessory"
  | "electronics"
  | "other";

/**
 * Normalize a key so filters don't break on casing / spacing / "www."
 * Examples:
 *  - "WWW.BOL.COM" -> "bol.com"
 *  - "  T-Shirt "  -> "t-shirt"
 *  - ""            -> "unknown"
 */
export function normalizeKey(value?: string | null): string {
  const v = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\s+/g, " ");

  return v.length ? v : "unknown";
}

export function getDomainFromUrl(url?: string): string {
  const u = String(url ?? "").trim();
  if (!u) return "unknown";

  try {
    const host = new URL(u).hostname.toLowerCase();
    return normalizeKey(host);
  } catch {
    return "unknown";
  }
}

function normalizeText(s: string) {
  const base = (s || "").toLowerCase();
  const deAccented = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return deAccented
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// simpele 80/20 rules (later uitbreiden)
export function guessCategory(title?: string, url?: string): ItemCategory {
  const t = normalizeText(title || "");
  const u = normalizeText(url || "");
  const hay = `${t} ${u}`;

  // tshirt
  if (/\b(t\s?-?\s?shirt|tee|tshirt|shirt)\b/.test(hay)) return "tshirt";

  // broek
  if (/\b(broek|pants|jeans|trousers|denim)\b/.test(hay)) return "broek";

  // shoes
  if (/\b(shoe|sneaker|boot|loafer|sandal|heels|schoenen)\b/.test(hay)) return "shoes";

  // hoodie
  if (/\b(hoodie|sweatshirt|sweater)\b/.test(hay)) return "hoodie";

  // jacket
  if (/\b(jacket|coat|jas)\b/.test(hay)) return "jacket";

  // accessory
  if (/\b(belt|riem|cap|hat|bag|tas|bracelet|watch|ring)\b/.test(hay)) return "accessory";

  // electronics
  if (/\b(headphone|earbud|laptop|phone|iphone|samsung|tablet|camera)\b/.test(hay)) return "electronics";

  return "other";
}

export function prettyCategory(cat?: ItemCategory | string | null): string {
  const c = normalizeKey(cat);

  switch (c) {
    case "tshirt":
      return "T-shirts";
    case "broek":
      return "Pants";
    case "shoes":
      return "Shoes";
    case "hoodie":
      return "Hoodies & Sweaters";
    case "jacket":
      return "Jackets";
    case "accessory":
      return "Accessories";
    case "electronics":
      return "Electronics";
    default:
      return "Other";
  }
}
