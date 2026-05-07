// components/wishlistFiltered.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { auth, db } from "../lib/firebaseConfig";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

// ✅ fallback meta (voor oude items zonder domain/category)
import { getDomainFromUrl, guessCategory } from "../lib/itemMeta";

type Mode = "saved" | "bought";
type ItemStatus = "todo" | "saved" | "bought";

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

  // ✅ NEW
  domain?: string | null;
  category?: string | null;
};

export default function WishlistFiltered({ mode }: { mode: Mode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

  const loadFiltered = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setItems([]);
      return;
    }

    try {
      const colRef = collection(db, "users", user.uid, "wishlist_items");
      const q = query(colRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const list: WishlistItem[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const url = (data.product_url ?? "") as string;
        const title = (data.title ?? "") as string;

        // ✅ fallback (oude items)
        const domain = (data.domain ?? getDomainFromUrl(url) ?? "unknown") as string;
        const category = (data.category ?? guessCategory(title, url) ?? "other") as string;

        return {
          id: d.id,
          title,
          price: data.price ?? null,
          shop: data.shop ?? "Onbekend",
          product_url: url,
          image_url: data.image_url ?? "",
          status: (data.status || "todo") as ItemStatus,
          createdAt: data.createdAt,
          targetPrice: data.targetPrice ?? null,
          virtualSaved: data.virtualSaved ?? 0,

          domain,
          category,
        };
      });

      // ✅ Saved = doel gehaald (targetPrice gezet + virtualSaved >= targetPrice)
      if (mode === "saved") {
        const savedDone = list.filter((it) => {
          const target = Number(it.targetPrice);
          const saved = Number(it.virtualSaved ?? 0);
          if (!Number.isFinite(target) || target <= 0) return false;
          return saved >= target;
        });

        setItems(savedDone);
        return;
      }

      // ✅ Bought = status bought
      setItems(list.filter((it) => it.status === "bought"));
    } catch (e) {
      console.log("FILTER LOAD ERROR:", e);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      loadFiltered();
    }, [loadFiltered])
  );

  const updateStatus = async (id: string, status: ItemStatus) => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Error", "Je bent niet ingelogd.");

    try {
      const ref = doc(db, "users", user.uid, "wishlist_items", id);
      await updateDoc(ref, { status, updatedAt: serverTimestamp() });

      // ✅ reload so the “saved done” logic always stays correct
      await loadFiltered();
    } catch (e) {
      Alert.alert("Error", "Kon status niet aanpassen.");
    }
  };

  const removeItem = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Error", "Je bent niet ingelogd.");

    try {
      const ref = doc(db, "users", user.uid, "wishlist_items", id);
      await deleteDoc(ref);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      Alert.alert("Error", "Kon product niet verwijderen.");
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

  const renderItem = ({ item }: { item: WishlistItem }) => {
    const target = Number(item.targetPrice);
    const saved = Number(item.virtualSaved ?? 0);
    const hasTarget = Number.isFinite(target) && target > 0;
    const remaining = hasTarget ? Math.max(0, Math.round((target - saved) * 100) / 100) : null;

    return (
      <View style={styles.card}>
        <Image
          source={{ uri: item.image_url || "https://via.placeholder.com/600" }}
          style={styles.cardImg}
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.cardPrice}>
            {item.price != null ? `€ ${item.price}` : "Prijs onbekend"}
          </Text>

          <Text style={styles.cardShop}>
            {item.shop}
            {!!item.domain && item.domain !== "unknown" ? ` • ${item.domain}` : ""}
            {!!item.category ? ` • ${item.category}` : ""}
          </Text>

          {/* ✅ Extra info in “Gespaard” */}
          {mode === "saved" && hasTarget ? (
            <Text style={styles.progressText}>
              Doel € {target} • Gespaard € {saved} • Nog € {remaining}
            </Text>
          ) : null}

          <View style={styles.rowButtons}>
            {!!item.product_url && (
              <TouchableOpacity style={styles.linkBtn} onPress={() => openLink(item.product_url)}>
                <Text style={styles.linkBtnText}>Open link</Text>
              </TouchableOpacity>
            )}

            {/* ✅ Terug naar My List (todo) */}
            <TouchableOpacity style={styles.backBtn} onPress={() => updateStatus(item.id, "todo")}>
              <Text style={styles.backBtnText}>Terug</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeItem(item.id)}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <Text style={{ color: "#777" }}>
          {mode === "saved" ? "Nog niets volledig gespaard." : "Nog niets gekocht."}
        </Text>
      ) : (
        <FlatList data={items} keyExtractor={(item) => item.id} renderItem={renderItem} />
      )}
    </View>
  );
}

const PURPLE = "#6C3BFF";
const YELLOW = "#FFCF33";
const BG = "#F9F5FF";
const TEXT_DARK = "#1A1A1A";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingTop: 16, paddingHorizontal: 20 },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    marginBottom: 15,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  cardImg: { width: 80, height: 80, borderRadius: 12, backgroundColor: "#EEE" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: TEXT_DARK },
  cardPrice: { fontSize: 15, fontWeight: "700", color: PURPLE, marginTop: 2 },
  cardShop: { fontSize: 13, color: "#777", marginBottom: 6 },

  progressText: { fontSize: 12, color: "#555", fontWeight: "800", marginBottom: 6 },

  rowButtons: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" },

  linkBtn: { backgroundColor: "#111", paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 },
  linkBtnText: { fontSize: 12, fontWeight: "900", color: "#fff" },

  backBtn: { backgroundColor: YELLOW, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 },
  backBtnText: { fontSize: 12, fontWeight: "900", color: TEXT_DARK },

  deleteBtn: { backgroundColor: "red", padding: 6, borderRadius: 999, alignSelf: "flex-start" },
});