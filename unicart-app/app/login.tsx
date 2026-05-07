import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getLanguage, Lang } from "../constants/language";
import { auth } from "../lib/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useGoogleAuth } from "../lib/googleAuth";

const PURPLE = "#6C3BFF";
const YELLOW = "#FFCF33";
const BG = "#F9F5FF";
const TEXT_DARK = "#1A1A1A";

const texts = {
  nl: {
    help: "Hulp nodig?",
    email: "E-mailadres",
    password: "Wachtwoord",
    forgot: "Wachtwoord vergeten?",
    login: "Inloggen",
    create: "Nieuw account aanmaken",
    missing: "Vul je e-mailadres en wachtwoord in.",
    wrongCreds: "Onjuiste e-mail of wachtwoord.",
    notFound: "Deze e-mail is niet geregistreerd.",
    loginFailed: "Inloggen mislukt",
    notice: "Let op",
    welcomeBack: "Welkom terug!",
    or: "of",
    googleBtn: "Verder met Google",
    googleConflict: "Er bestaat al een account met dit e-mailadres via een andere methode.",
  },
  en: {
    help: "Need help?",
    email: "Email address",
    password: "Password",
    forgot: "Forgot password?",
    login: "Log in",
    create: "Create a new account",
    missing: "Please enter your email and password.",
    wrongCreds: "Incorrect email or password.",
    notFound: "This email is not registered.",
    loginFailed: "Login failed",
    notice: "Notice",
    welcomeBack: "Welcome back!",
    or: "or",
    googleBtn: "Continue with Google",
    googleConflict: "An account already exists with this email via a different sign-in method.",
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const [lang] = useState<Lang>(getLanguage());
  const t = useMemo(() => (lang === "nl" ? texts.nl : texts.en), [lang]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  const { request: googleRequest, signInWithGoogle } = useGoogleAuth();

  const onGoogleLogin = async () => {
    try {
      setBusy(true);
      await signInWithGoogle();
      router.replace("/wishlist");
    } catch (err: any) {
      console.log("Google login error", err);
      if (err?.message === "Google login cancelled") return;

      const code = err?.code as string | undefined;
      if (code === "auth/account-exists-with-different-credential") {
        Alert.alert(t.loginFailed, t.googleConflict);
        return;
      }

      Alert.alert(t.loginFailed, err?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert(t.notice, t.missing);
      return;
    }

    try {
      setBusy(true);

      const userCred = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      Alert.alert(t.welcomeBack, userCred.user.email ?? "");
      router.replace("/wishlist");
    } catch (err: any) {
      console.log("Login error", err);
      const code = err?.code as string | undefined;

      // Firebase v9+ most common codes for wrong login
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-login-credentials"
      ) {
        Alert.alert(t.loginFailed, t.wrongCreds);
        return;
      }

      if (code === "auth/user-not-found") {
        Alert.alert(
          lang === "nl" ? "Account bestaat niet" : "Account not found",
          t.notFound
        );
        return;
      }

      Alert.alert(t.loginFailed, err?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const goToSignup = () => router.push("/signup");

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} disabled={busy}>
          <Ionicons name="chevron-back" size={22} color="#777" />
        </TouchableOpacity>

        <TouchableOpacity disabled={busy}>
          <Text style={styles.helpText}>{t.help}</Text>
        </TouchableOpacity>
      </View>

      {/* Logo */}
      <View style={styles.logoWrap}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>U</Text>
        </View>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.inputWrap}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t.email}
            placeholderTextColor="#B8B8B8"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            textContentType="username"
          />
        </View>

        <View style={styles.inputWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t.password}
            placeholderTextColor="#B8B8B8"
            style={styles.input}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            textContentType="password"
          />

          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPwd((v) => !v)}
            disabled={busy}
          >
            <Ionicons
              name={showPwd ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgotBtn} disabled={busy}>
          <Text style={styles.forgotText}>{t.forgot}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginBtn, busy && { opacity: 0.7 }]}
          onPress={submitLogin}
          disabled={busy}
        >
          <Text style={styles.loginText}>{busy ? "..." : t.login}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t.or}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleBtn, (busy || !googleRequest) && { opacity: 0.5 }]}
          onPress={onGoogleLogin}
          disabled={busy || !googleRequest}
        >
          <Ionicons name="logo-google" size={18} color={TEXT_DARK} style={{ marginRight: 10 }} />
          <Text style={styles.googleBtnText}>{t.googleBtn}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom create account */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={goToSignup}
          disabled={busy}
        >
          <Text style={styles.createText}>{t.create}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  helpText: {
    fontSize: 14,
    color: "#777",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
  },
  form: {
    gap: 12,
  },
  inputWrap: {
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    color: TEXT_DARK,
  },
  eyeBtn: {
    paddingHorizontal: 4,
  },
  forgotBtn: {
    marginTop: 4,
  },
  forgotText: {
    fontSize: 13,
    color: "#666",
  },
  loginBtn: {
    marginTop: 12,
    backgroundColor: PURPLE,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  loginText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 4,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  dividerText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "700",
  },

  googleBtn: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  googleBtnText: {
    color: TEXT_DARK,
    fontWeight: "700",
    fontSize: 15,
  },

  bottom: {
    marginTop: 40,
  },
  createBtn: {
    borderRadius: 999,
    backgroundColor: YELLOW,
    paddingVertical: 14,
    alignItems: "center",
  },
  createText: {
    color: TEXT_DARK,
    fontWeight: "600",
    fontSize: 15,
  },
});
