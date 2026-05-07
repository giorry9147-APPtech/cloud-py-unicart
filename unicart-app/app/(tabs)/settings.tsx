import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { auth } from "../../lib/firebaseConfig";
import { signOut } from "firebase/auth";


import { getLanguage, Lang } from "../../constants/language";

const PURPLE = "#6C3BFF";
const BG = "#F9F5FF";
const TEXT_DARK = "#1A1A1A";

const texts = {
  nl: {
    title: "Instellingen",
    logout: "Uitloggen",
    confirmTitle: "Uitloggen?",
    confirmBody: "Weet je zeker dat je wilt uitloggen?",
    cancel: "Annuleren",
    yes: "Ja, uitloggen",
    done: "Je bent uitgelogd.",
    failed: "Uitloggen mislukt.",
  },
  en: {
    title: "Settings",
    logout: "Log out",
    confirmTitle: "Log out?",
    confirmBody: "Are you sure you want to log out?",
    cancel: "Cancel",
    yes: "Yes, log out",
    done: "You are logged out.",
    failed: "Logout failed.",
  },
};

export default function SettingsScreen() {
  const router = useRouter();
  const [lang] = useState<Lang>(getLanguage());
  const t = useMemo(() => (lang === "nl" ? texts.nl : texts.en), [lang]);

  const [busy, setBusy] = useState(false);

  const doLogout = async () => {
    try {
      setBusy(true);

      // 1) Firebase logout
      await signOut(auth);

      
      Alert.alert("✅", t.done);

      // Terug naar login (pas aan als jouw route anders is)
      router.replace("/login");
    } catch (err) {
      console.log("Logout error", err);
      Alert.alert("❌", t.failed);
    } finally {
      setBusy(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(t.confirmTitle, t.confirmBody, [
      { text: t.cancel, style: "cancel" },
      { text: t.yes, style: "destructive", onPress: doLogout },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.title}</Text>
      </View>

      <TouchableOpacity
        style={[styles.card, busy && { opacity: 0.7 }]}
        onPress={confirmLogout}
        disabled={busy}
      >
        <Ionicons name="log-out-outline" size={22} color={PURPLE} />
        <Text style={styles.cardText}>{t.logout}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "900", color: TEXT_DARK, letterSpacing: -0.5 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardText: { fontSize: 16, fontWeight: "700", color: TEXT_DARK },
});

