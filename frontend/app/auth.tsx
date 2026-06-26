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
import { getErrorMessage } from "@/src/errors";
import { colors, spacing, radius } from "@/src/theme";

export default function AuthScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const requestOtp = async () => {
    setErr(null);
    if (!email.trim() || !email.includes("@")) {
      setErr("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      const uid = await sendOtp(email.trim().toLowerCase());
      setUserId(uid);
      setStep("otp");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Could not send OTP"));
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    setErr(null);
    if (otp.trim().length < 6) {
      setErr("Enter the 6-digit code from your email");
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(userId, otp.trim());
      router.replace("/");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Wrong or expired code"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1A3A28", "#2E5C3B", "#3A704C"]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logo}
                contentFit="contain"
              />
              <Text style={styles.title}>Localy</Text>
              <Text style={styles.subtitle}>The local feed for Delhi NCR neighbourhoods.</Text>
            </View>

            <View style={styles.card}>
              {step === "email" ? (
                <>
                  <Text style={styles.cardTitle}>Sign in with email</Text>
                  <Text style={styles.cardHint}>We will send a 6-digit code to your inbox. No password needed.</Text>
                  <TextInput
                    testID="auth-email-input"
                    placeholder="you@example.com"
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    style={styles.input}
                  />
                  {err ? <Text testID="auth-error" style={styles.err}>{err}</Text> : null}
                  <Pressable
                    testID="auth-send-otp"
                    onPress={requestOtp}
                    disabled={busy}
                    style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }, busy && { opacity: 0.6 }]}
                  >
                    {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.ctaText}>Send code</Text>}
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Enter the 6-digit code</Text>
                  <Text style={styles.cardHint}>Sent to {email}. Check spam if you do not see it.</Text>
                  <TextInput
                    testID="auth-otp-input"
                    placeholder="• • • • • •"
                    placeholderTextColor={colors.muted}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={[styles.input, styles.otpInput]}
                    autoFocus
                  />
                  {err ? <Text testID="auth-error" style={styles.err}>{err}</Text> : null}
                  <Pressable
                    testID="auth-verify-otp"
                    onPress={submitOtp}
                    disabled={busy}
                    style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }, busy && { opacity: 0.6 }]}
                  >
                    {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.ctaText}>Verify and continue</Text>}
                  </Pressable>
                  <Pressable testID="auth-change-email" onPress={() => { setStep("email"); setOtp(""); setErr(null); }} style={styles.link}>
                    <Text style={styles.linkText}>Use a different email</Text>
                  </Pressable>
                </>
              )}

              <Text style={styles.helper}>By continuing you agree to be a kind neighbour.</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.xl, justifyContent: "space-between" },
  header: { marginTop: spacing.xxl, alignItems: "center" },
  logo: { width: 96, height: 96, marginBottom: spacing.md },
  title: { fontSize: 36, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: "rgba(255,255,255,0.75)", marginTop: spacing.xs, lineHeight: 22, textAlign: "center" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xxl },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, marginBottom: 6 },
  cardHint: { fontSize: 13, color: colors.muted, marginBottom: spacing.lg, lineHeight: 19 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 15,
    color: colors.onSurface, marginBottom: spacing.sm,
  },
  otpInput: { fontSize: 24, letterSpacing: 8, textAlign: "center", fontWeight: "700" },
  err: { color: colors.error, marginTop: spacing.xs, fontSize: 13 },
  cta: {
    backgroundColor: colors.brand, borderRadius: radius.pill,
    paddingVertical: 14, alignItems: "center", marginTop: spacing.md,
  },
  ctaText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
  link: { alignItems: "center", marginTop: spacing.md },
  linkText: { color: colors.brand, fontSize: 13, fontWeight: "600" },
  helper: { textAlign: "center", marginTop: spacing.md, color: colors.muted, fontSize: 12 },
});
