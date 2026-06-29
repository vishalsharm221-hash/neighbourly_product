import { useState } from "react";
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { createEvent } from "@/src/db"
import { getErrorMessage } from "@/src/errors";
import { colors, spacing, radius, shadows } from "@/src/theme"

export default function CreateEvent() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || !description.trim() || !date.trim() || !location.trim()) {
      setErr("Fill all fields");
      return;
    }
    if (!user) { setErr("Not signed in"); return; }
    if (!profile) { setErr("Profile not loaded"); return; }
    setBusy(true);
    setErr(null);
    try {
      await createEvent({
        hostId: user.$id,
        hostName: profile.name,
        title: title.trim(),
        description: description.trim(),
        date: date.trim(),
        location: location.trim(),
        city: profile.city!,
        locality: profile.locality || undefined,
      });
      router.back();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="event-cancel">
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>New Event 🎪</Text>
        <Pressable
          testID="event-submit"
          onPress={submit}
          disabled={busy}
          style={[styles.postBtn, busy && { opacity: 0.4 }]}
        >
          {busy ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Text style={styles.postBtnText}>Post</Text>}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          <Field label="Event title">
            <TextInput
              testID="event-title-input"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Sunday Morning Yoga"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>

          <Field label="Description">
            <TextInput
              testID="event-desc-input"
              value={description}
              onChangeText={setDescription}
              placeholder="What is happening, who is welcome, what to bring…"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
            />
          </Field>

          <Field label="Date (YYYY-MM-DD)">
            <TextInput
              testID="event-date-input"
              value={date}
              onChangeText={setDate}
              placeholder="2026-07-15"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>

          <Field label="Location">
            <TextInput
              testID="event-location-input"
              value={location}
              onChangeText={setLocation}
              placeholder={`e.g. ${profile?.locality} park`}
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
  label: {
    position: "absolute", top: -8, left: 14,
    backgroundColor: colors.surface, paddingHorizontal: 6,
    fontSize: 11, fontWeight: "800", color: "#3366FF",
    borderRadius: 999,
    borderWidth: 2, borderColor: "#000",
    zIndex: 1,
  },
  input: {
    backgroundColor: "#F3F3F5", borderRadius: radius.md,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    padding: spacing.md, fontSize: 15, color: colors.onSurface,
  },
  err: { color: "#FF3366", fontSize: 13, fontWeight: "700" },
});


