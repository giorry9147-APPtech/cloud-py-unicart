// app/(tabs)/stats.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { LineChart, PieChart } from "react-native-gifted-charts";

import { auth, db } from "../../lib/firebaseConfig";

const PURPLE = "#6C3BFF";
const YELLOW = "#FFCF33";
const BG = "#F9F5FF";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#8E8E93";

const CATEGORY_COLORS = ["#6C3BFF", "#FFCF33", "#FF4F8B", "#5BB7FF", "#3DDC84"];

function prettyCategoryLabel(key: string): string {
  const map: Record<string, string> = {
    electronics: "Elektronica",
    tshirt: "T-shirts",
    broek: "Broeken",
    hoodie: "Hoodies",
    shoes: "Schoenen",
    jacket: "Jassen",
    accessory: "Accessoires",
    other: "Overig",
  };
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

type StatsItem = {
  id: string;
  status: "todo" | "saved" | "bought";
  price: number | null;
  targetPrice: number | null;
  virtualSaved: number | null;
  category: string | null;
  boughtPrice: number | null;
  createdAt: Date | null;
};

type Period = "overview" | "7d" | "30d" | "12m";

export default function StatsScreen() {
  const [items, setItems] = useState<StatsItem[]>([]);
  const [period, setPeriod] = useState<Period>("overview");

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
          const list: StatsItem[] = snap.docs.map((d) => {
            const data = d.data() as any;
            const created =
              typeof data?.createdAt?.toDate === "function"
                ? data.createdAt.toDate()
                : null;
            return {
              id: d.id,
              status: (data.status || "todo") as StatsItem["status"],
              price: data.price ?? null,
              targetPrice: data.targetPrice ?? null,
              virtualSaved: data.virtualSaved ?? 0,
              category: data.category ?? "other",
              boughtPrice: data.boughtPrice ?? null,
              createdAt: created,
            };
          });
          setItems(list);
        },
        (err) => console.log("[stats] snapshot error", err)
      );
      return unsub;
    }, [])
  );

  const totals = useMemo(() => {
    const totalValue = items.reduce((s, i) => s + (i.price ?? 0), 0);
    const totalSaved = items.reduce((s, i) => s + (i.virtualSaved ?? 0), 0);
    const purchases = items.filter((i) => i.status === "bought").length;
    const withTarget = items.filter(
      (i) => i.targetPrice != null && i.price != null
    );
    const avgDiscount = withTarget.length
      ? withTarget.reduce((s, i) => s + Math.max(0, (i.price ?? 0) - (i.targetPrice ?? 0)), 0) /
        withTarget.length
      : 0;

    // Goals status breakdown
    const itemsWithGoals = items.filter((i) => i.targetPrice != null);
    const reached = itemsWithGoals.filter(
      (i) => i.status === "bought" || (i.virtualSaved ?? 0) >= (i.targetPrice ?? 0)
    ).length;
    const onTrack = itemsWithGoals.filter(
      (i) =>
        i.status !== "bought" &&
        (i.targetPrice ?? 0) > 0 &&
        (i.virtualSaved ?? 0) / (i.targetPrice ?? 1) >= 0.5 &&
        (i.virtualSaved ?? 0) < (i.targetPrice ?? 0)
    ).length;
    const almost = itemsWithGoals.filter(
      (i) =>
        i.status !== "bought" &&
        (i.targetPrice ?? 0) > 0 &&
        (i.virtualSaved ?? 0) / (i.targetPrice ?? 1) >= 0.8 &&
        (i.virtualSaved ?? 0) < (i.targetPrice ?? 0)
    ).length;
    const behind = itemsWithGoals.length - reached - onTrack - almost;

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const i of items) {
      const cat = (i.category ?? "other") || "other";
      catMap.set(cat, (catMap.get(cat) ?? 0) + (i.price ?? 0));
    }
    const cats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

    // Monthly cumulative savings — last 6 months ending this month.
    // Approximation: at end of each month, sum virtualSaved of items created
    // on or before that month. This gives a "growing over time" curve until
    // we track real savings history.
    const now = new Date();
    const months: { label: string; value: number }[] = [];
    const monthLabels = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0); // last day of that month
      const cutoff = d.getTime();
      const cumSaved = items
        .filter((i) => i.createdAt && i.createdAt.getTime() <= cutoff)
        .reduce((s, i) => s + (i.virtualSaved ?? 0), 0);
      months.push({
        label: monthLabels[d.getMonth()],
        value: Math.round(cumSaved * 100) / 100,
      });
    }

    return {
      totalValue,
      totalSaved,
      avgDiscount,
      purchases,
      reached,
      onTrack,
      almost,
      behind,
      categories: cats,
      monthly: months,
    };
  }, [items]);

  const fmt = (n: number) =>
    `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const PERIODS: { key: Period; label: string }[] = [
    { key: "overview", label: "Overzicht" },
    { key: "7d", label: "7 dagen" },
    { key: "30d", label: "30 dagen" },
    { key: "12m", label: "12 maanden" },
  ];

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
        <Text style={styles.headerTitle}>Mijn stats</Text>
        <Text style={styles.headerSub}>Jouw overzicht, jouw progressie.</Text>
        <Text style={styles.headerEmoji}>📊</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Period tabs */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPeriod(p.key)}
                style={[styles.periodPill, active && styles.periodPillActive]}
              >
                <Text style={[styles.periodText, active && styles.periodTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Totaal overzicht</Text>

        <View style={styles.statsGrid}>
          <StatTile
            icon="wallet-outline"
            iconBg="rgba(108,59,255,0.12)"
            iconColor={PURPLE}
            label="Totale waarde"
            value={fmt(totals.totalValue)}
            sub="vs vorige maand"
          />
          <StatTile
            icon="locate-outline"
            iconBg="rgba(255,207,51,0.18)"
            iconColor="#B58400"
            label="Totaal gespaard"
            value={fmt(totals.totalSaved)}
            sub="vs vorige maand"
          />
          <StatTile
            icon="trending-down-outline"
            iconBg="rgba(108,59,255,0.12)"
            iconColor={PURPLE}
            label="Gem. doel korting"
            value={fmt(totals.avgDiscount)}
            sub="vs vorige maand"
          />
          <StatTile
            icon="bag-check-outline"
            iconBg="rgba(255,207,51,0.18)"
            iconColor="#B58400"
            label="Aankopen gedaan"
            value={String(totals.purchases)}
            sub="vs vorige maand"
          />
        </View>

        {/* Savings line chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Besparingen over tijd</Text>
            <View style={styles.chartDropdown}>
              <Text style={styles.chartDropdownText}>6 maanden</Text>
              <Ionicons name="chevron-down" size={14} color={TEXT_SEC} />
            </View>
          </View>

          {totals.monthly.every((m) => m.value === 0) ? (
            <View style={styles.chartEmpty}>
              <Ionicons name="trending-up-outline" size={32} color={PURPLE} />
              <Text style={styles.placeholderText}>Nog geen besparingen</Text>
              <Text style={styles.placeholderSub}>
                Stel doelprijzen in en spaar virtueel om je voortgang te zien.
              </Text>
            </View>
          ) : (
            <LineChart
              data={totals.monthly.map((m) => ({
                value: m.value,
                label: m.label,
                dataPointText: m.value > 0 ? fmt(m.value) : "",
              }))}
              areaChart
              curved
              width={Dimensions.get("window").width - 80}
              height={180}
              hideRules
              hideYAxisText
              xAxisColor="rgba(0,0,0,0.06)"
              yAxisColor="transparent"
              color={PURPLE}
              startFillColor={PURPLE}
              endFillColor={PURPLE}
              startOpacity={0.25}
              endOpacity={0.02}
              dataPointsColor={PURPLE}
              dataPointsRadius={4}
              textColor1={PURPLE}
              textShiftY={-6}
              textShiftX={-6}
              textFontSize={10}
              xAxisLabelTextStyle={{ color: TEXT_SEC, fontSize: 10 }}
              initialSpacing={10}
              spacing={(Dimensions.get("window").width - 100) / 5}
              noOfSections={4}
            />
          )}
        </View>

        {/* Donuts row */}
        <View style={styles.donutRow}>
          <View style={styles.donutCard}>
            <Text style={styles.donutTitle}>Categorieën</Text>
            {totals.categories.length === 0 ? (
              <View style={styles.donutEmpty}>
                <Text style={styles.placeholderSub}>Nog geen items</Text>
              </View>
            ) : (
              <View style={{ alignItems: "center", marginBottom: 14 }}>
                <PieChart
                  donut
                  radius={56}
                  innerRadius={36}
                  data={totals.categories.slice(0, 4).map(([cat, val], idx) => ({
                    value: val,
                    color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                  }))}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: "center" }}>
                      <Text style={styles.donutCenterValue}>{fmt(totals.totalValue)}</Text>
                      <Text style={styles.donutCenterLabel}>Totaal</Text>
                    </View>
                  )}
                />
              </View>
            )}
            {totals.categories.slice(0, 4).map(([cat, val], idx) => (
              <View key={cat} style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] },
                  ]}
                />
                <Text style={styles.legendLabel}>{prettyCategoryLabel(cat)}</Text>
                <Text style={styles.legendValue}>{fmt(val)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.donutCard}>
            <Text style={styles.donutTitle}>Doelen status</Text>
            {(() => {
              const total =
                totals.reached + totals.onTrack + totals.almost + totals.behind;
              if (total === 0) {
                return (
                  <View style={styles.donutEmpty}>
                    <Text style={styles.placeholderSub}>Nog geen doelen</Text>
                  </View>
                );
              }
              return (
                <View style={{ alignItems: "center", marginBottom: 14 }}>
                  <PieChart
                    donut
                    radius={56}
                    innerRadius={36}
                    data={[
                      { value: totals.onTrack, color: "#3DDC84" },
                      { value: totals.almost, color: YELLOW },
                      { value: totals.behind, color: PURPLE },
                      { value: totals.reached, color: "#999" },
                    ].filter((d) => d.value > 0)}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: "center" }}>
                        <Text style={styles.donutCenterValue}>{total}</Text>
                        <Text style={styles.donutCenterLabel}>Doelen</Text>
                      </View>
                    )}
                  />
                </View>
              );
            })()}
            <LegendRow color="#3DDC84" label="Op schema" value={totals.onTrack} pct={null} />
            <LegendRow color={YELLOW} label="Bijna klaar" value={totals.almost} pct={null} />
            <LegendRow color={PURPLE} label="Achter schema" value={totals.behind} pct={null} />
            <LegendRow color="#999" label="Behaald" value={totals.reached} pct={null} />
          </View>
        </View>

        {/* Personal insight */}
        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Ionicons name="trending-up-outline" size={20} color={PURPLE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Persoonlijke inzichten</Text>
            <Text style={styles.insightBody}>
              Je hebt deze maand{" "}
              <Text style={{ color: PURPLE, fontWeight: "900" }}>{fmt(totals.totalSaved)}</Text>{" "}
              gespaard.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={TEXT_SEC} />
        </View>
      </ScrollView>
    </View>
  );
}

function StatTile({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </View>
  );
}

function LegendRow({
  color,
  label,
  value,
  pct,
}: {
  color: string;
  label: string;
  value: number;
  pct: number | null;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}{pct != null ? ` (${pct}%)` : ""}</Text>
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

  periodRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  periodPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#fff",
    flex: 1,
    alignItems: "center",
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  periodPillActive: { backgroundColor: PURPLE },
  periodText: { fontSize: 12, fontWeight: "800", color: TEXT_SEC },
  periodTextActive: { color: "#fff" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT,
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  statTile: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tileLabel: { fontSize: 11, color: TEXT_SEC, fontWeight: "600" },
  tileValue: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  tileSub: { fontSize: 10, color: TEXT_SEC, marginTop: 4 },

  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chartTitle: { fontSize: 14, fontWeight: "900", color: TEXT },
  chartDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F5F5F7",
  },
  chartDropdownText: { fontSize: 12, color: TEXT_SEC, fontWeight: "700" },
  chartEmpty: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 24,
  },
  placeholderText: { fontSize: 13, color: TEXT, fontWeight: "800" },
  placeholderSub: { fontSize: 11, color: TEXT_SEC, textAlign: "center" },

  donutRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 14,
  },
  donutCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  donutTitle: { fontSize: 13, fontWeight: "900", color: TEXT, marginBottom: 12 },
  donutEmpty: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  donutCenterValue: { fontSize: 13, fontWeight: "900", color: TEXT },
  donutCenterLabel: { fontSize: 10, color: TEXT_SEC, marginTop: 2 },

  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendLabel: { flex: 1, fontSize: 11, color: TEXT, fontWeight: "700" },
  legendValue: { fontSize: 11, color: TEXT_SEC, fontWeight: "700" },

  insightCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    alignItems: "center",
    gap: 12,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(108,59,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: { fontSize: 13, fontWeight: "900", color: TEXT },
  insightBody: { fontSize: 12, color: TEXT_SEC, marginTop: 2, lineHeight: 17 },
});
