import * as AuthSession from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "./firebaseConfig";

WebBrowser.maybeCompleteAuthSession();

// From google-services.json
const WEB_CLIENT_ID =
  "75497122420-ou1gt8m479otvthm6co08bgptfoech44.apps.googleusercontent.com";

// iOS client tied to Expo Go's bundle id "host.exp.exponent"
const IOS_CLIENT_ID =
  "75497122420-hhkv3fudvsj8sku6fjpaubsavbt38hq6.apps.googleusercontent.com";

export function useGoogleAuth() {
  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: WEB_CLIENT_ID,
  });

  const signInWithGoogle = async () => {
    const result = await promptAsync();

    if (result?.type !== "success") {
      throw new Error("Google login cancelled");
    }

    const { id_token } = result.params;
    const credential = GoogleAuthProvider.credential(id_token);
    return signInWithCredential(auth, credential);
  };

  return { request, signInWithGoogle };
}
