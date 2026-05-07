// app/(tabs)/profile.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  collection,
  query,
  onSnapshot,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

import { auth, db } from "../../lib/firebaseConfig";

const PURPLE = "#6C3BFF";
const YELLOW = "#FFCF33";
const BG = "#F9F5FF";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#8E8E93";

type Stat = {
  totalItems: number;
  activeGoals: number;
  totalSaved: number;
  dealsThisMonth: number;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stat>({
    totalItems: 0,
    activeGoals: 0,
    totalSaved: 0,
    dealsThisMonth: 0,
  });

  const user = auth.currentUser;
  const displayName = user?.displayName || (user?.email ? user.email.split("@")[0] : "Jij");
  const email = user?.email ?? "—";
  const memberSince = useMemo(() => {
    if (!user?.metadata?.creationTime) return "—";
    const d = new Date(user.metadata.creationTime);
    return d.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      const u = auth.currentUser;
      if (!u) return () => {};

      const colRef = collection(db, "users", u.uid, "wishlist_items");
      const q = query(colRef);
      const unsub = onSnapshot(
        q,
        (snap) => {
          let totalItems = 0;
          let activeGoals = 0;
          let totalSaved = 0;
          let dealsThisMonth = 0;
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);

          snap.docs.forEach((d) => {
            const data = d.data() as any;
            totalItems += 1;
            if (
              data.targetPrice != null &&
              data.status !== "bought" &&
              (data.virtualSaved ?? 0) < (data.targetPrice ?? 0)
            ) {
              activeGoals += 1;
            }
            totalSaved += data.virtualSaved ?? 0;

            const created = data.createdAt?.toDate?.() ?? null;
            if (created && created >= monthStart) dealsThisMonth += 1;
          });

          setStats({ totalItems, activeGoals, totalSaved, dealsThisMonth });
        },
        (err) => console.log("[profile] snapshot error", err)
      );
      return unsub;
    }, [])
  );

  const onLogout = async () => {
    Alert.alert("Uitloggen?", "Weet je zeker dat je wilt uitloggen?", [
      { text: "Annuleren", style: "cancel" },
      {
        text: "Uitloggen",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace("/login");
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Uitloggen mislukt");
          }
        },
      },
    ]);
  };

  const fmt = (n: number) =>
    `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const initial = (displayName || "U").charAt(0).toUpperCase();

  const ROWS: {
    key: string;
    label: string;
    sub: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
    danger?: boolean;
  }[] = [
    { key: "personal", label: "Persoonlijke gegevens", sub: "Beheer je naam, e-mail en wachtwoord", icon: "person-outline" },
    { key: "billing", label: "Betaalmethoden", sub: "Beheer je betaalmethoden en facturen", icon: "card-outline" },
    { key: "notifications", label: "Notifications", sub: "Stel je meldingen en voorkeuren in", icon: "notifications-outline" },
    { key: "privacy", label: "Privacy & beveiliging", sub: "Beheer je privacy en beveiligingsinstellingen", icon: "shield-checkmark-outline" },
    { key: "language", label: "Taal", sub: "Nederlands", icon: "globe-outline" },
    { key: "help", label: "Help & support", sub: "Veelgestelde vragen en contact", icon: "help-circle-outline" },
    { key: "logout", label: "Uitloggen", sub: "Log uit van je account", icon: "log-out-outline", onPress: onLogout, danger: true },
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
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.headerIconBtn}>
              <Ionicons name="notifications-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn}>
              <Ionicons name="settings-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        style={{ marginTop: -30 }}
      >
        {/* Avatar block */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
            <TouchableOpacity style={styles.avatarEdit}>
              <Ionicons name="pencil" size={12} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.name}>{displayName}</Text>
              <Ionicons name="checkmark-circle" size={18} color={YELLOW} />
            </View>
            <Text style={styles.email}>{email}</Text>
            <View style={styles.premiumPill}>
              <Ionicons name="ribbon-outline" size={12} color={YELLOW} />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          </View>
        </View>

        {/* Member-info card */}
        <View style={styles.memberCard}>
          <View style={styles.memberCol}>
            <View style={styles.memberIcon}>
              <Ionicons name="calendar-outline" size={18} color={PURPLE} />
            </View>
            <View>
              <Text style={styles.memberLabel}>Lid sinds</Text>
              <Text style={styles.memberValue}>{memberSince}</Text>
              <Text style={styles.memberSub}>Welkom!</Text>
            </View>
          </View>
          <View style={styles.memberDivider} />
          <View style={styles.memberCol}>
            <View style={styles.memberIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={PURPLE} />
            </View>
            <View>
              <Text style={styles.memberLabel}>Account status</Text>
              <Text style={[styles.memberValue, { color: "#159B5C" }]}>Verifieerd</Text>
              <Text style={styles.memberSub}>Je account is veilig</Text>
            </View>
          </View>
        </View>

        {/* Overview stats */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Jouw overzicht</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/stats")}>
              <Text style={styles.overviewLink}>Bekijk alle stats →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.overviewGrid}>
            <OverviewTile
              icon="bag-outline"
              iconColor={PURPLE}
              iconBg="rgba(108,59,255,0.10)"
              label="Producten"
              value={String(stats.totalItems)}
              sub="Opgeslagen"
            />
            <OverviewTile
              icon="locate-outline"
              iconColor="#B58400"
              iconBg="rgba(255,207,51,0.18)"
              label="Actieve doelen"
              value={String(stats.activeGoals)}
              sub="Doorgaan! 💪"
            />
            <OverviewTile
              icon="wallet-outline"
              iconColor={PURPLE}
              iconBg="rgba(108,59,255,0.10)"
              label="Totaal gespaard"
              value={fmt(stats.totalSaved)}
              sub="Goed bezig! 🎉"
            />
            <OverviewTile
              icon="pricetag-outline"
              iconColor="#B58400"
              iconBg="rgba(255,207,51,0.18)"
              label="Deals deze maand"
              value={String(stats.dealsThisMonth)}
              sub="Toegevoegd"
            />
          </View>
        </View>

        {/* Premium upsell */}
        <View style={styles.premiumCard}>
          <View style={styles.premiumIconWrap}>
            <Ionicons name="ribbon" size={22} color={YELLOW} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumTitle}>Unicart Premium</Text>
            <Text style={styles.premiumSub}>Haal het maximale uit Unicart.</Text>
          </View>
          <TouchableOpacity style={styles.premiumBtn}>
            <Text style={styles.premiumBtnText}>Bekijk voordelen</Text>
          </TouchableOpacity>
        </View>

        {/* Settings list */}
        <View style={styles.settingsCard}>
          {ROWS.map((row, idx) => (
            <TouchableOpacity
              key={row.key}
              style={[styles.settingsRow, idx > 0 && styles.settingsBorder]}
              onPress={row.onPress ?? (() => {})}
              activeOpacity={0.6}
            >
              <View
                style={[
                  styles.settingsIcon,
                  row.danger && { backgroundColor: "rgba(255,80,80,0.10)" },
                ]}
              >
                <Ionicons
                  name={row.icon}
                  size={18}
                  color={row.danger ? "#E04444" : PURPLE}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsLabel, row.danger && { color: "#E04444" }]}>
                  {row.label}
                </Text>
                <Text style={styles.settingsSub}>{row.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function OverviewTile({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.overviewTile}>
      <View style={[styles.overviewIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={styles.overviewValue}>{value}</Text>
      <Text style={styles.overviewSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: PURPLE,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 56,
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

  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  avatarLetter: { color: "#fff", fontSize: 36, fontWeight: "900" },
  avatarEdit: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  name: { fontSize: 22, fontWeight: "900", color: TEXT },
  email: { fontSize: 13, color: TEXT_SEC, marginTop: 2 },
  premiumPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,207,51,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  premiumText: { fontSize: 11, fontWeight: "900", color: "#B58400" },

  memberCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  memberCol: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  memberIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(108,59,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  memberLabel: { fontSize: 11, color: TEXT_SEC, fontWeight: "600" },
  memberValue: { fontSize: 14, color: TEXT, fontWeight: "900", marginTop: 2 },
  memberSub: { fontSize: 10, color: TEXT_SEC, marginTop: 2 },
  memberDivider: { width: 1, backgroundColor: "rgba(0,0,0,0.06)" },

  overviewCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  overviewTitle: { fontSize: 14, fontWeight: "900", color: TEXT },
  overviewLink: { fontSize: 12, color: PURPLE, fontWeight: "800" },
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  overviewTile: { width: "47.5%", paddingVertical: 8 },
  overviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  overviewLabel: { fontSize: 11, color: TEXT_SEC, fontWeight: "600" },
  overviewValue: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  overviewSub: { fontSize: 10, color: TEXT_SEC, marginTop: 2 },

  premiumCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PURPLE,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  premiumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,207,51,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumTitle: { color: "#fff", fontSize: 14, fontWeight: "900" },
  premiumSub: { color: "rgba(255,255,255,0.78)", fontSize: 11, marginTop: 2 },
  premiumBtn: {
    backgroundColor: YELLOW,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  premiumBtnText: { color: "#1A1A1A", fontSize: 12, fontWeight: "900" },

  settingsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  settingsBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(108,59,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: { fontSize: 14, fontWeight: "800", color: TEXT },
  settingsSub: { fontSize: 11, color: TEXT_SEC, marginTop: 1 },
});
