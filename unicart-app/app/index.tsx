import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getLanguage, Lang } from "../constants/language";

const PURPLE = "#6C3BFF";
const YELLOW = "#FFCF33";
const TEXT_DARK = "#1A1A1A";
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Slide data ──────────────────────────────────────────────
type Slide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  titleNl: string;
  titleEn: string;
  subNl: string;
  subEn: string;
};

const SLIDES: Slide[] = [
  {
    id: "1",
    icon: "cart",
    iconBg: PURPLE,
    iconColor: "#fff",
    titleNl: "Welkom bij UniCart",
    titleEn: "Welcome to UniCart",
    subNl: "Jouw persoonlijke winkelmandje\nvoor het hele internet.",
    subEn: "Your personal shopping cart\nfor the entire internet.",
  },
  {
    id: "2",
    icon: "link",
    iconBg: YELLOW,
    iconColor: TEXT_DARK,
    titleNl: "Bewaar van elke webshop",
    titleEn: "Save from any store",
    subNl: "Plak een productlink en UniCart\nvult de details automatisch in.",
    subEn: "Paste a product link and UniCart\nfills in the details automatically.",
  },
  {
    id: "3",
    icon: "layers",
    iconBg: PURPLE,
    iconColor: "#fff",
    titleNl: "Organiseer & bespaar",
    titleEn: "Organize & save",
    subNl: "Sorteer, filter en spaar\nvoor je favoriete producten.",
    subEn: "Sort, filter and save up\nfor your favorite products.",
  },
  {
    id: "4",
    icon: "rocket",
    iconBg: YELLOW,
    iconColor: TEXT_DARK,
    titleNl: "Klaar om te beginnen?",
    titleEn: "Ready to get started?",
    subNl: "Maak een account aan en begin\nmet het opbouwen van jouw lijst.",
    subEn: "Create an account and start\nbuilding your list.",
  },
];

// ─── Component ───────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIdx, setActiveIdx] = useState(0);

  const [lang, setLang] = useState<Lang>(getLanguage());
  useFocusEffect(useCallback(() => { setLang(getLanguage()); }, []));

  const isLast = activeIdx === SLIDES.length - 1;

  const onViewRef = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length > 0) {
      setActiveIdx(viewableItems[0].index ?? 0);
    }
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const goNext = () => {
    if (isLast) {
      router.push("/signup");
    } else {
      flatRef.current?.scrollToIndex({ index: activeIdx + 1, animated: true });
    }
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    const title = lang === "nl" ? item.titleNl : item.titleEn;
    const sub = lang === "nl" ? item.subNl : item.subEn;

    return (
      <View style={[styles.slide, { width: SCREEN_W }]}>
        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={48} color={item.iconColor} />
        </View>

        <Text style={styles.slideTitle}>{title}</Text>
        <Text style={styles.slideSub}>{sub}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>UNICART</Text>

        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => router.push("/language")}
        >
          <Ionicons name="globe-outline" size={16} color={TEXT_DARK} />
          <Text style={styles.langText}>{lang.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        scrollEventThrottle={16}
      />

      {/* Bottom area */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [
              (i - 1) * SCREEN_W,
              i * SCREEN_W,
              (i + 1) * SCREEN_W,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity: dotOpacity },
                ]}
              />
            );
          })}
        </View>

        {/* Buttons */}
        {isLast ? (
          <View style={styles.ctaGroup}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push("/signup")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryText}>
                {lang === "nl" ? "Account aanmaken" : "Create account"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/login")}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryText}>
                {lang === "nl" ? "Ik heb al een account" : "I already have an account"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ctaGroup}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={goNext}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryText}>
                {lang === "nl" ? "Volgende" : "Next"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/login")}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>
                {lang === "nl" ? "Overslaan" : "Skip"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  wordmark: {
    fontSize: 14,
    fontWeight: "800",
    color: PURPLE,
    letterSpacing: 2,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F5F5F7",
  },
  langText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_DARK,
  },

  // Slides
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  slideSub: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
    lineHeight: 24,
  },

  // Bottom
  bottom: {
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 32,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: PURPLE,
  },

  // CTA
  ctaGroup: {
    gap: 14,
    alignItems: "center",
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: PURPLE,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    width: "100%",
    backgroundColor: YELLOW,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryText: {
    color: TEXT_DARK,
    fontWeight: "700",
    fontSize: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    paddingVertical: 4,
  },
});
