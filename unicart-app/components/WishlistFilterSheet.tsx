// components/WishlistFilterSheet.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type SortMode = "none" | "domain" | "category";

export type CategoryKey =
  | "tshirt"
  | "electronics"
  | "broek"
  | "hoodie"
  | "shoes"
  | "jacket"
  | "accessory"
  | "other";

export type CategoryOption = {
  key: CategoryKey;
  label: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;

  sortMode: SortMode;
  setSortMode: React.Dispatch<React.SetStateAction<SortMode>>;

  hideOther: boolean;
  setHideOther: React.Dispatch<React.SetStateAction<boolean>>;

  activeCategory: CategoryKey | null;
  setActiveCategory: React.Dispatch<React.SetStateAction<CategoryKey | null>>;

  categoryOptions: CategoryOption[];

  onReset: () => void;
};

const PURPLE = "#6C3BFF";
const TEXT_DARK = "#1A1A1A";

export default function WishlistFilterSheet({
  visible,
  onClose,
  sortMode,
  setSortMode,
  hideOther,
  setHideOther,
  activeCategory,
  setActiveCategory,
  categoryOptions,
  onReset,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tap outside = close */}
      <TouchableWithoutFeedback onPress={onClose} accessible={false}>
        <View style={styles.backdrop}>
          {/* Tap inside = do nothing */}
          <TouchableWithoutFeedback onPress={() => {}} accessible={false}>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Filter & sorteren</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>

              <Text style={styles.section}>Sorteren</Text>

              <TouchableOpacity
                style={[styles.row, sortMode === "none" && styles.rowActive]}
                onPress={() => {
                  setSortMode("none");
                  setActiveCategory(null);
                  onClose();
                }}
              >
                <Text style={styles.rowText}>Normaal</Text>
                {sortMode === "none" ? <Ionicons name="checkmark" size={18} color={PURPLE} /> : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.row, sortMode === "domain" && styles.rowActive]}
                onPress={() => {
                  setSortMode("domain");
                  setActiveCategory(null);
                  onClose();
                }}
              >
                <Text style={styles.rowText}>Sorteren op websites</Text>
                {sortMode === "domain" ? <Ionicons name="checkmark" size={18} color={PURPLE} /> : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.row, sortMode === "category" && styles.rowActive]}
                onPress={() => {
                  setSortMode("category");
                  // sheet blijft open zodat je categorie kan kiezen
                }}
              >
                <Text style={styles.rowText}>Sorteren op categorie</Text>
                {sortMode === "category" ? (
                  <Ionicons name="checkmark" size={18} color={PURPLE} />
                ) : null}
              </TouchableOpacity>

              {/* Categorie pills alleen bij category-mode */}
              {sortMode === "category" ? (
                <>
                  <Text style={[styles.section, { marginTop: 12 }]}>Categorie</Text>
                  <View style={styles.pillsWrap}>
                    {categoryOptions.map((c) => {
                      const active = activeCategory === c.key;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          style={[styles.pill, active && styles.pillActive]}
                          onPress={() => setActiveCategory((prev) => (prev === c.key ? null : c.key))}
                        >
                          <Text style={[styles.pillText, active && styles.pillTextActive]}>
                            {c.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text style={[styles.section, { marginTop: 12 }]}>Overig</Text>
              <TouchableOpacity style={styles.row} onPress={() => setHideOther((v) => !v)}>
                <Text style={styles.rowText}>Verberg “Other”</Text>
                <Ionicons
                  name={hideOther ? "checkbox" : "square-outline"}
                  size={18}
                  color={hideOther ? PURPLE : "#777"}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                <Text style={styles.doneText}>Klaar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.25)" },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 10,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "900", color: TEXT_DARK },

  section: { fontSize: 12, fontWeight: "900", color: "#444", textTransform: "uppercase" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#F6F6F8",
  },
  rowActive: {
    borderWidth: 1,
    borderColor: "rgba(108,59,255,0.35)",
    backgroundColor: "rgba(108,59,255,0.10)",
  },
  rowText: { fontSize: 14, fontWeight: "800", color: TEXT_DARK },

  pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  pillActive: { backgroundColor: "rgba(108,59,255,0.12)", borderColor: "rgba(108,59,255,0.35)" },
  pillText: { fontSize: 12, fontWeight: "900", color: "#333" },
  pillTextActive: { color: PURPLE },

  resetBtn: { backgroundColor: "#EFEFEF", padding: 12, borderRadius: 999, alignItems: "center", marginTop: 6 },
  resetText: { fontWeight: "900", color: "#333" },

  doneBtn: { backgroundColor: PURPLE, padding: 12, borderRadius: 999, alignItems: "center" },
  doneText: { fontWeight: "900", color: "#fff" },
});
