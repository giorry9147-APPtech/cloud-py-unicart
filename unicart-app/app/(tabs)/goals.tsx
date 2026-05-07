// app/(tabs)/goals.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../../lib/firebaseConfig";

const PURPLE = "#6C3BFF";
const YELLOW = "#FFCF33";
const BG = "#F9F5FF";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#8E8E93";

type GoalItem = {
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

type FilterMode = "active" | "completed" | "archived";

export default function GoalsScreen() {
  const [items, setItems] = useState<GoalItem[]>([]);
  const [filter, setFilter] = useState<FilterMode>("active");

  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (!user) {
        setItems([]);
        return () => {};
      }

      const colRef = collection(db, "users", user.uid, "wishlist_items");
      const q = query(colRef, orderBy("createdAt", "desc"));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: GoalItem[] = snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              title: String(data.title ?? ""),
              shop: String(data.shop ?? ""),
              product_url: data.product_url,
              image_url: data.image_url,
              price: data.price ?? null,
              status: (data.status || "todo") as GoalItem["status"],
              targetPrice: data.targetPrice ?? null,
              virtualSaved: data.virtualSaved ?? 0,
            };
          });
          setItems(list);
        },
        (err) => console.log("[goals] snapshot error", err)
      );

      return unsub;
    }, [])
  );

  const itemsWithGoals = useMemo(
    () => items.filter((i) => i.targetPrice != null && Number.isFinite(i.targetPrice)),
    [items]
  );

  const active = useMemo(
    () =>
      itemsWithGoals.filter(
        (i) =>
          i.status !== "bought" &&
          (i.virtualSaved ?? 0) < (i.targetPrice ?? 0)
      ),
    [itemsWithGoals]
  );

  const completed = useMemo(
    () =>
      itemsWithGoals.filter(
        (i) =>
          i.status === "bought" ||
          (i.virtualSaved ?? 0) >= (i.targetPrice ?? 0)
      ),
    [itemsWithGoals]
  );

  const totalSaved = useMemo(
    () => active.reduce((sum, i) => sum + (i.virtualSaved ?? 0), 0),
    [active]
  );
  const totalRemaining = useMemo(
    () =>
      active.reduce(
        (sum, i) => sum + Math.max(0, (i.targetPrice ?? 0) - (i.virtualSaved ?? 0)),
        0
      ),
    [active]
  );

  const visible: GoalItem[] = useMemo(() => {
    if (filter === "active") return active;
    if (filter === "completed") return completed;
    return [];
  }, [filter, active, completed]);

  const fmt = (n: number) =>
    `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderItem = ({ item }: { item: GoalItem }) => {
    const target = item.targetPrice ?? 0;
    const saved = item.virtualSaved ?? 0;
    const remaining = Math.max(0, target - saved);
    const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

    return (
      <View style={styles.goalCard}>
        <Image
          source={{ uri: item.image_url || "https://via.placeholder.com/200" }}
          style={styles.goalImg}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.goalRow}>
            <Text style={styles.goalTitle} numberOfLines={1}>
              {item.title || "Onbekend product"}
            </Text>
            <TouchableOpacity hitSlop={10}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#999" />
            </TouchableOpacity>
          </View>
          <Text style={styles.goalSub}>Doel: {fmt(target)}</Text>
          <Text style={styles.goalSaved}>{fmt(saved)} gespaard</Text>

          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalRemaining}>{fmt(remaining)} te gaan</Text>
            <View style={styles.pctBadge}>
              <Text style={styles.pctText}>{pct}%</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Purple header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.brand}>
            UNI<Text style={{ color: YELLOW }}>CART</Text>
          </Text>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Mijn doelen</Text>
        <Text style={styles.headerSub}>Bespaar slim. Bereik meer.</Text>
        <Text style={styles.headerEmoji}>🎯</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stat cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(108,59,255,0.12)" }]}>
              <Ionicons name="locate-outline" size={16} color={PURPLE} />
            </View>
            <Text style={styles.statLabel}>Actieve doelen</Text>
            <Text style={styles.statValue}>{active.length}</Text>
            <Text style={[styles.statSub, { color: PURPLE }]}>Doorgaan! 💪</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(255,207,51,0.18)" }]}>
              <Ionicons name="wallet-outline" size={16} color="#B58400" />
            </View>
            <Text style={styles.statLabel}>Totaal gespaard</Text>
            <Text style={styles.statValueSm}>{fmt(totalSaved)}</Text>
            <Text style={[styles.statSub, { color: "#159B5C" }]}>+ deze maand</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(108,59,255,0.12)" }]}>
              <Ionicons name="time-outline" size={16} color={PURPLE} />
            </View>
            <Text style={styles.statLabel}>Nog te gaan</Text>
            <Text style={styles.statValueSm}>{fmt(totalRemaining)}</Text>
            <Text style={[styles.statSub, { color: PURPLE }]}>Bijna daar! 🔥</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(255,207,51,0.18)" }]}>
              <Ionicons name="star-outline" size={16} color="#B58400" />
            </View>
            <Text style={styles.statLabel}>Voltooid</Text>
            <Text style={styles.statValue}>{completed.length}</Text>
            <TouchableOpacity onPress={() => setFilter("completed")}>
              <Text style={[styles.statSub, { color: PURPLE }]}>Bekijk ze →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={styles.tabRow}>
          {(["active", "completed", "archived"] as const).map((f) => {
            const label =
              f === "active" ? "Actief" : f === "completed" ? "Voltooid" : "Gearchiveerd";
            const isActive = f === filter;
            return (
              <TouchableOpacity
                key={f}
                style={styles.tab}
                onPress={() => setFilter(f)}
                hitSlop={6}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {label}
                </Text>
                {isActive ? <View style={styles.tabUnderline} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {visible.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="locate-outline" size={32} color={PURPLE} />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === "active"
                ? "Nog geen actieve doelen"
                : filter === "completed"
                ? "Nog niets voltooid"
                : "Niets gearchiveerd"}
            </Text>
            <Text style={styles.emptySub}>
              {filter === "active"
                ? "Stel een doelprijs in op een product in je wishlist."
                : "Spaar door en behaal je eerste doel!"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: PURPLE,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 36,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: "hidden",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 18,
    letterSpacing: -0.5,
  },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 4 },
  headerEmoji: {
    position: "absolute",
    right: 28,
    bottom: 28,
    fontSize: 56,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
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
  statLabel: { fontSize: 11, color: TEXT_SEC, fontWeight: "600" },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: TEXT,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  statValueSm: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  statSub: { fontSize: 11, fontWeight: "700", marginTop: 4 },

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    gap: 18,
    alignItems: "center",
  },
  tab: { paddingVertical: 8 },
  tabText: { fontSize: 14, fontWeight: "700", color: TEXT_SEC },
  tabTextActive: { color: PURPLE },
  tabUnderline: {
    height: 2,
    backgroundColor: PURPLE,
    borderRadius: 1,
    marginTop: 6,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(108,59,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: TEXT, marginBottom: 4 },
  emptySub: { fontSize: 13, color: TEXT_SEC, textAlign: "center", lineHeight: 18 },

  goalCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  goalImg: { width: 70, height: 70, borderRadius: 12, backgroundColor: "#F2F0F8" },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: TEXT },
  goalSub: { fontSize: 11, color: TEXT_SEC, marginTop: 2 },
  goalSaved: { fontSize: 11, color: "#159B5C", fontWeight: "700", marginTop: 2 },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(108,59,255,0.10)",
    marginTop: 8,
    marginBottom: 6,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: YELLOW, borderRadius: 3 },
  goalRemaining: { fontSize: 11, color: TEXT_SEC, fontWeight: "600" },
  pctBadge: {
    backgroundColor: "rgba(108,59,255,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pctText: { fontSize: 11, fontWeight: "900", color: PURPLE },
});
