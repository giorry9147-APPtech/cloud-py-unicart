// app/(tabs)/wishlist.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  Image,
  Alert,
  Linking,
  Keyboard,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import SavingModal from "../../components/SavingModal";
import WishlistFilterSheet, {
  CategoryOption,
  SortMode,
  CategoryKey,
} from "../../components/WishlistFilterSheet";

import { auth, db } from "../../lib/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

import {
  getDomainFromUrl,
  guessCategory,
  normalizeKey,
  prettyCategory,
} from "../../lib/itemMeta";

import { API_BASE } from "../../lib/api";
import { createItemFromUrl } from "../../lib/itemsApi";

type ItemStatus = "todo" | "saved" | "bought";
type EnrichStatus = "pending" | "ok" | "failed";

type WishlistItem = {
  id: string;
  title: string;
  price?: number | null;
  shop: string;
  product_url?: string;
  image_url?: string;
  status: ItemStatus;
  createdAt?: any;

  targetPrice?: number | null;
  virtualSaved?: number | null;

  domain?: string | null;
  category?: string | null;
  currency?: string | null;

  enrichStatus?: EnrichStatus | null;
  enrichError?: string | null;
  intakeStatus?: "processing" | "ready" | "needs_user_input" | "blocked" | null;
  needsUserInput?: boolean | null;
  blockedReason?: string | null;
  parseMissing?: string[];
  userEdited?: boolean | null;
};

type EditFields = {
  title: string;
  price: string;
  shop: string;
  image_url: string;
};

const PURPLE = "#6C3BFF";
const YELLOW = "#FFCF33";
const BG = "#F9F5FF";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#8E8E93";

const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: "tshirt", label: "T-shirts" },
  { key: "electronics", label: "Electronics" },
  { key: "broek", label: "Pants" },
  { key: "hoodie", label: "Hoodies & Sweaters" },
  { key: "shoes", label: "Shoes" },
  { key: "jacket", label: "Jackets" },
  { key: "accessory", label: "Accessories" },
  { key: "other", label: "Other" },
];

