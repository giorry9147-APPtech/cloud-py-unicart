import { auth, db } from "./firebaseConfig";
import {
  doc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

type ItemStatus = "todo" | "saved" | "bought";

function itemRef(itemId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  return doc(db, "users", user.uid, "wishlist_items", itemId);
}

export async function setStatus(itemId: string, status: ItemStatus) {
  await updateDoc(itemRef(itemId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function setTargetPrice(itemId: string, targetPrice: number | null) {
  await updateDoc(itemRef(itemId), {
    targetPrice: targetPrice ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function addVirtualSaved(itemId: string, amount: number) {
  await updateDoc(itemRef(itemId), {
    virtualSaved: increment(amount),
    updatedAt: serverTimestamp(),
  });
}

export async function markBought(itemId: string, boughtPrice?: number) {
  await updateDoc(itemRef(itemId), {
    status: "bought",
    boughtAt: serverTimestamp(),
    boughtPrice: boughtPrice ?? null,
    updatedAt: serverTimestamp(),
  });
}

