import { useEffect, useRef, useState } from "react";
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
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth-context";
import { getErrorMessage } from "@/src/errors";
import { colors, spacing, radius } from "@/src/theme";

export default function AuthScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<"home" | "email" | "otp">("home");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const goTo = (s: typeof step) => {
    setStep(s);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 0, useNativeDriver: true }),
    ]).start(() => {
      setStep(s);
      animateIn();
    });
  };

  useEffect(() => {
    animateIn();
  }, []);

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
      goTo("otp");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Could not send OTP"));
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    setErr(null);
    const code = otp.join("");
    if (code.length < 6) {
      setErr("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(userId, code);
      await new Promise((r) => setTimeout(r, 600));
      router.replace("/");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Wrong or expired code"));
    } finally {
      setBusy(false);
    }
  };

  const setOtpDigit = (i: number, v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 5) {
      const nextRef = otpRefs.current[i + 1];
      if (nextRef) setTimeout(() => nextRef.focus(), 50);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#FF3366", "#3366FF", "#66FF33"]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentWrap}>
              {/* Logo + Title */}
              <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.logoWrap}>
                  <View style={styles.logoShadow}>
                    <Feather name="map-pin" size={42} color={colors.brand} />
                  </View>
                </View>
                <Text style={styles.title}>Localy</Text>
                <Text style={styles.subtitle}>Neighborhood life, one tap away.</Text>
              </Animated.View>

              {/* Cards */}
              <Animated.View style={[styles.cardWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                {step === "home" && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Welcome in</Text>
                    <Text style={styles.cardHint}>Use your email to get a secure one-time login code.</Text>
                    <Pressable
                      style={[styles.cta, { marginTop: spacing.md }]}
                      onPress={() => goTo("email")}
                    >
                      <Text style={styles.ctaText}>Continue with Email</Text>
                      <Feather name="arrow-right" size={18} color={colors.onBrand} />
                    </Pressable>
                  </View>
                )}

                {step === "email" && (
                  <Animated.View style={{ opacity: fadeAnim }}>
                    <BlurView intensity={60} tint="light" style={[styles.card, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
                      <Text style={styles.cardTitle}>What is your email?</Text>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Email Address</Text>
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
                      </View>
                      {err ? <Text testID="auth-error" style={styles.err}>{err}</Text> : null}
                      <Pressable
                        testID="auth-send-otp"
                        onPress={requestOtp}
                        disabled={busy}
                        style={({ pressed }) => [
                          styles.cta,
                          pressed && { opacity: 0.85, transform: [{ translateX: 2 }, { translateY: 2 }], shadowOffset: { width: 2, height: 2 } },
                          busy && { opacity: 0.6 },
                        ]}
                      >
                        {busy ? <ActivityIndicator color={colors.onBrand} /> : (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={styles.ctaText}>Send OTP</Text>
                            <Feather name="send" size={16} color={colors.onBrand} />
                          </View>
                        )}
                      </Pressable>
                    </BlurView>
                  </Animated.View>
                )}

                {step === "otp" && (
                  <Animated.View style={{ opacity: fadeAnim }}>
                    <BlurView intensity={60} tint="light" style={[styles.card, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
                      <Text style={styles.cardTitle}>Check your email</Text>
                      <Text style={styles.cardHint}>
                        We sent a code to{" "}
                        <Text style={{ fontWeight: "800", color: colors.onSurface }}>{email}</Text>
                      </Text>
                        <View style={styles.otpRow}>
                        {otp.map((d, i) => (
                          <TextInput
                            key={i}
                            ref={(el) => { otpRefs.current[i] = el; }}
                            testID={`otp-${i}`}
                            value={d}
                            onChangeText={(v) => setOtpDigit(i, v)}
                            keyboardType="number-pad"
                            inputMode="numeric"
                            maxLength={1}
                            style={styles.otpBox}
                          />
                        ))}
                      </View>
                      {err ? <Text testID="auth-error" style={styles.err}>{err}</Text> : null}
                      <Pressable
                        testID="auth-verify-otp"
                        onPress={submitOtp}
                        disabled={busy}
                        style={({ pressed }) => [
                          styles.cta,
                          pressed && { opacity: 0.85, transform: [{ translateX: 2 }, { translateY: 2 }], shadowOffset: { width: 2, height: 2 } },
                          busy && { opacity: 0.6 },
                        ]}
                      >
                        {busy ? <ActivityIndicator color={colors.onBrand} /> : (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={styles.ctaText}>Verify and continue</Text>
                            <Feather name="check" size={16} color={colors.onBrand} />
                          </View>
                        )}
                      </Pressable>
                      <Pressable testID="auth-change-email" onPress={() => { setOtp(["", "", "", "", "", ""]); setErr(null); goTo("email"); }} style={styles.link}>
                        <Text style={styles.linkText}>Use a different email</Text>
                      </Pressable>
                    </BlurView>
                  </Animated.View>
                )}
              </Animated.View>
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
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  contentWrap: { alignItems: "center", gap: spacing.xxxl },
  header: { alignItems: "center", gap: spacing.sm },
  logoWrap: { marginBottom: spacing.sm },
  logoShadow: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 4, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 8, height: 8 }, elevation: 8,
    alignItems: "center", justifyContent: "center",
    transform: [{ rotate: "3deg" }],
  },
  title: { fontSize: 52, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0, textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  subtitle: { fontSize: 18, fontWeight: "700", color: "rgba(255,255,255,0.9)", marginTop: 4, letterSpacing: 0, textAlign: "center" },
  cardWrap: { width: "100%", maxWidth: 400 },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: radius.lg,
    borderWidth: 3, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 8, height: 8 }, elevation: 8,
    padding: spacing.xl,
    gap: spacing.md,
  },
  cardTitle: { fontSize: 24, fontWeight: "900", color: colors.onSurface, marginBottom: 4, letterSpacing: 0 },
  cardHint: { fontSize: 14, fontWeight: "600", color: colors.muted, marginBottom: spacing.md, lineHeight: 20 },
  inputWrap: { gap: 4 },
  inputLabel: {
    position: "absolute", top: -10, left: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 6,
    fontSize: 11, fontWeight: "800", color: "#3366FF",
    borderRadius: 999,
    borderWidth: 2, borderColor: "#000",
    zIndex: 1,
  },
  input: {
    backgroundColor: "#F3F3F5",
    borderWidth: 2, borderColor: "#000",
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  otpRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginBottom: spacing.md },
  otpBox: {
    width: 44,
    height: 48,
    backgroundColor: "#F3F3F5",
    borderWidth: 2, borderColor: "#000",
    borderRadius: radius.md,
    fontSize: 20,
    fontWeight: "900",
    color: colors.onSurface,
    textAlign: "center",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  err: { color: "#FF3366", marginTop: spacing.xs, fontSize: 13, fontWeight: "700" },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#3366FF",
    borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000",
    paddingVertical: 16,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: 0 },
  ctaOutline: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  ctaOutlineText: { color: "#000", fontSize: 16, fontWeight: "900", letterSpacing: 0 },
  link: { alignItems: "center", marginTop: spacing.md },
  linkText: { color: "#3366FF", fontSize: 13, fontWeight: "800", textDecorationLine: "underline", textDecorationStyle: "solid" },
});
