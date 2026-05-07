// app/(tabs)/home.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Image,
  StatusBar,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../../lib/firebaseConfig";
import { createItemFromUrl } from "../../lib/itemsApi";
import { API_BASE } from "../../lib/api";

const PURPLE = "#6C3BFF";
const YELLOW = "#FFCF33";
const BG = "#F9F5FF";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#8E8E93";

type WishItem = {
  id: string;
  title: string;
  shop: string;
  product_url?: string;
  image_url?: string;
  price?: number | null;
  status: "todo" | "saved" | "bought";
  targetPrice?: number | null;
  virtualSaved?: number | null;
};

type Example = { id: string; title: string; price: string; image: string; url: string };

const EXAMPLES: Example[] = [
  {
    id: "ex-nike",
    title: "Nike Dunk Low",
    price: "€119,99",
    image: "https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/0e21a85f-4f0c-4e2e-bbc7-0bdc3da91e0e/dunk-low-retro-mens-shoes-87q0hf.png",
    url: "https://www.coolblue.nl/product/948663/sony-playstation-5-disc-edition-slim.html",
  },
  {
    id: "ex-iphone",
    title: "iPhone 15 Pro",
    price: "€1.199,00",
    image: "https://media.s-bol.com/o6vR2pV63D3o/Mr1Z82M/473x550.jpg",
    url: "https://www.bol.com/nl/nl/p/orico-nvme-m-2-ssd-behuizing-10gbps-transparant-blauw-aluminium/9200000115247889/",
  },
  {
    id: "ex-mac",
    title: "MacBook Air M2",
    price: "€1.199,00",
    image: "https://image.coolblue.nl/500x500/products/1862344",
    url: "https://www.coolblue.nl/product/948663/sony-playstation-5-disc-edition-slim.html",
  },
];

