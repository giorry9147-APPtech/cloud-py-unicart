import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type WishlistItem = {
  id: string;
  title: string;
  targetPrice?: number | null;
  virtualSaved?: number | null;
};

type Props = {
  visible: boolean;
  item: WishlistItem | null;
  targetPriceInput: string;
  setTargetPriceInput: (v: string) => void;

  onClose: () => void;
  onSaveTarget: () => Promise<void>;
  onAddMoney: (amount: number) => Promise<void>;
};

const PURPLE = "#6C3BFF";
const YELLOW = "#FFCF33";
const TEXT_DARK = "#1A1A1A";

export default function SavingModal({
  visible,
  item,
  targetPriceInput,
  setTargetPriceInput,
  onClose,
  onSaveTarget,
  onAddMoney,
}: Props) {
  const [customAmount, setCustomAmount] = useState("");

  const saved = item?.virtualSaved ?? 0;
  const target = item?.targetPrice ?? null;

  const remaining = useMemo(() => {
    if (!target) return null;
    return Math.max(0, Math.round((target - saved) * 100) / 100);
  }, [target, saved]);

  const applyCustom = async (sign: 1 | -1) => {
    const num = Number(String(customAmount).replace(",", "."));
    if (!Number.isFinite(num) || num <= 0) {
      return Alert.alert("Error", "Vul een geldig bedrag in.");
    }
    setCustomAmount("");
    await onAddMoney(sign * num);
  };

  const TargetButtonLabel = target ? "Doelprijs updaten" : "Doelprijs opslaan";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={2}>
                {item ? `Sparen voor: ${item.title}` : "Sparen"}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Target */}
            <Text style={styles.label}>Prijsdoel</Text>
            <TextInput
              style={styles.input}
              placeholder="Bijv. 70"
              value={targetPriceInput}
              onChangeText={setTargetPriceInput}
              keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                onSaveTarget();
              }}
            />

            {/* ✅ Purple button now clear */}
            <TouchableOpacity style={[styles.btn, styles.btnPurple]} onPress={onSaveTarget}>
              <Text style={styles.btnTextLight}>{TargetButtonLabel}</Text>
            </TouchableOpacity>

            {/* Planner */}
            <Text style={[styles.label, { marginTop: 12 }]}>
              Spaarplanner (planner, geen echte rekening)
            </Text>

            {/* Quick + */}
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btnSmall, styles.btnDark]} onPress={() => onAddMoney(5)}>
                <Text style={styles.btnTextLight}>+ €5</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSmall, styles.btnDark]} onPress={() => onAddMoney(10)}>
                <Text style={styles.btnTextLight}>+ €10</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSmall, styles.btnDark]} onPress={() => onAddMoney(20)}>
                <Text style={styles.btnTextLight}>+ €20</Text>
              </TouchableOpacity>
            </View>

            {/* Quick - */}
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btnSmall, styles.btnOutline]} onPress={() => onAddMoney(-5)}>
                <Text style={styles.btnTextDark}>- €5</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSmall, styles.btnOutline]} onPress={() => onAddMoney(-10)}>
                <Text style={styles.btnTextDark}>- €10</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSmall, styles.btnOutline]} onPress={() => onAddMoney(-20)}>
                <Text style={styles.btnTextDark}>- €20</Text>
              </TouchableOpacity>
            </View>

            {/* Custom amount */}
            <Text style={[styles.label, { marginTop: 8 }]}>Correctie / eigen bedrag</Text>
            <TextInput
              style={styles.input}
              placeholder="Bijv. 7,50"
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
            />

            <View style={styles.row}>
              <TouchableOpacity style={[styles.btnSmall, styles.btnYellow]} onPress={() => applyCustom(1)}>
                <Text style={styles.btnTextDark}>Toevoegen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSmall, styles.btnOutline]} onPress={() => applyCustom(-1)}>
                <Text style={styles.btnTextDark}>Aftrekken</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Dit is een spaarplanner. UniCart houdt geen geld vast — je geld blijft bij jou.
            </Text>

            {/* Summary */}
            <View style={{ marginTop: 8 }}>
              <Text style={styles.summary}>Gespaard (planner): € {saved}</Text>
              <Text style={styles.summary}>Doelprijs: {target ? `€ ${target}` : "—"}</Text>
              {target ? (
                <Text style={[styles.summary, { fontWeight: "900" }]}>Nog nodig: € {remaining}</Text>
              ) : (
                <Text style={styles.summary}>Vul eerst een doelprijs in.</Text>
              )}
            </View>

            {/* ✅ Clear bottom action */}
            <TouchableOpacity style={[styles.btn, styles.btnLight]} onPress={onClose}>
              <Text style={styles.btnTextDark}>Klaar</Text>
            </TouchableOpacity>
          </View>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontSize: 20, fontWeight: "900", color: TEXT_DARK },
  label: { fontWeight: "900", color: TEXT_DARK, marginBottom: 4 },

  input: { backgroundColor: "#EFEFEF", padding: 12, borderRadius: 12, fontSize: 14 },

  row: { flexDirection: "row", gap: 10 },

  btn: { padding: 13, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  btnSmall: { flex: 1, padding: 12, borderRadius: 999, alignItems: "center" },

  btnPurple: { backgroundColor: PURPLE },
  btnYellow: { backgroundColor: YELLOW },
  btnDark: { backgroundColor: "#333" },
  btnOutline: { borderWidth: 1, borderColor: "rgba(0,0,0,0.2)", backgroundColor: "#fff" },
  btnLight: { backgroundColor: "#EDEDED", marginTop: 6 },

  btnTextLight: { color: "#fff", fontWeight: "900" },
  btnTextDark: { color: TEXT_DARK, fontWeight: "900" },

  hint: { fontSize: 12, color: "#777", marginTop: 2 },
  summary: { fontSize: 13, color: "#555" },
});
