// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const PURPLE = "#6C3BFF";
const INACTIVE = "#8E8E93";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  home: { label: "Home", icon: "home" },
  wishlist: { label: "Cart", icon: "bag" },
  goals: { label: "Goals", icon: "locate" },
  stats: { label: "Stats", icon: "stats-chart" },
  profile: { label: "Profile", icon: "person" },
};

function FloatingPillTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r) => TAB_META[r.name]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <View style={styles.pill}>
        {visibleRoutes.map((route) => {
          const meta = TAB_META[route.name];
          const realIndex = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === realIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              style={styles.tab}
              hitSlop={8}
            >
              {isFocused ? (
                <View style={styles.activePill}>
                  <Ionicons name={meta.icon} size={18} color="#fff" />
                  <Text style={styles.activeLabel} numberOfLines={1}>
                    {meta.label}
                  </Text>
                </View>
              ) : (
                <Ionicons name={`${meta.icon}-outline` as IconName} size={22} color={INACTIVE} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingPillTabBar {...props} />}
    >
      {/* Visible tabs — order matches mockup bottom nav */}
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="wishlist" options={{ title: "MY UNICART" }} />
      <Tabs.Screen name="goals" options={{ title: "Goals" }} />
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />

      {/* Hidden routes — kept around so direct links still work */}
      <Tabs.Screen name="saved" options={{ href: null }} />
      <Tabs.Screen name="bought" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="friends" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 64,
    width: "100%",
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#6C3BFF",
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 12,
      },
      default: {},
    }),
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PURPLE,
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    shadowColor: PURPLE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  activeLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