function normalizeUrl(raw: string): string {
  const t = (raw || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+\//.test(t)) return `https://${t}`;
  return t;
}

export default function HomeScreen() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<WishItem[]>([]);

  const user = auth.currentUser;
  const firstName = useMemo(() => {
    if (!user) return "";
    if (user.displayName) return user.displayName.split(" ")[0];
    if (user.email) return user.email.split("@")[0];
    return "";
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      const u = auth.currentUser;
      if (!u) return () => {};
      const colRef = collection(db, "users", u.uid, "wishlist_items");
      const q = query(colRef, orderBy("createdAt", "desc"));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: WishItem[] = snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              title: String(data.title ?? ""),
              shop: String(data.shop ?? ""),
              product_url: data.product_url,
              image_url: data.image_url,
              price: data.price ?? null,
              status: (data.status || "todo") as WishItem["status"],
              targetPrice: data.targetPrice ?? null,
              virtualSaved: data.virtualSaved ?? 0,
            };
          });
          setItems(list);
        },
        (err) => console.log("[home] snapshot error", err)
      );
      return unsub;
    }, [])
  );

  const stats = useMemo(() => {
    const totalItems = items.filter((i) => i.status !== "bought").length;
    const activeGoals = items.filter(
      (i) =>
        i.targetPrice != null &&
        i.status !== "bought" &&
        (i.virtualSaved ?? 0) < (i.targetPrice ?? 0)
    ).length;
    const totalSaved = items.reduce((s, i) => s + (i.virtualSaved ?? 0), 0);
    return { totalItems, activeGoals, totalSaved };
  }, [items]);

  const wishlistPreview = useMemo(
    () =>
      items
        .filter((i) => i.status !== "bought")
        .slice(0, 3),
    [items]
  );

  const fmt = (n: number) =>
    `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const submitAdd = async () => {
    const u = auth.currentUser;
    if (!u) return Alert.alert("Error", "Je bent niet ingelogd.");

    const normalized = normalizeUrl(url);
    if (!normalized) return Alert.alert("Error", "Plak eerst een product link.");
    if (!/^https?:\/\/[^\s/]+\.[^\s/]+/.test(normalized)) {
      return Alert.alert("Error", "Dit is geen geldige link.");
    }

    if (normalized !== url) setUrl(normalized);

    Keyboard.dismiss();
    setBusy(true);

    let parsed: { title?: string; price?: number | null; shop?: string; image_url?: string; currency?: string } = {};
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(`${API_BASE}/api/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        parsed = {
          title: data.title || undefined,
          price: data.price ?? null,
          shop: data.shop || data.domain || undefined,
          image_url: data.imageUrl || data.image || undefined,
          currency: data.currency || undefined,
        };
      }
    } catch (e) {
      // soft-fail; we still save with whatever URL we have
      console.log("[home] parse failed, saving raw:", e);
    }

    try {
      const created = await createItemFromUrl(normalized, parsed);
      setUrl("");
      router.push({
        pathname: "/(tabs)/wishlist",
        params: { createdItemId: created.itemId },
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Opslaan mislukt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Purple header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.brand}>
              UNI<Text style={{ color: YELLOW }}>CART</Text>
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => router.push("/(tabs)/profile")}
              >
                <Ionicons name="person-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn}>
                <Ionicons name="notifications-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroBlock}>
          <Text style={styles.heroLine1}>Save smarter.</Text>
          <Text style={styles.heroLine2}>Buy later.</Text>
          <Text style={styles.heroSub}>
            Plak een productlink. Volg de prijs.{"\n"}Bereik je doel.
          </Text>

          {/* Paste link card */}
          <View style={styles.pasteCard}>
            <Ionicons name="link-outline" size={18} color={PURPLE} style={{ marginLeft: 4, marginRight: 8 }} />
            <TextInput
              style={styles.pasteInput}
              placeholder="Plak product link..."
              placeholderTextColor="#B8B8B8"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              returnKeyType="go"
              onSubmitEditing={submitAdd}
            />
            <TouchableOpacity
              style={[styles.addBtn, busy && { opacity: 0.6 }]}
              onPress={submitAdd}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={TEXT} size="small" />
              ) : (
                <Text style={styles.addBtnText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Try it out */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Try it out</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>See examples</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          style={{ marginTop: 4 }}
        >
          {EXAMPLES.map((ex) => (
            <TouchableOpacity
              key={ex.id}
              style={styles.exampleCard}
              onPress={() => setUrl(ex.url)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: ex.image }} style={styles.exampleImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.exampleTitle} numberOfLines={1}>
                  {ex.title}
                </Text>
                <Text style={styles.examplePrice}>{ex.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stat cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(108,59,255,0.12)" }]}>
              <Ionicons name="wallet-outline" size={16} color={PURPLE} />
            </View>
            <Text style={styles.statLabel}>Total Saved</Text>
            <Text style={styles.statValue}>{fmt(stats.totalSaved)}</Text>
            <Text style={[styles.statSub, { color: "#159B5C" }]}>+ deze maand</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(255,207,51,0.18)" }]}>
              <Ionicons name="locate-outline" size={16} color="#B58400" />
            </View>
            <Text style={styles.statLabel}>Active Goals</Text>
            <Text style={styles.statValue}>{stats.activeGoals}</Text>
            <Text style={[styles.statSub, { color: PURPLE }]}>Keep going! 💪</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(108,59,255,0.12)" }]}>
              <Ionicons name="bag-outline" size={16} color={PURPLE} />
            </View>
            <Text style={styles.statLabel}>Items Tracked</Text>
            <Text style={styles.statValue}>{stats.totalItems}</Text>
            <Text style={styles.statSub}>Across all stores</Text>
          </View>
        </View>

        {/* Your Wishlist preview */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Your Wishlist</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/wishlist")}>
            <Text style={styles.sectionLink}>View all</Text>
          </TouchableOpacity>
        </View>

        {wishlistPreview.length === 0 ? (
          <View style={styles.previewEmpty}>
            <Ionicons name="bag-outline" size={28} color={PURPLE} />
            <Text style={styles.previewEmptyTitle}>Nog niets in je wishlist</Text>
            <Text style={styles.previewEmptySub}>Plak een productlink hierboven om te beginnen.</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {wishlistPreview.map((item) => {
              const target = item.targetPrice;
              const saved = item.virtualSaved ?? 0;
              const hasTarget = target != null && Number.isFinite(target);
              const pct = hasTarget && target! > 0 ? Math.min(100, Math.round((saved / target!) * 100)) : 0;
              const currentPrice = item.price ?? 0;
              const showDiscount = hasTarget && target! < currentPrice;
              const discount = showDiscount ? currentPrice - target! : 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.wishCard}
                  onPress={() => router.push("/(tabs)/wishlist")}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: item.image_url || "https://via.placeholder.com/200" }}
                    style={styles.wishImg}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wishTitle} numberOfLines={1}>
                      {item.title || "Onbekend product"}
                    </Text>
                    <Text style={styles.wishShop}>{(item.shop || "—").toLowerCase()}</Text>
                    {hasTarget ? (
                      <>
                        <Text style={styles.wishGoal}>Goal: {fmt(target!)}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pct}%` }]} />
                        </View>
                        <View style={styles.wishMeta}>
                          <Text style={styles.wishSaved}>{fmt(saved)} saved</Text>
                          <Text style={styles.wishPct}>{pct}%</Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.wishGoal}>{item.price != null ? fmt(item.price) : "Prijs onbekend"}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    {item.price != null ? (
                      <Text style={styles.wishPrice}>{fmt(item.price)}</Text>
                    ) : null}
                    {showDiscount ? (
                      <View style={styles.discountBadge}>
                        <Ionicons name="arrow-down" size={10} color="#7F4DFF" />
                        <Text style={styles.discountText}>{fmt(discount)}</Text>
                      </View>
                    ) : null}
                    <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Spacer for FAB */}
        <View style={{ height: 16 }} />
        {firstName ? (
          <Text style={styles.welcomeNote}>Welkom terug, {firstName} 👋</Text>
        ) : null}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(tabs)/wishlist")}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={TEXT} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: PURPLE,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 24, fontWeight: "900", color: YELLOW, letterSpacing: 0.5 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroBlock: { paddingHorizontal: 20, marginTop: 22 },
  heroLine1: { fontSize: 36, fontWeight: "900", color: TEXT, letterSpacing: -1 },
  heroLine2: { fontSize: 36, fontWeight: "900", color: PURPLE, letterSpacing: -1 },
  heroSub: { fontSize: 14, color: TEXT_SEC, marginTop: 10, lineHeight: 20 },

  pasteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 18,
    gap: 6,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pasteInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    paddingVertical: 8,
  },
  addBtn: {
    backgroundColor: YELLOW,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 78,
    alignItems: "center",
  },
  addBtnText: { fontSize: 14, fontWeight: "900", color: TEXT },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 26,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: TEXT, letterSpacing: -0.3 },
  sectionLink: { fontSize: 13, color: PURPLE, fontWeight: "800" },

  exampleCard: {
    width: 200,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    gap: 10,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  exampleImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#F2F0F8" },
  exampleTitle: { fontSize: 13, fontWeight: "800", color: TEXT },
  examplePrice: { fontSize: 12, fontWeight: "900", color: PURPLE, marginTop: 2 },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: { fontSize: 10, color: TEXT_SEC, fontWeight: "700" },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  statSub: { fontSize: 10, fontWeight: "700", marginTop: 4, color: TEXT_SEC },

  previewEmpty: {
    marginHorizontal: 20,
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    gap: 6,
  },
  previewEmptyTitle: { fontSize: 14, fontWeight: "900", color: TEXT, marginTop: 4 },
  previewEmptySub: { fontSize: 12, color: TEXT_SEC, textAlign: "center", paddingHorizontal: 24 },

  wishCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    alignItems: "center",
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  wishImg: { width: 70, height: 70, borderRadius: 12, backgroundColor: "#F2F0F8" },
  wishTitle: { fontSize: 14, fontWeight: "800", color: TEXT },
  wishShop: { fontSize: 11, color: TEXT_SEC, marginTop: 2 },
  wishGoal: { fontSize: 11, color: TEXT_SEC, marginTop: 2 },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(108,59,255,0.10)",
    marginTop: 6,
    marginBottom: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: YELLOW, borderRadius: 3 },
  wishMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  wishSaved: { fontSize: 11, color: PURPLE, fontWeight: "700" },
  wishPct: { fontSize: 11, color: TEXT_SEC, fontWeight: "700" },
  wishPrice: { fontSize: 14, fontWeight: "900", color: TEXT },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(108,59,255,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  discountText: { fontSize: 11, color: "#7F4DFF", fontWeight: "900" },

  welcomeNote: {
    textAlign: "center",
    color: TEXT_SEC,
    fontSize: 12,
    marginTop: 18,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 84,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
