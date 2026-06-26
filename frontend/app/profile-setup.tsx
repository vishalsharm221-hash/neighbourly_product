import { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius } from "@/src/theme"
import { getErrorMessage } from "@/src/errors";;

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

export default function ProfileSetup() {
  const router = useRouter();
  const { saveProfileSetup } = useAuth();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [dob, setDob] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!name.trim() || !gender || !dob.trim()) {
      setErr("Fill all fields");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      setErr("Birthday format: YYYY-MM-DD (e.g. 1995-06-21)");
      return;
    }
    setBusy(true);
    try {
      await saveProfileSetup({ name: name.trim(), gender, dob: dob.trim() });
      router.replace("/onboarding");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>STEP 1 OF 2</Text>
          <Text style={styles.title}>Tell us about you</Text>
          <Text style={styles.subtitle}>A few basics so your neighbours know who they are talking to.</Text>

          <Text style={styles.label}>Your name</Text>
          <TextInput
            testID="setup-name-input"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Priya Sharma"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.row}>
            {GENDERS.map((g) => {
              const active = gender === g;
              return (
                <Pressable
                  key={g}
                  testID={`setup-gender-${g}`}
                  onPress={() => setGender(g)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Date of birth</Text>
          <TextInput
            testID="setup-dob-input"
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            style={styles.input}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          {err ? <Text style={styles.err}>{err}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Pressable
          testID="setup-continue"
          disabled={busy}
          onPress={submit}
          style={[styles.cta, busy && { opacity: 0.6 }]}
        >
          {busy ? <ActivityIndicator color={colors.onBrand} /> : (
            <>
              <Text style={styles.ctaText}>Continue</Text>
              <Feather name="arrow-right" size={18} color={colors.onBrand} />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  eyebrow: { fontSize: 11, fontWeight: "700", color: colors.brand, letterSpacing: 1.2, marginBottom: spacing.sm, marginTop: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, lineHeight: 34 },
  subtitle: { fontSize: 15, color: colors.onSurfaceTertiary, marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 21 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg },
  input: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, fontSize: 15, color: colors.onSurface,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  chipTextActive: { color: colors.onBrand },
  err: { color: colors.error, fontSize: 13, marginTop: spacing.md },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  cta: {
    backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 16,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm,
  },
  ctaText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
});


