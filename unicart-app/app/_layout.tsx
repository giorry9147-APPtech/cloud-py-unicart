// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../lib/firebaseConfig";
import { registerPushTokenForUser } from "../lib/pushNotifications";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
      if (u?.uid) {
        registerPushTokenForUser(u.uid);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (initializing) return;

    const group = segments[0];
    const inTabs = group === "(tabs)";
    const inAuth = group === "login" || group === "signup";

    if (!user && inTabs) {
      router.replace("/login");
      return;
    }

    if (user && inAuth) {
      router.replace("/wishlist");
      return;
    }
  }, [user, initializing, segments, router]);

  if (initializing || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Slot />;
}
