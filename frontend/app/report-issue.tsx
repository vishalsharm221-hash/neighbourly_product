import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { createReport, createSafetyAlert } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

const ALERT_TYPES = [
  { key: "safety", label: "Safety", icon: "shield" },
  { key: "traffic", label: "Traffic", icon: "truck" },
  { key: "utility", label: "Utility", icon: "zap" },
  { key: "lost_found", label: "Lost & Found", icon: "search" },
  { key: "noise", label: "Noise", icon: "volume-2" },
  { key: "other", label: "Other", icon: "more-horizontal" },
];

const SEVERITIES = [
  { key: "info", label: "Info" },
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
];

export default function ReportIssueScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [alertType, setAlertType] = useState("safety");
  const [severity, setSeverity] = useState("info");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState(profile?.locality || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!profile?.userId || !profile?.city) {
      setError("Finish your profile location before reporting an issue.");
      return;
    }
    if (!title.trim() || !details.trim()) {
      setError("Add a short title and details.");
      return;
    }

    setBusy(true);
    try {
      const cleanTitle = title.trim();
      const cleanDetails = details.trim();
      await createReport({
        reporterId: profile.userId,
        reporterName: profile.name || "Neighbor",
        targetType: "local_issue",
        targetId: `${profile.city}:${location || profile.locality || "city"}`,
        reason: alertType,
        details: cleanDetails,
      });
      await createSafetyAlert({
        title: cleanTitle,
        description: cleanDetails,
        alertType,
        severity,
        city: profile.city,
        locality: location.trim() || profile.locality || undefined,
        source: profile.name || "Neighbor report",
      });
      setDone(true);
    } catch (e) {
      console.warn("Failed to submit report", e);
      setError("Could not submit right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.success}>
          <View style={styles.successIcon}>
            <Feather name="check" size={34} color={colors.onBrand} />
          </View>
          <Text style={styles.successTitle}>Report submitted</Text>
          <Text style={styles.successText}>Thanks for helping keep your neighborhood informed.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/safety" as any)}>
            <Text style={styles.primaryText}>View safety alerts</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>LOCAL REPORT</Text>
          <Text style={styles.title}>Report an issue</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.label}>What happened?</Text>
          <View style={styles.typeGrid}>
            {ALERT_TYPES.map((type) => {
              const active = alertType === type.key;
              return (
                <Pressable key={type.key} onPress={() => setAlertType(type.key)} style={[styles.typeCard, active && styles.typeCardActive]}>
                  <Feather name={type.icon as any} size={20} color={active ? colors.onBrand : colors.onSurface} />
                  <Text style={[styles.typeText, active && styles.typeTextActive]} numberOfLines={1}>{type.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Severity</Text>
          <View style={styles.segment}>
            {SEVERITIES.map((item) => {
              const active = severity === item.key;
              return (
                <Pressable key={item.key} onPress={() => setSeverity(item.key)} style={[styles.segmentItem, active && styles.segmentItemActive]}>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Example: Street light out near gate 3"
            placeholderTextColor={colors.muted}
            style={styles.input}
            maxLength={80}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder={profile?.locality || "Locality or landmark"}
            placeholderTextColor={colors.muted}
            style={styles.input}
            maxLength={80}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Details</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Share what people nearby should know."
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
            maxLength={600}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={submit} disabled={busy} style={[styles.primaryBtn, busy && { opacity: 0.65 }]}>
          {busy ? <ActivityIndicator color={colors.onBrand} /> : (
            <>
              <Feather name="send" size={18} color={colors.onBrand} />
              <Text style={styles.primaryText}>Submit report</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000", backgroundColor: "rgba(255,255,255,0.94)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  eyebrow: { fontSize: 10, fontWeight: "800", color: colors.brand, letterSpacing: 1.2 },
  title: { fontSize: 22, fontWeight: "900", color: colors.onSurface },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 },
  section: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: "900", color: colors.onSurface },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeCard: {
    flexBasis: "31%", flexGrow: 1, maxWidth: "32%",
    minHeight: 82, alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 2, borderColor: "#000", padding: spacing.sm,
  },
  typeCardActive: { backgroundColor: colors.brandSecondary },
  typeText: { fontSize: 11, fontWeight: "900", color: colors.onSurface, textAlign: "center" },
  typeTextActive: { color: colors.onBrand },
  segment: {
    flexDirection: "row", backgroundColor: colors.surfaceTertiary,
    borderWidth: 2, borderColor: "#000", borderRadius: radius.md, padding: 3,
  },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.sm },
  segmentItemActive: { backgroundColor: colors.brand },
  segmentText: { fontSize: 12, fontWeight: "800", color: colors.onSurfaceTertiary },
  segmentTextActive: { color: colors.onBrand },
  input: {
    backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: "#000",
    borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13,
    fontSize: 14, fontWeight: "700", color: colors.onSurface,
  },
  textArea: { minHeight: 130, lineHeight: 20 },
  error: { color: colors.error, fontSize: 13, fontWeight: "800" },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.brandSecondary, borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000", paddingVertical: 15,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  primaryText: { color: colors.onBrand, fontSize: 15, fontWeight: "900" },
  secondaryBtn: { paddingVertical: spacing.md },
  secondaryText: { color: colors.brandSecondary, fontSize: 14, fontWeight: "900", textAlign: "center" },
  success: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  successIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandSecondary,
    borderWidth: 3, borderColor: "#000", alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontSize: 22, fontWeight: "900", color: colors.onSurface, textAlign: "center" },
  successText: { fontSize: 14, fontWeight: "600", color: colors.muted, textAlign: "center", lineHeight: 20, marginBottom: spacing.sm },
});
