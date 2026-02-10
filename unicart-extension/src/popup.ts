import {
  auth,
  signInWithGoogleExtension,
  logoutExtension,
  switchAccountExtension,
} from "./firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { getActiveTabUrl, parseUrl, saveItemToApi } from "./api";

const statusEl = document.getElementById("status") as HTMLElement;
const msgEl = document.getElementById("msg") as HTMLElement;

const loginBtn = document.getElementById("loginBtn") as HTMLButtonElement;
const logoutBtn = document.getElementById("logoutBtn") as HTMLButtonElement;
const switchBtn = document.getElementById("switchBtn") as HTMLButtonElement;
const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;

console.log("popup.ts loaded");

function setMsg(s: string) {
  msgEl.textContent = s;
}

function setBusy(isBusy: boolean) {
  loginBtn.disabled = isBusy;
  logoutBtn.disabled = isBusy;
  switchBtn.disabled = isBusy;
  saveBtn.disabled = isBusy;
}

function prettyAuthError(e: any) {
  const msg = e?.message || String(e);

  // Chrome identity cases
  if (msg.includes("The user did not approve access")) return "Cancelled.";
  if (msg.includes("OAuth2 not granted") || msg.includes("not granted"))
    return "Permission not granted. Try again.";
  if (msg.includes("No token returned")) return "Login token missing. Try again.";

  return msg;
}

function setLoggedInUI(emailOrLabel: string) {
  statusEl.textContent = emailOrLabel;
  loginBtn.style.display = "none";
  logoutBtn.style.display = "block";
  switchBtn.style.display = "block";
  saveBtn.style.display = "block";
}

function setLoggedOutUI() {
  statusEl.textContent = "Not logged in";
  loginBtn.style.display = "block";
  logoutBtn.style.display = "none";
  switchBtn.style.display = "none";
  saveBtn.style.display = "none";
}

// --- Handlers ---

loginBtn.onclick = async () => {
  try {
    setMsg("");
    setBusy(true);
    await signInWithGoogleExtension();
  } catch (e: any) {
    console.error(e);
    setMsg(`Login failed: ${prettyAuthError(e)}`);
  } finally {
    setBusy(false);
  }
};

logoutBtn.onclick = async () => {
  try {
    setMsg("");
    setBusy(true);
    await logoutExtension();
    setMsg("✅ Logged out.");
  } catch (e: any) {
    console.error(e);
    setMsg(`Logout failed: ${prettyAuthError(e)}`);
  } finally {
    setBusy(false);
  }
};

switchBtn.onclick = async () => {
  try {
    setMsg("Switching account...");
    setBusy(true);
    await switchAccountExtension();
    setMsg("✅ Switched!");
  } catch (e: any) {
    console.error(e);
    const nice = prettyAuthError(e);
    if (nice === "Cancelled.") setMsg("Cancelled (no changes).");
    else setMsg(`Switch failed: ${nice}`);
  } finally {
    setBusy(false);
  }
};

saveBtn.onclick = async () => {
  console.log("SAVE CLICKED");
  try {
    setMsg("");
    const user = auth.currentUser;

    if (!user) {
      setMsg("Please login first.");
      return;
    }

    setBusy(true);
    setMsg("Saving...");

    const url = await getActiveTabUrl();
    const parsed = await parseUrl(url);

    const idToken = await user.getIdToken();
    await saveItemToApi(idToken, {
      title: parsed.title || parsed.url,
      url: parsed.url,
      shop: parsed.shop || parsed.domain,
      price: parsed.price ?? null,
      image: parsed.image || "",
      domain: parsed.domain,
      category: null,
    });

    setMsg("✅ Saved to My UniCart!");
  } catch (e: any) {
    console.error(e);
    setMsg(`❌ ${e?.message || String(e)}`);
  } finally {
    setBusy(false);
  }
};

// --- Auth state UI ---

onAuthStateChanged(auth, (user) => {
  if (user) {
    const label =
      user.email || (user.displayName ? `${user.displayName}` : "Logged in");
    setLoggedInUI(label);
    setMsg("");
  } else {
    setLoggedOutUI();
    setMsg("");
  }
});
