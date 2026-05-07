import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PURPLE = "#6C3BFF";

export default function FriendsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <View style={styles.iconWrap}>
          <Ionicons name="people" size={40} color={PURPLE} />
        </View>
        <Text style={styles.title}>Vrienden</Text>
        <Text style={styles.subtitle}>
          Binnenkort kun je wishlists delen met vrienden en zien wat zij op hun lijstje hebben.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, backgroundColor: "#F9F5FF", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingBottom: 60 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(108,59,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "900", color: "#111", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20 },
});
