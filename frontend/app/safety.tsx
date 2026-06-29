import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { listSafetyAlerts, SafetyAlertDoc } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

const SEVERITY_CONFIG: Record<
  string,
  { bg: string; text: string; label: string; icon: string }
> = {
  critical: { bg: colors.error, text: colors.onSurfaceInverse, label: "CRITICAL", icon: "alert-triangle" },
  warning: { bg: colors.warning, text: colors.onSurfaceInverse, label: "WARNING", icon: "alert-circle" },
  info: { bg: colors.brand, text: colors.onBrand, label: "INFO", icon: "info" },
  advisory: { bg: "#4A90D9", text: "#FFFFFF", label: "ADVISORY", icon: "info" },
  high: { bg: colors.error, text: colors.onSurfaceInverse, label: "HIGH", icon: "alert-triangle" },
  medium: { bg: colors.warning, text: colors.onSurfaceInverse, label: "MEDIUM", icon: "alert-circle" },
  low: { bg: colors.brand, text: colors.onBrand, label: "LOW", icon: "info" },
};

function getSeverityConf(severity: string) {
  return (
    SEVERITY_CONFIG[severity.toLowerCase()] ?? SEVERITY_CONFIG.info
  );
}

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SafetyScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<SafetyAlertDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.city) return;
    try {
      const data = await listSafetyAlerts(profile.city);
      const sorted = data.sort((a, b) => {
        const order: Record<string, number> = { critical: 0, warning: 1, info: 2, advisory: 3 };
        return (order[a.severity.toLowerCase()] ?? 99) - (order[b.severity.toLowerCase()] ?? 99);
      });
      setAlerts(sorted);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [profile?.city]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderAlert = ({ item }: { item: SafetyAlertDoc }) => {
    const sev = getSeverityConf(item.severity);
    return (
      <Pressable style={styles.card} onPress={() => {}}>
        <View style={styles.cardTop}>
          <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
            <Feather name={sev.icon as any} size={12} color={sev.text} />
            <Text style={[styles.severityText, { color: sev.text }]}>{sev.label}</Text>
          </View>
          {item.expiresAt && (
            <Text style={styles.expires}>Expires {formatDate(item.expiresAt)}</Text>
          )}
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Feather name="tag" size={12} color={colors.muted} />
            <Text style={styles.cardMetaText}>{item.alertType}</Text>
          </View>
          {item.locality ? (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={12} color={colors.muted} />
              <Text style={styles.cardMetaText}>{item.locality}</Text>
            </View>
          ) : null}
          {item.source ? (
            <View style={styles.metaItem}>
              <Feather name="share-2" size={12} color={colors.muted} />
              <Text style={styles.cardMetaText}>{item.source}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.headerEyebrow}>STAY SAFE</Text>
          <Text style={styles.headerTitle}>Safety</Text>
        </View>
        <Pressable style={styles.reportBtn} onPress={() => router.push("/report-issue" as any)}>
          <Feather name="plus" size={18} color={colors.onBrand} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          testID="alerts-list"
          data={alerts}
          keyExtractor={(a) => a.$id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="shield" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>All clear!</Text>
              <Text style={styles.emptyText}>No active alerts in your area</Text>
            </View>
          }
          renderItem={renderAlert}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md,
  },
  headerEyebrow: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  reportBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000",
  },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: "center" },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  severityBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill,
  },
  severityText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  expires: { fontSize: 12, color: colors.muted },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface, lineHeight: 20 },
  cardDesc: { fontSize: 13, color: colors.onSurfaceTertiary, lineHeight: 18, marginTop: 2 },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontSize: 12, color: colors.muted },
});
