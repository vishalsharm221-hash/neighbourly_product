import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { CITIES, LOCALITIES, City } from "@/src/data";
import { colors, spacing, radius } from "@/src/theme";

export default function Onboarding() {
  const router = useRouter();
  const { saveLocation } = useAuth();
  const [city, setCity] = useState<City | null>(null);
  const [locality, setLocality] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!city || !locality) return;
    setBusy(true);
    setErr(null);
    try {
      await saveLocation(city, locality);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>WELCOME TO NEIGHBOURLY</Text>
        <Text style={styles.title}>Where do you call home?</Text>
        <Text style={styles.subtitle}>
          Pick your city and locality. You will only see posts from your neighbours.
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}>
        <Text style={styles.section}>Your city</Text>
        <View style={styles.cityRow}>
          {CITIES.map((c) => {
            const active = city === c;
            return (
              <Pressable
                key={c}
                testID={`onboard-city-${c}`}
                onPress={() => {
                  setCity(c);
                  setLocality(null);
                }}
                style={[styles.cityChip, active && styles.cityChipActive]}
              >
                <Feather
                  name="map-pin"
                  size={14}
                  color={active ? colors.onBrand : colors.onSurfaceTertiary}
                />
                <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {city && (
          <>
            <Text style={[styles.section, { marginTop: spacing.xl }]}>
              Your locality ({LOCALITIES[city].length} options)
            </Text>
            <View style={styles.localityList}>
              {LOCALITIES[city].map((l, idx) => {
                const active = locality === l;
                const last = idx === LOCALITIES[city].length - 1;
                return (
                  <Pressable
                    key={l}
                    testID={`onboard-locality-${l}`}
                    onPress={() => setLocality(l)}
                    style={[styles.locRow, last && { borderBottomWidth: 0 }, active && styles.locRowActive]}
                  >
                    <Text style={[styles.locText, active && styles.locTextActive]}>{l}</Text>
                    {active && <Feather name="check" size={18} color={colors.brand} />}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <Pressable
          testID="onboard-join-button"
          disabled={!city || !locality || busy}
          onPress={submit}
          style={[styles.cta, (!city || !locality) && { opacity: 0.4 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.ctaText}>Join Neighbourly</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  eyebrow: {
    fontSize: 11, fontWeight: "700", color: colors.brand, letterSpacing: 1.2, marginBottom: spacing.sm,
  },
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
  localityList: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  locRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  locRowActive: { backgroundColor: colors.brandTertiary },
  locText: { fontSize: 15, color: colors.onSurface },
  locTextActive: { color: colors.brand, fontWeight: "700" },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  cta: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 16, alignItems: "center" },
  ctaText: { color: colors.onBrand, fontSize: 16, fontWeight: "700" },
  err: { color: colors.error, fontSize: 13, textAlign: "center", marginBottom: spacing.sm },
});
