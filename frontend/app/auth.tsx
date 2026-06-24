import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius } from "@/src/theme";

const HERO =
  "https://images.pexels.com/photos/16960242/pexels-photo-16960242.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=940";

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!email.trim() || !password.trim()) {
      setErr("Email and password required");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setErr("Name required");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(name.trim(), email.trim(), password);
      }
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source={HERO} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient
        colors={["rgba(0,0,0,0.15)", "rgba(38,38,36,0.75)", "rgba(38,38,36,0.95)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Feather name="home" size={22} color={colors.onBrand} />
              </View>
              <Text style={styles.title}>Neighbourly</Text>
              <Text style={styles.subtitle}>
                The local feed for Delhi NCR neighbourhoods.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.tabs}>
                <Pressable
                  testID="auth-tab-login"
                  style={[styles.tab, mode === "login" && styles.tabActive]}
                  onPress={() => setMode("login")}
                >
                  <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>
                    Log in
                  </Text>
                </Pressable>
                <Pressable
                  testID="auth-tab-signup"
                  style={[styles.tab, mode === "signup" && styles.tabActive]}
                  onPress={() => setMode("signup")}
                >
                  <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>
                    Sign up
                  </Text>
                </Pressable>
              </View>

              {mode === "signup" && (
                <TextInput
                  testID="auth-name-input"
                  placeholder="Full name"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  autoCapitalize="words"
                />
              )}
              <TextInput
                testID="auth-email-input"
                placeholder="Email"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                style={styles.input}
              />
              <TextInput
                testID="auth-password-input"
                placeholder={mode === "signup" ? "Password (min 8 chars)" : "Password"}
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />

              {err ? (
                <Text testID="auth-error" style={styles.err}>
                  {err}
                </Text>
              ) : null}

              <Pressable
                testID="auth-submit-button"
                onPress={submit}
                disabled={busy}
                style={({ pressed }) => [
                  styles.cta,
                  pressed && { opacity: 0.85 },
                  busy && { opacity: 0.6 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.onBrand} />
                ) : (
                  <Text style={styles.ctaText}>
                    {mode === "login" ? "Log in" : "Create account"}
                  </Text>
                )}
              </Pressable>

              <Text style={styles.helper}>
                By continuing you agree to be a kind neighbour.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceInverse },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.xl, justifyContent: "space-between" },
  header: { marginTop: spacing.xxl, alignItems: "flex-start" },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { fontSize: 36, fontWeight: "800", color: colors.onSurfaceInverse, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: "rgba(255,255,255,0.75)", marginTop: spacing.xs, lineHeight: 22 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xxl,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: "center" },
  tabActive: { backgroundColor: colors.surfaceSecondary },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceTertiary },
  tabTextActive: { color: colors.brand },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  err: { color: colors.error, marginTop: spacing.xs, fontSize: 13 },
  cta: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.md,
  },
  ctaText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
  helper: { textAlign: "center", marginTop: spacing.md, color: colors.muted, fontSize: 12 },
});
