import { useState, useRef } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, TextInput, Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { CITIES, LOCALITIES, City } from "@/src/data"
import { getErrorMessage } from "@/src/errors";
import { COLLEGES } from "@/src/colleges";
import { colors, spacing, radius, shadows, gradients } from "@/src/theme"

type Mode = "student" | "resident";
type Step = 1 | 2 | 3;

export default function Onboarding() {
  const router = useRouter();
  const { saveLocation } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [city, setCity] = useState<City | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const progress = useRef(new Animated.Value(0.33)).current;

  const animateProgress = (val: number) => {
    Animated.spring(progress, { toValue: val, friction: 7, tension: 40, useNativeDriver: false }).start();
  };

  const goNext = () => {
    const next = (step + 1) as Step;
    setStep(next);
    animateProgress(next / 3);
  };

  const options = !city ? [] : mode === "student" ? COLLEGES[city] : LOCALITIES[city];

  const submit = async () => {
    if (!city || !mode || !pick) return;
    setBusy(true); setErr(null);
    try {
      await saveLocation(
        city,
        pick,
        { userType: mode, college: mode === "student" ? pick : null, name: name || undefined }
      );
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed"));
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <Animated.View entering={Animated.spring({ toValue: 1, friction: 8, useNativeDriver: true })}>
            <Text style={styles.stepLabel}>Who are you? 🤔</Text>
            <Text style={styles.stepSub}>Choose your vibe to get the right feed.</Text>
            <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
              <Pressable
                onPress={() => setMode("student")}
                style={[styles.modeCard, mode === "student" && styles.modeCardActiveBlue]}
              >
                <View style={[styles.modeIcon, mode === "student" && styles.modeIconActiveBlue]}>
                  <Feather name="book-open" size={28} color={mode === "student" ? "#FFFFFF" : "#3366FF"} />
                </View>
                <View>
                  <Text style={[styles.modeTitle, mode === "student" && { color: "#3366FF" }]}>Student 🎓</Text>
                  <Text style={styles.modeSub}>College & Campus life</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setMode("resident")}
                style={[styles.modeCard, mode === "resident" && styles.modeCardActiveLime]}
              >
                <View style={[styles.modeIcon, mode === "resident" && styles.modeIconActiveLime]}>
                  <Feather name="home" size={28} color={mode === "resident" ? "#000" : "#66FF33"} />
                </View>
                <View>
                  <Text style={[styles.modeTitle, mode === "resident" && { color: "#5a9e1f" }]}>Resident 🏠</Text>
                  <Text style={styles.modeSub}>Local community & Neighbors</Text>
                </View>
              </Pressable>
            </View>
            <Pressable onPress={goNext} disabled={!mode} style={[styles.cta, !mode && { opacity: 0.5 }]}>
              <Text style={styles.ctaText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={Animated.spring({ toValue: 1, friction: 8, useNativeDriver: true })}>
            <Text style={styles.stepLabel}>Where you at? 📍</Text>
            <Text style={styles.stepSub}>Delhi NCR is huge.</Text>
            <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
              <View style={styles.pickerRow}>
                {CITIES.map((c) => {
                  const active = city === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => { setCity(c); setPick(null); }}
                      style={[styles.cityChip, active && styles.cityChipActive]}
                    >
                      <Feather name="map-pin" size={14} color={active ? "#FFFFFF" : colors.onSurfaceTertiary} />
                      <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {city && (
                <>
                  <Text style={styles.sectionLabel}>
                    Your {mode === "student" ? "college" : "locality"} ({options.length})
                  </Text>
                  <View style={styles.listBox}>
                    {options.map((l, idx) => {
                      const last = idx === options.length - 1;
                      const active = pick === l;
                      return (
                        <Pressable
                          key={l}
                          onPress={() => setPick(l)}
                          style={[styles.listRow, last && { borderBottomWidth: 0 }, active && styles.listRowActive]}
                        >
                          <Text style={[styles.listRowText, active && styles.listRowTextActive]}>{l}</Text>
                          {active && <Feather name="check" size={18} color={colors.brand} />}
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
              <Pressable onPress={() => setStep(1)} style={[styles.cta, styles.ctaOutline, { flex: 0.4 }]}>
                <Text style={styles.ctaOutlineText}>Back</Text>
              </Pressable>
              <Pressable onPress={goNext} disabled={!pick} style={[styles.cta, { flex: 1 }, !pick && { opacity: 0.5 }]}>
                <Text style={styles.ctaText}>Next</Text>
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={Animated.spring({ toValue: 1, friction: 8, useNativeDriver: true })}>
            <Text style={styles.stepLabel}>Profile drip 💧</Text>
            <Text style={styles.stepSub}>Make it look good.</Text>
            <View style={{ alignItems: "center", marginTop: spacing.lg }}>
              <View style={styles.avatarUpload}>
                <Text style={styles.uploadEmoji}>😎</Text>
                <Text style={styles.uploadText}>Upload</Text>
                <View style={styles.uploadBadge}>
                  <Feather name="plus" size={14} color="#000" />
                </View>
              </View>
              <View style={{ width: "100%", gap: spacing.md, marginTop: spacing.lg }}>
                <View>
                  <Text style={styles.inputLabel2}>Full Name</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={styles.inputBrut}
                    placeholder="Your name"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View>
                  <Text style={styles.inputLabel2}>Date of Birth</Text>
                  <TextInput
                    value={dob}
                    onChangeText={setDob}
                    style={styles.inputBrut}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View>
                  <Text style={styles.inputLabel2}>Gender (Optional)</Text>
                  <View style={styles.genderRow}>
                    {["male", "female", "other"].map((g) => (
                      <Pressable
                        key={g}
                        onPress={() => setGender(g)}
                        style={[styles.genderChip, gender === g && styles.genderChipActive]}
                      >
                        <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                          {g === "male" ? "Male" : g === "female" ? "Female" : "Other"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
              <Pressable onPress={() => setStep(2)} style={[styles.cta, styles.ctaOutline, { flex: 0.4 }]}>
                <Text style={styles.ctaOutlineText}>Back</Text>
              </Pressable>
              <Pressable onPress={submit} disabled={!pick} style={[styles.cta, { flex: 1 }, busy && { opacity: 0.6 }]}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.ctaText}>Enter the Hood 🚀</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            </View>
          </Animated.View>
        )}

        {err && <Text style={styles.errText}>{err}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  progressWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  progressTrack: { height: 10, backgroundColor: colors.surfaceTertiary, borderRadius: 999, borderWidth: 2, borderColor: "#000", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#FF3366", borderRadius: 999 },
  stepLabel: { fontSize: 32, fontWeight: "900", color: colors.onSurface, letterSpacing: -1 },
  stepSub: { fontSize: 18, fontWeight: "700", color: colors.muted, marginTop: 4, lineHeight: 24 },
  modeCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 3, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  modeCardActiveBlue: { backgroundColor: "#E8F0FF", borderColor: "#3366FF" },
  modeCardActiveLime: { backgroundColor: "#EEFBE6", borderColor: "#66FF33" },
  modeIcon: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: "#E8F0FF", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  modeIconActiveBlue: { backgroundColor: "#3366FF" },
  modeIconActiveLime: { backgroundColor: "#66FF33" },
  modeTitle: { fontSize: 20, fontWeight: "900", color: colors.onSurface },
  modeSub: { fontSize: 13, fontWeight: "600", color: colors.muted, marginTop: 2 },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cityChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  cityChipActive: { backgroundColor: "#3366FF", borderColor: "#000" },
  cityChipText: { fontSize: 14, fontWeight: "800", color: colors.onSurfaceTertiary },
  cityChipTextActive: { color: "#FFFFFF" },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: colors.onSurfaceTertiary, marginTop: spacing.lg, marginBottom: spacing.sm },
  listBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: "#000",
  },
  listRowActive: { backgroundColor: "#E6EFE9" },
  listRowText: { fontSize: 15, fontWeight: "700", color: colors.onSurface, flex: 1 },
  listRowTextActive: { color: colors.brand, fontWeight: "800" },
  inputLabel2: {
    position: "absolute", top: -9, left: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    fontSize: 11, fontWeight: "800", color: "#3366FF",
    borderRadius: 999,
    borderWidth: 2, borderColor: "#000",
    zIndex: 1,
  },
  inputBrut: {
    backgroundColor: "#F3F3F5",
    borderWidth: 2, borderColor: "#000",
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  avatarUpload: {
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: "#E5E5E5",
    borderWidth: 4, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 6,
    alignItems: "center", justifyContent: "center",
  },
  uploadEmoji: { fontSize: 40 },
  uploadText: { fontSize: 12, fontWeight: "800", color: "#8E8E88", marginTop: 2 },
  uploadBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#FF3366",
    borderWidth: 3, borderColor: "#000",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  genderRow: { flexDirection: "row", gap: spacing.sm },
  genderChip: {
    flex: 1, paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: "#F3F3F5",
    borderWidth: 2, borderColor: "#000",
    alignItems: "center",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  genderChipActive: { backgroundColor: "#3366FF", borderColor: "#000" },
  genderText: { fontSize: 13, fontWeight: "800", color: colors.onSurfaceTertiary },
  genderTextActive: { color: "#FFFFFF" },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#3366FF",
    borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000",
    paddingVertical: 16, flex: 1,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: -0.3 },
  ctaOutline: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  ctaOutlineText: { color: "#000", fontSize: 16, fontWeight: "900", letterSpacing: -0.3 },
  errText: { color: "#FF3366", textAlign: "center", marginTop: spacing.md, fontWeight: "800", fontSize: 13 },
});

