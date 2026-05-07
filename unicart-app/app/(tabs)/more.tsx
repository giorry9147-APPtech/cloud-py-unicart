import React from "react";
import { View, Text, StyleSheet, SectionList, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const PURPLE = "#6C3BFF";
const BG = "#F9F5FF";
const TEXT = "#111";

type Row = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/(tabs)/saved" | "/(tabs)/bought" | "/(tabs)/settings"; // ✅ typed routes
};

const sections: { title: string; data: Row[] }[] = [
  {
    title: "My UniCart",
    data: [
      { title: "Gespaard", icon: "wallet-outline", route: "/(tabs)/saved" },
      { title: "Gekocht", icon: "bag-check-outline", route: "/(tabs)/bought" },
    ],
  },
  {
    title: "Instellingen & meer",
    data: [{ title: "Instellingen", icon: "settings-outline", route: "/(tabs)/settings" }],
  },
];

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.topTitle}>More</Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.title}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.replace(item.route)} // ✅ now typed, no TS error
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          >
            <View style={styles.left}>
              <Ionicons name={item.icon} size={22} color={PURPLE} />
              <Text style={styles.rowText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingTop: 52 },
  topTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: TEXT,
    paddingHorizontal: 18,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 18,
    fontSize: 11,
    fontWeight: "800",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 14 },
  rowText: { fontSize: 16, fontWeight: "700", color: TEXT },
  sep: { height: 1, backgroundColor: "rgba(0,0,0,0.04)", marginLeft: 54 },
});
