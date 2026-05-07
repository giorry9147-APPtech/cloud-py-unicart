// components/UniCartHeader.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE = "#6C3BFF";
const YELLOW = "#FFCF33";

export default function UniCartHeader({
  title,
}: {
  title: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <View style={styles.accentLine} />
      <Text style={styles.wordmark}>UNICART</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: PURPLE,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  accentLine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: YELLOW,
  },
  wordmark: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 2.5,
  },
});

