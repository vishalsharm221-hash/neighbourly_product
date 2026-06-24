import { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { CITIES, LOCALITIES, City } from "@/src/data";
import { COLLEGES } from "@/src/colleges";
import { colors, spacing, radius } from "@/src/theme";

type Mode = "resident" | "student";

export default function Onboarding() {
  const router = useRouter();
  const { saveLocation } = useAuth();
  const [city, setCity] = useState<City | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const options = !city ? [] : mode === "student" ? COLLEGES[city] : LOCALITIES[city];

  const submit = async () => {
    if (!city || !mode || !pick) return;
    setBusy(true); setErr(null);
    try {
      await saveLocation(
        city,
        pick,
        { userType: mode, college: mode === "student" ? pick : null }
      );
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally { setBusy(false); }
  };

  const canSubmit = city && mode && pick;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>WELCOME TO NEIGHBOURLY</Text>
        <Text style={styles.title}>Where do you call home?</Text>
        <Text style={styles.subtitle}>Pick your city, then tell us if you live here or study at a local college.</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}>
        <Text style={styles.section}>1. Your city</Text>
        <View style={styles.cityRow}>
          {CITIES.map((c) => {
            const active = city === c;
            return (
              <Pressable
                key={c}
                testID={`onboard-city-${c}`}
                onPress={() => { setCity(c); setMode(null); setPick(null); }}
                style={[styles.cityChip, active && styles.cityChipActive]}
              >
                <Feather name="map-pin" size={14} color={active ? colors.onBrand : colors.onSurfaceTertiary} />
                <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>

        {city && (
          <>
            <Text style={[styles.section, { marginTop: spacing.xl }]}>2. I am here as a…</Text>
            <View style={styles.modeRow}>
              <ModeCard
                active={mode === "resident"}
                testID="onboard-mode-resident"
                icon="home"
                title="Resident"
                subtitle={`I live in a ${city} locality`}
                onPress={() => { setMode("resident"); setPick(null); }}
              />
              <ModeCard
                active={mode === "student"}
                testID="onboard-mode-student"
                icon="book-open"
                title="Student"
                subtitle={`I study at a ${city} college`}
                onPress={() => { setMode("student"); setPick(null); }}
              />
            </View>
          </>
        )}

        {city && mode && (
          <>
            <Text style={[styles.section, { marginTop: spacing.xl }]}>
              3. Your {mode === "student" ? "college" : "locality"} ({options.length})
            </Text>
            <View style={styles.list}>
              {options.map((l, idx) => {
                const active = pick === l;
                const last = idx === options.length - 1;
                return (
                  <Pressable
                    key={l}
                    testID={`onboard-pick-${l}`}
                    onPress={() => setPick(l)}
                    style={[styles.row, last && { borderBottomWidth: 0 }, active && styles.rowActive]}
                  >
                    {mode === "student" && idx === 0 && city === "Ghaziabad" && (
                      <View style={styles.featuredDot} />
                    )}
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{l}</Text>
                    {active && <Feather name="check" size={18} color={colors.brand} />}
                  </Pressable>
                );
              })}
            </View>
            {mode === "student" && city === "Ghaziabad" && (
              <Text style={styles.featuredHint}>★ SDGI Global University — Launch partner</Text>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <Pressable
          testID="onboard-join-button"
          disabled={!canSubmit || busy}
          onPress={submit}
          style={[styles.cta, !canSubmit && { opacity: 0.4 }]}
        >
          {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.ctaText}>Join Neighbourly</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ModeCard({ active, icon, title, subtitle, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.modeCard, active && styles.modeCardActive]}>
      <View style={[styles.modeIcon, active && styles.modeIconActive]}>
        <Feather name={icon} size={20} color={active ? colors.onBrand : colors.brand} />
      </View>
      <Text style={[styles.modeTitle, active && { color: colors.brand }]}>{title}</Text>
      <Text style={styles.modeSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  eyebrow: { fontSize: 11, fontWeight: "700", color: colors.brand, letterSpacing: 1.2, marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, lineHeight: 34 },
  subtitle: { fontSize: 15, color: colors.onSurfaceTertiary, marginTop: spacing.sm, lineHeight: 21 },
  section: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary, marginBottom: spacing.md },
  cityRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cityChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
  },
  cityChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  cityChipText: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceTertiary },
  cityChipTextActive: { color: colors.onBrand },
  modeRow: { flexDirection: "row", gap: spacing.md },
  modeCard: {
    flex: 1, padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  modeCardActive: { borderColor: colors.brand, backgroundColor: colors.brandTertiary },
  modeIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  modeIconActive: { backgroundColor: colors.brand },
  modeTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  modeSubtitle: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 },
  list: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 14, gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowActive: { backgroundColor: colors.brandTertiary },
  rowText: { flex: 1, fontSize: 15, color: colors.onSurface },
  rowTextActive: { color: colors.brand, fontWeight: "700" },
  featuredDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  featuredHint: { fontSize: 12, color: colors.warning, marginTop: spacing.sm, fontWeight: "600" },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  cta: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 16, alignItems: "center" },
  ctaText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
  err: { color: colors.error, fontSize: 13, textAlign: "center", marginBottom: spacing.sm },
});
