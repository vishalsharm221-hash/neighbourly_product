import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { useAuth } from "@/src/auth-context";
import { createPoll } from "@/src/db";
import { getErrorMessage } from "@/src/errors";
import { colors, spacing, radius } from "@/src/theme";

const pollSchema = z.object({
  question: z.string().min(1, "Question is required").max(500, "Max 500 characters"),
  options: z.array(z.string().min(1, "Option cannot be empty")).min(2, "Add at least 2 options").max(6, "Max 6 options"),
  city: z.string().min(1, "City is required"),
  locality: z.string().optional().default(""),
  expiresAt: z.string().optional().default(""),
});

export default function CreatePoll() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [city, setCity] = useState(profile?.city || "");
  const [locality, setLocality] = useState(profile?.locality || "");
  const [expiryDate, setExpiryDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const submit = async () => {
    const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    const parsed = pollSchema.safeParse({
      question: question.trim(),
      options: trimmedOptions,
      city: city.trim(),
      locality: locality.trim(),
      expiresAt: expiryDate.trim(),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setErr(issue.message);
      return;
    }
    if (trimmedOptions.length < 2) {
      setErr("Add at least 2 options");
      return;
    }
    if (!user) { setErr("Not signed in"); return; }
    if (!profile) { setErr("Profile not loaded"); return; }
    setBusy(true);
    setErr(null);
    try {
      const data: Record<string, unknown> = {
        creatorId: user.$id,
        creatorName: profile.name,
        question: question.trim(),
        options: trimmedOptions,
        city: city.trim(),
        totalVotes: 0,
      };
      if (locality.trim()) data.locality = locality.trim();
      if (expiryDate.trim()) data.expiresAt = new Date(expiryDate.trim()).toISOString();
      await createPoll(data as Parameters<typeof createPoll>[0]);
      router.back();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to create poll"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="poll-cancel">
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>New Poll 📊</Text>
        <Pressable
          testID="poll-submit"
          onPress={submit}
          disabled={busy}
          style={[styles.postBtn, busy && { opacity: 0.4 }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <Text style={styles.postBtnText}>Publish</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          <Field label="Question (required)">
            <TextInput
              testID="poll-question-input"
              value={question}
              onChangeText={setQuestion}
              placeholder="What do you want to ask?"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={500}
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
            />
            <Text style={styles.charCount}>{question.length}/500</Text>
          </Field>

          <Field label={`Options (${options.filter((o) => o.trim().length > 0).length}/6)`}>
            {options.map((opt, i) => (
              <View key={i} style={styles.optionInputRow}>
                <View style={styles.optionIndexCircle}>
                  <Text style={styles.optionIndexText}>{i + 1}</Text>
                </View>
                <TextInput
                  value={opt}
                  onChangeText={(t) => updateOption(i, t)}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={colors.muted}
                  style={styles.optionInput}
                />
                {options.length > 2 ? (
                  <Pressable onPress={() => removeOption(i)} hitSlop={8} style={styles.removeOptionBtn}>
                    <Feather name="x" size={18} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {options.length < 6 ? (
              <Pressable onPress={addOption} style={styles.addOptionBtn}>
                <Feather name="plus" size={18} color={colors.brand} />
                <Text style={styles.addOptionText}>Add option</Text>
              </Pressable>
            ) : null}
          </Field>

          <Field label="City">
            <TextInput
              testID="poll-city-input"
              value={city}
              onChangeText={setCity}
              placeholder="Your city"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>

          <Field label="Locality (optional)">
            <TextInput
              testID="poll-locality-input"
              value={locality}
              onChangeText={setLocality}
              placeholder="e.g. Koramangala"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>

          <Field label="Expiry date (optional)">
            <TextInput
              testID="poll-expiry-input"
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>

          {err ? <Text style={styles.err}>{err}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 18, fontWeight: "900", color: colors.onSurface, textAlign: "center", letterSpacing: -0.3 },
  postBtn: {
    backgroundColor: "#3366FF",
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  postBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  label: { fontSize: 12, fontWeight: "800", color: colors.onSurfaceTertiary, letterSpacing: 0.5, marginBottom: spacing.sm },
  input: {
    backgroundColor: "#F3F3F5", borderRadius: radius.md,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    padding: spacing.md, fontSize: 15, color: colors.onSurface,
  },
  charCount: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 4 },
  optionInputRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm,
  },
  optionIndexCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceTertiary,
    borderWidth: 2, borderColor: "#000",
    alignItems: "center", justifyContent: "center",
  },
  optionIndexText: { fontSize: 12, fontWeight: "900", color: colors.onSurfaceTertiary },
  optionInput: {
    flex: 1,
    backgroundColor: "#F3F3F5", borderRadius: radius.md,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    padding: spacing.md, fontSize: 15, color: colors.onSurface,
  },
  removeOptionBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceTertiary,
    borderWidth: 2, borderColor: "#000",
    alignItems: "center", justifyContent: "center",
  },
  addOptionBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  addOptionText: { color: colors.brand, fontSize: 14, fontWeight: "700" },
  err: { color: "#FF3366", fontSize: 13, marginTop: spacing.sm, fontWeight: "700" },
});
