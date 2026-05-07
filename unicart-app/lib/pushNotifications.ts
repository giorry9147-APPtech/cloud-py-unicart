// lib/pushNotifications.ts
//
// Asks the user for notification permission, gets an Expo push token,
// and stores it on the user's Firestore profile (`users/{uid}.expoPushToken`).
//
// Call `registerPushTokenForUser(uid)` once after the user is signed in.

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Foreground behavior: show banner + play sound + bump badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("price-drops", {
    name: "Price drops",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#6C3BFF",
  });
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // Simulators can't get a token

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  // projectId is read from app config (expo.extra.eas.projectId or expo.projectId)
  // — Expo CLI auto-injects it during managed builds.
  const tokenRes = await Notifications.getExpoPushTokenAsync();
  return tokenRes.data || null;
}

export async function registerPushTokenForUser(uid: string): Promise<string | null> {
  try {
    await ensureAndroidChannel();
    const token = await getExpoPushToken();
    if (!token) return null;

    await setDoc(
      doc(db, "users", uid),
      {
        expoPushToken: token,
        expoPushTokenUpdatedAt: serverTimestamp(),
        platform: Platform.OS,
      },
      { merge: true }
    );

    return token;
  } catch (e) {
    // Push failures must never crash the app.
    console.warn("[push] register failed:", e);
    return null;
  }
}