function normalizeUrlInput(raw: string): string {
  const t = (raw || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+\//.test(t)) return `https://${t}`;
  return t;
}

export default function WishlistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ createdItemId?: string | string[] }>();
  const createdItemId =
    typeof params.createdItemId === "string"
      ? params.createdItemId
      : Array.isArray(params.createdItemId)
      ? params.createdItemId[0]
      : null;

  const user = auth.currentUser;
  const firstName = useMemo(() => {
    if (!user) return "";
    if (user.displayName) return user.displayName.split(" ")[0];
    if (user.email) return user.email.split("@")[0];
    return "";
  }, [user]);

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [savingOpen, setSavingOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<WishlistItem | null>(null);
  const [targetPriceInput, setTargetPriceInput] = useState("");

  // Quick-add state (paste link card)
  const [pasteUrl, setPasteUrl] = useState("");
  const [adding, setAdding] = useState(false);

  // Filter UI
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("none");
  const [hideOther, setHideOther] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);

  // Refresh
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Layout mode
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);
  const [editFields, setEditFields] = useState<EditFields>({
    title: "",
    price: "",
    shop: "",
    image_url: "",
  });
  const promptedNeedsInputIdsRef = useRef<Set<string>>(new Set());

  const resetFilters = useCallback(() => {
    setSortMode("none");
    setHideOther(false);
    setActiveCategory(null);
  }, []);

  const subscribeWishlist = useCallback(() => {
    const u = auth.currentUser;
    if (!u) {
      setItems([]);
      return () => {};
    }

    const colRef = collection(db, "users", u.uid, "wishlist_items");
    const q = query(colRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: WishlistItem[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const productUrl = String(data.product_url ?? "");
          const title = String(data.title ?? "");
          const domainFallback = getDomainFromUrl(productUrl);
          const categoryFallback = guessCategory(title, productUrl);

          return {
            id: d.id,
            title,
            price: data.price ?? null,
            shop: data.shop ?? "Onbekend",
            product_url: productUrl,
            image_url: data.image_url ?? "",
            status: (data.status || "todo") as ItemStatus,
            createdAt: data.createdAt,

            targetPrice: data.targetPrice ?? null,
            virtualSaved: data.virtualSaved ?? 0,

            domain: normalizeKey(
              (data.domain as string | undefined) ?? domainFallback ?? "unknown"
            ),
            category: normalizeKey(
              (data.category as string | undefined) ?? categoryFallback ?? "other"
            ),

            enrichStatus: (data.enrichStatus ?? null) as EnrichStatus | null,
            enrichError: data.enrichError ?? null,
            intakeStatus: data.intakeStatus ?? null,
            needsUserInput: data.needsUserInput ?? null,
            blockedReason: data.blockedReason ?? null,
            parseMissing: Array.isArray(data.parseMissing) ? data.parseMissing : [],
            userEdited: data.userEdited ?? null,
          };
        });

        const visible = list.filter((it) => it.status !== "bought");
        setItems(visible);

        const candidateByStatus = visible.find(
          (it) =>
            it.intakeStatus === "needs_user_input" &&
            !it.userEdited &&
            !promptedNeedsInputIdsRef.current.has(it.id)
        );
        const candidateByCreatedId =
          createdItemId &&
          visible.find(
            (it) =>
              it.id === createdItemId &&
              it.intakeStatus === "needs_user_input" &&
              !promptedNeedsInputIdsRef.current.has(it.id)
          );
        const needsInputItem = candidateByCreatedId || candidateByStatus;
        if (needsInputItem) {
          promptedNeedsInputIdsRef.current.add(needsInputItem.id);
          setTimeout(() => {
            openEdit(needsInputItem);
            Alert.alert(
              "Aanvulling nodig",
              "Dit item mist verplichte velden. Vul de details aan om het item compleet te maken."
            );
          }, 0);
        }
      },
      (err) => console.log("[wishlist] snapshot error", err)
    );

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFilterOpen(false);
      resetFilters();
      const unsub = subscribeWishlist();
      return () => unsub?.();
    }, [resetFilters, subscribeWishlist])
  );

  // ── Stats for the 3 cards under the header ──────────────────────────────
  const stats = useMemo(() => {
    const totalValue = items.reduce((s, i) => s + (i.price ?? 0), 0);
    const activeGoals = items.filter(
      (i) =>
        i.targetPrice != null &&
        (i.virtualSaved ?? 0) < (i.targetPrice ?? 0)
    ).length;
    return { totalValue, activeGoals, totalItems: items.length };
  }, [items]);

  const fmt = (n: number) =>
    `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Quick-add via paste card ────────────────────────────────────────────
  const submitAdd = async () => {
    const u = auth.currentUser;
    if (!u) return Alert.alert("Error", "Je bent niet ingelogd.");
    const normalized = normalizeUrlInput(pasteUrl);
    if (!normalized) return Alert.alert("Error", "Plak eerst een product link.");
    if (!/^https?:\/\/[^\s/]+\.[^\s/]+/.test(normalized)) {
      return Alert.alert("Error", "Dit is geen geldige link.");
    }

    Keyboard.dismiss();
    setAdding(true);

    let parsed: { title?: string; price?: number | null; shop?: string; image_url?: string; currency?: string } = {};
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45000);
      const res = await fetch(`${API_BASE}/api/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
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
      console.log("[wishlist quick-add] parse failed:", e);
    }

    try {
      await createItemFromUrl(normalized, parsed);
      setPasteUrl("");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Opslaan mislukt.");
    } finally {
      setAdding(false);
    }
  };

  // ── Existing actions ────────────────────────────────────────────────────
  const updateStatus = async (id: string, status: ItemStatus) => {
    const u = auth.currentUser;
    if (!u) return Alert.alert("Error", "Je bent niet ingelogd.");
    try {
      const ref = doc(db, "users", u.uid, "wishlist_items", id);
      await updateDoc(ref, { status, updatedAt: serverTimestamp() });
      setItems((prev) =>
        status === "bought"
          ? prev.filter((it) => it.id !== id)
          : prev.map((it) => (it.id === id ? { ...it, status } : it))
      );
      setActiveItem((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    } catch (e) {
      Alert.alert("Error", "Kon status niet aanpassen.");
    }
  };

  const removeItem = async (id: string) => {
    const u = auth.currentUser;
    if (!u) return Alert.alert("Error", "Je bent niet ingelogd.");
    try {
      const ref = doc(db, "users", u.uid, "wishlist_items", id);
      await deleteDoc(ref);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      Alert.alert("Error", "Kon product niet verwijderen.");
    }
  };

  const openSaving = (item: WishlistItem) => {
    setActiveItem(item);
    setTargetPriceInput(item.targetPrice ? String(item.targetPrice) : "");
    setSavingOpen(true);
  };
  const closeSaving = () => {
    setSavingOpen(false);
    setActiveItem(null);
    setTargetPriceInput("");
    Keyboard.dismiss();
  };

  const openEdit = (item: WishlistItem) => {
    setEditItem(item);
    setEditFields({
      title: item.title ?? "",
      price: item.price != null ? String(item.price) : "",
      shop: item.shop ?? "",
      image_url: item.image_url ?? "",
    });
    setEditOpen(true);
  };
  const closeEdit = () => {
    setEditOpen(false);
    setEditItem(null);
    setEditFields({ title: "", price: "", shop: "", image_url: "" });
    Keyboard.dismiss();
  };

  const saveEdit = async () => {
    const u = auth.currentUser;
    if (!u || !editItem) return;
    const title = editFields.title.trim();
    const shop = editFields.shop.trim();
    const image_url = editFields.image_url.trim();
    const raw = editFields.price.trim();
    const num = raw.length ? Number(raw.replace(",", ".")) : NaN;
    const price = Number.isFinite(num) ? num : null;
    if (!title) return Alert.alert("Error", "Titel is verplicht.");

    try {
      const ref = doc(db, "users", u.uid, "wishlist_items", editItem.id);
      await updateDoc(ref, {
        title,
        shop: shop || editItem.shop || "Onbekend",
        image_url: image_url || "",
        price,
        userEdited: true,
        updatedAt: serverTimestamp(),
      });
      closeEdit();
    } catch (e) {
      Alert.alert("Error", "Opslaan mislukt.");
    }
  };

  const saveTarget = async () => {
    if (!activeItem) return;
    const num = Number(String(targetPriceInput).replace(",", "."));
    if (!Number.isFinite(num) || num <= 0)
      return Alert.alert("Error", "Vul een geldige doelprijs in.");
    const u = auth.currentUser;
    if (!u) return;
    try {
      const ref = doc(db, "users", u.uid, "wishlist_items", activeItem.id);
      await updateDoc(ref, { targetPrice: num, updatedAt: serverTimestamp() });
      setActiveItem((prev) => (prev ? { ...prev, targetPrice: num } : prev));
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Error", "Kon doelprijs niet opslaan.");
    }
  };

  const addMoney = async (amount: number) => {
    if (!activeItem) return;
    const u = auth.currentUser;
    if (!u) return;
    try {
      const current = activeItem.virtualSaved ?? 0;
      const next = Math.max(0, Math.round((current + amount) * 100) / 100);
      const target = activeItem.targetPrice ?? null;
      const reached = target != null && next >= target;
      const ref = doc(db, "users", u.uid, "wishlist_items", activeItem.id);
      await updateDoc(ref, {
        virtualSaved: next,
        ...(reached ? { status: "saved" as ItemStatus } : {}),
        updatedAt: serverTimestamp(),
      });
      setActiveItem((prev) =>
        prev ? { ...prev, virtualSaved: next, ...(reached ? { status: "saved" } : {}) } : prev
      );
    } catch (e) {
      Alert.alert("Error", "Kon bedrag niet aanpassen.");
    }
  };

  const openLink = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return Alert.alert("Error", "Kan deze link niet openen.");
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Link openen mislukt.");
    }
  };

  const refreshItemData = async (item: WishlistItem) => {
    const u = auth.currentUser;
    if (!u) return Alert.alert("Error", "Je bent niet ingelogd.");
    try {
      setRefreshingId(item.id);
      const token = await u.getIdToken();
      const res = await fetch(`${API_BASE}/api/items/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        if (data?.needsUserInput) {
          openEdit(item);
          return;
        }
        throw new Error(data?.error || `Refresh failed (${res.status})`);
      }
      if (data?.needsUserInput) openEdit(item);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Refresh failed");
    } finally {
      setRefreshingId(null);
    }
  };

  // ── Filtering / sorting (search removed in mockup; keep filter sheet) ───
  const baseFiltered = useMemo(() => {
    return items.filter((it) => {
      const category = normalizeKey(it.category ?? "other");
      if (hideOther && category === "other") return false;
      if (activeCategory && category !== normalizeKey(activeCategory)) return false;
      return true;
    });
  }, [items, hideOther, activeCategory]);

  const sections = useMemo(() => {
    if (sortMode === "domain") {
      const map = new Map<string, WishlistItem[]>();
      baseFiltered.forEach((it) => {
        const d = normalizeKey(it.domain ?? "unknown");
        map.set(d, [...(map.get(d) ?? []), it]);
      });
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([title, data]) => ({ title, data }));
    }
    if (sortMode === "category") {
      const map = new Map<string, WishlistItem[]>();
      baseFiltered.forEach((it) => {
        const c = normalizeKey(it.category ?? "other");
        map.set(c, [...(map.get(c) ?? []), it]);
      });
      const order = new Map(CATEGORY_OPTIONS.map((c, idx) => [c.key, idx]));
      return Array.from(map.entries())
        .sort(
          ([a], [b]) =>
            (order.get(a as any) ?? 999) - (order.get(b as any) ?? 999) ||
            a.localeCompare(b)
        )
        .map(([key, data]) => ({ title: prettyCategory(key as any), data }));
    }
    return [];
  }, [sortMode, baseFiltered]);

  // ── Item card (list view, mockup 2 style) ───────────────────────────────
  const renderListItem = ({ item }: { item: WishlistItem }) => {
    const target = item.targetPrice;
    const saved = item.virtualSaved ?? 0;
    const hasTarget = target != null && Number.isFinite(target);
    const remaining = hasTarget ? Math.max(0, (target as number) - saved) : 0;
    const pct = hasTarget && (target as number) > 0
      ? Math.min(100, Math.round((saved / (target as number)) * 100))
      : 0;
    const isRefreshing = refreshingId === item.id;

    const domainPretty = (item.domain ?? "unknown").replace(/^www\./, "");

    return (
      <TouchableOpacity
        style={styles.listCard}
        activeOpacity={0.85}
        onPress={() => openLink(item.product_url)}
      >
        <Image
          source={{ uri: item.image_url || "https://via.placeholder.com/200" }}
          style={styles.listImg}
        />

        <View style={{ flex: 1, paddingRight: 6 }}>
          <View style={styles.titleRow}>
            <Text style={styles.listTitle} numberOfLines={1}>
              {item.title || "Onbekend product"}
            </Text>
            <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.shopRow}>
            <Text style={styles.shopText} numberOfLines={1}>
              {(item.shop || domainPretty).toLowerCase()}
            </Text>
            <Ionicons name="checkmark-circle" size={12} color={PURPLE} style={{ marginLeft: 4 }} />
          </View>

          <Text style={styles.listPrice}>
            {item.price != null ? fmt(item.price) : "Prijs onbekend"}
          </Text>

          {hasTarget ? (
            <>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Doel: {fmt(target as number)}</Text>
                <View style={styles.pctBadge}>
                  <Text style={styles.pctText}>{pct}%</Text>
                </View>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.goalSub}>
                {pct >= 100 ? (
                  <Text style={{ color: "#159B5C", fontWeight: "800" }}>Doel behaald ✓</Text>
                ) : saved > 0 ? (
                  <>
                    <Text style={{ color: "#159B5C", fontWeight: "800" }}>{fmt(saved)} bespaard</Text>
                    {"  "}•{"  "}
                    {fmt(remaining)} te gaan
                  </>
                ) : (
                  <>{fmt(remaining)} te gaan</>
                )}
              </Text>
            </>
          ) : (
            <TouchableOpacity onPress={() => openSaving(item)} style={styles.setGoalBtn}>
              <Ionicons name="locate-outline" size={12} color={PURPLE} />
              <Text style={styles.setGoalText}>Stel doel in</Text>
            </TouchableOpacity>
          )}

          <View style={styles.cardActionRow}>
            {!!item.product_url && (
              <TouchableOpacity onPress={() => openLink(item.product_url)} style={styles.cardSecondaryBtn}>
                <Ionicons name="open-outline" size={14} color="#666" />
                <Text style={styles.cardSecondaryText}>Bekijk</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => updateStatus(item.id, "bought")} style={styles.cardPrimaryBtn}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.cardPrimaryText}>Gekocht</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Grid card (preserved from earlier) ──────────────────────────────────
  const screenWidth = Dimensions.get("window").width;
  const GRID_GAP = 10;
  const GRID_PAD = 16;
  const GRID_COL_WIDTH = (screenWidth - GRID_PAD * 2 - GRID_GAP) / 2;

  const renderGridItem = ({ item }: { item: WishlistItem }) => (
    <TouchableOpacity
      style={[styles.gridCard, { width: GRID_COL_WIDTH }]}
      onPress={() => openEdit(item)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.image_url || "https://via.placeholder.com/600" }} style={styles.gridImg} />
      <TouchableOpacity style={styles.gridDeleteBtn} onPress={() => removeItem(item.id)}>
        <Ionicons name="close" size={14} color="#fff" />
      </TouchableOpacity>
      <View style={styles.gridInfo}>
        <Text style={styles.gridShop} numberOfLines={1}>
          {item.shop || (item.domain ?? "unknown").replace(/^www\./, "")}
        </Text>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.gridPriceRow}>
          <Text style={styles.gridPrice}>{item.price != null ? fmt(item.price) : "—"}</Text>
        </View>
        <View style={styles.gridActions}>
          {!!item.product_url && (
            <TouchableOpacity onPress={() => openLink(item.product_url)} style={styles.gridActionBtn}>
              <Ionicons name="open-outline" size={16} color="#666" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => openSaving(item)} style={styles.gridActionBtn}>
            <Ionicons name="wallet-outline" size={16} color={YELLOW} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => updateStatus(item.id, "bought")} style={styles.gridActionBtn}>
            <Ionicons name="checkmark-circle-outline" size={16} color={PURPLE} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Purple header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.brand}>
              UNI<Text style={{ color: YELLOW }}>CART</Text>
            </Text>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Ionicons name="person-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.welcomeLine}>
            Welcome back{firstName ? "," : ""}{" "}
            <Text style={{ color: YELLOW }}>{firstName || "👋"}</Text>{" "}
            {firstName ? "👋" : ""}
          </Text>
          <Text style={styles.welcomeSub}>
            Track prices. Save money. Reach your goals.
          </Text>
          <Text style={styles.headerEmoji}>🛍️</Text>
        </View>

        {/* Paste-link card */}
        <View style={styles.pasteWrap}>
          <View style={styles.pasteCard}>
            <Ionicons name="link-outline" size={16} color={PURPLE} style={{ marginLeft: 6, marginRight: 6 }} />
            <TextInput
              style={styles.pasteInput}
              placeholder="Plak een productlink van elke winkel..."
              placeholderTextColor="#B8B8B8"
              value={pasteUrl}
              onChangeText={setPasteUrl}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!adding}
              returnKeyType="go"
              onSubmitEditing={submitAdd}
            />
            <TouchableOpacity
              style={[styles.addBtn, adding && { opacity: 0.6 }]}
              onPress={submitAdd}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color={TEXT} size="small" />
              ) : (
                <>
                  <Ionicons name="add" size={16} color={TEXT} />
                  <Text style={styles.addBtnText}>Toevoegen</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.pasteHint}>
            Voorbeeld: bol.com, amazon.nl, nike.com, coolblue.nl
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            iconName="wallet-outline"
            iconColor={PURPLE}
            iconBg="rgba(108,59,255,0.12)"
            label="Totaal waarde"
            value={fmt(stats.totalValue)}
            sub="+ deze maand"
            subColor="#159B5C"
          />
          <StatCard
            iconName="locate-outline"
            iconColor="#B58400"
            iconBg="rgba(255,207,51,0.18)"
            label="Actieve doelen"
            value={String(stats.activeGoals)}
            sub="Blijf zo doorgaan!"
            subColor={PURPLE}
          />
          <StatCard
            iconName="bag-outline"
            iconColor={PURPLE}
            iconBg="rgba(108,59,255,0.12)"
            label="Producten"
            value={String(stats.totalItems)}
            sub="Over alle winkels"
            subColor={TEXT_SEC}
          />
        </View>

        {/* Section header */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Mijn producten</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Bekijk alles ›</Text>
          </TouchableOpacity>
        </View>

        {/* List/Grid + Filter */}
        <View style={styles.controlsRow}>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[styles.togglePill, viewMode === "list" && styles.togglePillActive]}
              onPress={() => setViewMode("list")}
            >
              <Ionicons name="list" size={14} color={viewMode === "list" ? PURPLE : TEXT_SEC} />
              <Text style={[styles.toggleText, viewMode === "list" && styles.toggleTextActive]}>Lijst</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.togglePill, viewMode === "grid" && styles.togglePillActive]}
              onPress={() => setViewMode("grid")}
            >
              <Ionicons name="grid" size={14} color={viewMode === "grid" ? PURPLE : TEXT_SEC} />
              <Text style={[styles.toggleText, viewMode === "grid" && styles.toggleTextActive]}>Grid</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
            <Ionicons name="filter-outline" size={14} color={TEXT_SEC} />
            <Text style={styles.filterText}>Filteren</Text>
            <Ionicons name="chevron-down" size={14} color={TEXT_SEC} />
          </TouchableOpacity>
        </View>

        {/* Items list */}
        {baseFiltered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-outline" size={32} color={PURPLE} />
            </View>
            <Text style={styles.emptyTitle}>Nog geen items</Text>
            <Text style={styles.emptySub}>Plak een productlink hierboven om te beginnen.</Text>
          </View>
        ) : sortMode === "none" ? (
          viewMode === "grid" ? (
            <FlatList
              key="grid"
              data={baseFiltered}
              keyExtractor={(it) => it.id}
              renderItem={renderGridItem}
              numColumns={2}
              columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: GRID_PAD }}
              contentContainerStyle={{ gap: GRID_GAP }}
              scrollEnabled={false}
            />
          ) : (
            <FlatList
              key="list"
              data={baseFiltered}
              keyExtractor={(it) => it.id}
              renderItem={renderListItem}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
              scrollEnabled={false}
            />
          )
        ) : (
          <SectionList
            sections={sections as any}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => renderListItem({ item })}
            renderSectionHeader={({ section }) => (
              <Text style={styles.groupHeader}>{section.title}</Text>
            )}
            stickySectionHeadersEnabled
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          />
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(tabs)/home")}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={TEXT} />
      </TouchableOpacity>

      {/* Filter sheet */}
      <WishlistFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        sortMode={sortMode}
        setSortMode={setSortMode}
        hideOther={hideOther}
        setHideOther={setHideOther}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        categoryOptions={CATEGORY_OPTIONS}
        onReset={() => {
          resetFilters();
          setFilterOpen(false);
        }}
      />

      {/* Saving modal */}
      <SavingModal
        visible={savingOpen}
        item={activeItem}
        targetPriceInput={targetPriceInput}
        setTargetPriceInput={setTargetPriceInput}
        onClose={closeSaving}
        onSaveTarget={saveTarget}
        onAddMoney={addMoney}
      />

      {/* Edit modal */}
      {editOpen && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%" }}
            >
              <View style={styles.modalCard}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>Bewerk product</Text>

                  <Text style={styles.modalLabel}>Titel</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFields.title}
                    onChangeText={(v) => setEditFields((p) => ({ ...p, title: v }))}
                    placeholder="Product titel"
                    returnKeyType="next"
                  />

                  <Text style={styles.modalLabel}>Prijs (€)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFields.price}
                    onChangeText={(v) => setEditFields((p) => ({ ...p, price: v }))}
                    placeholder="Bijv. 49,99"
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />

                  <Text style={styles.modalLabel}>Winkel</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFields.shop}
                    onChangeText={(v) => setEditFields((p) => ({ ...p, shop: v }))}
                    placeholder="Bijv. bol.com"
                    autoCapitalize="none"
                    returnKeyType="next"
                  />

                  <Text style={styles.modalLabel}>Afbeelding URL</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editFields.image_url}
                    onChangeText={(v) => setEditFields((p) => ({ ...p, image_url: v }))}
                    placeholder="https://..."
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={() => { Keyboard.dismiss(); saveEdit(); }}
                  />

                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={closeEdit}>
                      <Text style={styles.modalBtnGhostText}>Annuleren</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={() => { Keyboard.dismiss(); saveEdit(); }}>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.modalBtnPrimaryText}>Opslaan</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

function StatCard({
  iconName,
  iconColor,
  iconBg,
  label,
  value,
  sub,
  subColor,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
  subColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={16} color={iconColor} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statSub, { color: subColor }]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: PURPLE,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 50,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 24, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeLine: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 18,
  },
  welcomeSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    marginTop: 4,
  },
  headerEmoji: {
    position: "absolute",
    right: 24,
    bottom: 22,
    fontSize: 56,
  },

  pasteWrap: {
    paddingHorizontal: 16,
    marginTop: -28,
  },
  pasteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pasteInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT,
    paddingVertical: 10,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: YELLOW,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  addBtnText: { fontSize: 13, fontWeight: "900", color: TEXT },
  pasteHint: { fontSize: 11, color: TEXT_SEC, marginTop: 8, paddingLeft: 4 },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: { fontSize: 10, color: TEXT_SEC, fontWeight: "700" },
  statValue: { fontSize: 18, fontWeight: "900", color: TEXT, marginTop: 2, letterSpacing: -0.3 },
  statSub: { fontSize: 10, fontWeight: "700", marginTop: 4 },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: TEXT, letterSpacing: -0.3 },
  sectionLink: { fontSize: 13, color: PURPLE, fontWeight: "800" },

  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  toggleGroup: { flexDirection: "row", gap: 6 },
  togglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  togglePillActive: { backgroundColor: "rgba(108,59,255,0.10)" },
  toggleText: { fontSize: 12, fontWeight: "800", color: TEXT_SEC },
  toggleTextActive: { color: PURPLE },

  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  filterText: { fontSize: 12, fontWeight: "800", color: TEXT_SEC },

  empty: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: "rgba(108,59,255,0.08)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: TEXT, marginBottom: 4 },
  emptySub: { fontSize: 13, color: TEXT_SEC, textAlign: "center" },

  groupHeader: {
    fontSize: 13,
    fontWeight: "900",
    color: TEXT_SEC,
    paddingVertical: 8,
    backgroundColor: BG,
  },

  // List card
  listCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    gap: 12,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  listImg: { width: 86, height: 86, borderRadius: 12, backgroundColor: "#F2F0F8" },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  listTitle: { flex: 1, fontSize: 14, fontWeight: "900", color: TEXT, paddingRight: 8 },
  shopRow: { flexDirection: "row", alignItems: "center", marginTop: 1 },
  shopText: { fontSize: 11, color: TEXT_SEC },
  listPrice: { fontSize: 16, fontWeight: "900", color: PURPLE, marginTop: 4 },

  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  goalLabel: { fontSize: 11, color: TEXT_SEC, fontWeight: "700" },
  pctBadge: {
    backgroundColor: "rgba(108,59,255,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pctText: { fontSize: 10, fontWeight: "900", color: PURPLE },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(108,59,255,0.10)",
    marginTop: 6,
    marginBottom: 6,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: YELLOW, borderRadius: 3 },
  goalSub: { fontSize: 11, color: TEXT_SEC, fontWeight: "600" },

  setGoalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(108,59,255,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  setGoalText: { fontSize: 11, fontWeight: "800", color: PURPLE },

  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  iconBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "rgba(108,59,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  cardSecondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  cardSecondaryText: { fontSize: 12, fontWeight: "600", color: "#444" },
  cardPrimaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: "#6C3BFF",
  },
  cardPrimaryText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  // Grid card
  gridCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  gridImg: { width: "100%", height: 160, backgroundColor: "#F5F3FA" },
  gridDeleteBtn: {
    position: "absolute",
    top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
  gridInfo: { padding: 10 },
  gridShop: { fontSize: 11, fontWeight: "800", color: PURPLE, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  gridTitle: { fontSize: 13, fontWeight: "700", color: TEXT, lineHeight: 17, marginBottom: 4 },
  gridPriceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  gridPrice: { fontSize: 15, fontWeight: "900", color: TEXT },
  gridActions: { flexDirection: "row", alignItems: "center", gap: 4, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)", paddingTop: 8 },
  gridActionBtn: { flex: 1, alignItems: "center", paddingVertical: 4 },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 84,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: YELLOW,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  // Edit modal
  modalOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: TEXT, marginBottom: 14, textAlign: "center" },
  modalLabel: { fontSize: 12, fontWeight: "800", color: "#666", marginTop: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: "#F6F6F8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalBtn: { flex: 1, borderRadius: 999, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  modalBtnGhost: { backgroundColor: "#F2F2F4", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  modalBtnGhostText: { fontWeight: "800", color: "#666", fontSize: 15 },
  modalBtnPrimary: { backgroundColor: PURPLE },
  modalBtnPrimaryText: { fontWeight: "800", color: "#fff", fontSize: 15 },
});
