import { useEffect, useState } from "react";
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
import { colors, spacing, radius, shadows } from "@/src/theme";

export default function AuthScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<"home" | "buttons" | "email" | "otp">("home");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

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
            {/* Blob backgrounds */}
            <View style={styles.blobs}>
              <View style={[styles.blob, { top: -60, left: -40, backgroundColor: "#FF3366" }]} />
              <View style={[styles.blob, { top: "30%", right: -50, backgroundColor: "#3366FF" }]} />
              <View style={[styles.blob, { bottom: -40, left: "20%", backgroundColor: "#66FF33" }]} />
            </View>

            <View style={styles.contentWrap}>
              {/* Logo + Title */}
              <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.logoWrap}>
                  <View style={styles.logoShadow}>
                    <Text style={styles.logoEmoji}>🔥</Text>
                  </View>
                </View>
                <Text style={styles.title}>Localy</Text>
                <Text style={styles.subtitle}>Your hood, your vibe.</Text>
              </Animated.View>

              {/* Cards */}
              <Animated.View style={[styles.cardWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                {step === "home" && (
                  <View style={styles.card}>
                    <Pressable
                      style={[styles.cta, { marginTop: spacing.md }]}
                      onPress={() => goTo("buttons")}
                    >
                      <Text style={styles.ctaText}>Get Started</Text>
                      <Feather name="arrow-right" size={18} color={colors.onBrand} />
                    </Pressable>
                    <Pressable style={[styles.cta, styles.ctaOutline]} onPress={() => goTo("buttons")}>
                      <Feather name="mail" size={18} color={colors.brand} />
                      <Text style={styles.ctaOutlineText}>Sign in with Email</Text>
                    </Pressable>
                  </View>
                )}

                {step === "buttons" && (
                  <View style={styles.card}>
                    <Pressable
                      style={[styles.cta, { marginTop: spacing.md }]}
                      onPress={() => goTo("email")}
                    >
                      <Text style={styles.ctaText}>Get Started</Text>
                      <Feather name="arrow-right" size={18} color={colors.onBrand} />
                    </Pressable>
                    <Pressable style={[styles.cta, styles.ctaOutline]} onPress={() => goTo("email")}>
                      <Feather name="mail" size={18} color={colors.brand} />
                      <Text style={styles.ctaOutlineText}>Sign in with Email</Text>
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
                      <Text style={styles.cardTitle}>Check your mail 👀</Text>
                      <Text style={styles.cardHint}>
                        We sent a code to{" "}
                        <Text style={{ fontWeight: "800", color: colors.onSurface }}>{email}</Text>
                      </Text>
                      <View style={styles.otpRow}>
                        {otp.map((d, i) => (
                          <TextInput
                            key={i}
                            testID={`otp-${i}`}
                            value={d}
                            onChangeText={(v) => setOtpDigit(i, v)}
                            keyboardType="number-pad"
                            maxLength={1}
                            style={styles.otpBox}
                            textAlign="center"
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
                            <Text style={styles.ctaText}>Verify & Slay ✨</Text>
                            <Feather name="check" size={16} color={colors.onBrand} />
                          </View>
                        )}
                      </Pressable>
                      <Pressable testID="auth-change-email" onPress={() => { setOtp(["", "", "", "", "", ""]); setErr(null); goTo("email"); }} style={styles.link}>
                        <Text style={styles.linkText}>Resend code in 0:59</Text>
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
  blobs: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 999,
    opacity: 0.4,
    filter: "blur(60px)",
  },
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
  logoEmoji: { fontSize: 44 },
  title: { fontSize: 56, fontWeight: "900", color: "#FFFFFF", letterSpacing: -2, textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  subtitle: { fontSize: 20, fontWeight: "700", color: "rgba(255,255,255,0.9)", marginTop: 4, letterSpacing: -0.3 },
  cardWrap: { width: "100%", maxWidth: 400 },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: radius.lg,
    borderWidth: 3, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 8, height: 8 }, elevation: 8,
    padding: spacing.xl,
    gap: spacing.md,
  },
  cardTitle: { fontSize: 24, fontWeight: "900", color: colors.onSurface, marginBottom: 4, letterSpacing: -0.5 },
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
  otpRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", marginBottom: spacing.md },
  otpBox: {
    flex: 1,
    height: 56,
    backgroundColor: "#F3F3F5",
    borderWidth: 2, borderColor: "#000",
    borderRadius: radius.md,
    fontSize: 24,
    fontWeight: "900",
    color: colors.onSurface,
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
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: -0.3 },
  ctaOutline: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  ctaOutlineText: { color: "#000", fontSize: 16, fontWeight: "900", letterSpacing: -0.3 },
  link: { alignItems: "center", marginTop: spacing.md },
  linkText: { color: "#3366FF", fontSize: 13, fontWeight: "800", textDecorationLine: "underline", textDecorationStyle: "solid" },
});
