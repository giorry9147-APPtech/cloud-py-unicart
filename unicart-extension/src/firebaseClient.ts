import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDb60KytW61daVI1hf2G8RwSeYyERFXGX0",
  authDomain: "unishopcart.firebaseapp.com",
  projectId: "unishopcart",
  appId: "1:75497122420:web:f5325553a8f0252574ff21",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

async function removeCachedToken(token: string) {
  await new Promise<void>((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}

async function clearAllCachedTokensBestEffort() {
  // Niet in elke Chrome/typings aanwezig → guard
  const anyIdentity = chrome.identity as any;
  if (typeof anyIdentity.clearAllCachedAuthTokens !== "function") return;

  await new Promise<void>((resolve) => {
    anyIdentity.clearAllCachedAuthTokens(() => resolve());
  });
}

async function revokeTokenBestEffort(token: string) {
  // Helpt om “sticky” accounts te voorkomen (best effort)
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `token=${encodeURIComponent(token)}`,
    });
  } catch {}
}

// MV3 types kunnen object teruggeven i.p.v. string
function extractToken(t: any): string | null {
  if (!t) return null;
  if (typeof t === "string") return t;
  if (typeof t === "object") {
    if (typeof t.token === "string") return t.token;
    if (typeof t.accessToken === "string") return t.accessToken;
  }
  return null;
}

async function getChromeAuthToken(interactive: boolean): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (t) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));

      const token = extractToken(t);
      if (!token) return reject(new Error("No token returned"));

      resolve(token);
    });
  });
}

export async function signInWithGoogleExtension() {
  const token = await getChromeAuthToken(true);
  const credential = GoogleAuthProvider.credential(null, token);
  return signInWithCredential(auth, credential);
}

export async function logoutExtension() {
  const token = await getChromeAuthToken(false).catch(() => null);
  if (token) {
    await revokeTokenBestEffort(token);
    await removeCachedToken(token);
  }
  await clearAllCachedTokensBestEffort();
  await signOut(auth);
}

// ✅ echte switch: logout + cache clear + nieuwe interactieve login
export async function switchAccountExtension() {
  await logoutExtension();
  return signInWithGoogleExtension();
}
