import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { getLanguage, setLanguage, Lang } from "../constants/language";

const PURPLE = "#6C3BFF";
const BG = "#F9F5FF";
const TEXT_DARK = "#1A1A1A";

const texts = {
  nl: {
    title: "Kies je taal",
    subtitle: "Selecteer de taal waarin je Unicart wilt gebruiken.",
    back: "Terug",
    dutchLabel: "Nederlands",
    dutchDesc: "Voor gebruikers in Nederland en België.",
    englishLabel: "Engels",
    englishDesc: "Voor internationale gebruikers.",
  },
  en: {
    title: "Choose your language",
    subtitle: "Select the language you want to use Unicart in.",
    back: "Back",
    dutchLabel: "Dutch",
    dutchDesc: "For users in the Netherlands and Belgium.",
    englishLabel: "English",
    englishDesc: "For international users.",
  },
};

export default function LanguageScreen() {
  const router = useRouter();

  // welke taal is nu actief voor de UI van dit scherm
  const [uiLang, setUiLang] = useState<Lang>(getLanguage());
  const t = texts[uiLang];

  const [selected, setSelected] = useState<Lang>(getLanguage());

  // als je terugkomt op dit scherm -> UI-taal opnieuw ophalen
  useFocusEffect(
    React.useCallback(() => {
      const current = getLanguage();
      setUiLang(current);
      setSelected(current);
    }, [])
  );

  const choose = (lang: Lang) => {
    setSelected(lang);
    setLanguage(lang); // zet globale taal
    router.back(); // terug naar vorige pagina
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.options}>
        <LangOption
          code="nl"
          label={t.dutchLabel}
          description={t.dutchDesc}
          selected={selected === "nl"}
          onPress={() => choose("nl")}
        />
        <LangOption
          code="en"
          label={t.englishLabel}
          description={t.englishDesc}
          selected={selected === "en"}
          onPress={() => choose("en")}
        />
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>{t.back}</Text>
      </TouchableOpacity>
    </View>
  );
}

type LangOptionProps = {
  code: Lang;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
};

function LangOption({
  code,
  label,
  description,
  selected,
  onPress,
}: LangOptionProps) {
  return (
    <TouchableOpacity
      style={[styles.langCard, selected && styles.langCardSelected]}
      onPress={onPress}
    >
      <View style={styles.langHeader}>
        <Text style={styles.langCode}>{code.toUpperCase()}</Text>
        <Text style={styles.langLabel}>{label}</Text>
      </View>
      <Text style={styles.langDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  options: {
    gap: 12,
  },
  langCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  langCardSelected: {
    borderColor: PURPLE,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  langHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  langCode: {
    fontSize: 14,
    fontWeight: "700",
    color: PURPLE,
  },
  langLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  langDescription: {
    fontSize: 13,
    color: "#777",
  },
  backBtn: {
    marginTop: 32,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 14,
    color: PURPLE,
    fontWeight: "600",
  },
});
