import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { listServices, ServiceDoc } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

type ServiceTab = "all" | "Plumber" | "Electrician" | "Cleaner" | "Tutor" | "Other";

const TABS: { key: ServiceTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Plumber", label: "Plumber" },
  { key: "Electrician", label: "Electrician" },
  { key: "Cleaner", label: "Cleaner" },
  { key: "Tutor", label: "Tutor" },
  { key: "Other", label: "Other" },
];

const SERVICE_ICONS: Record<string, string> = {
  Plumber: "droplet",
  Electrician: "zap",
  Cleaner: "wind",
  Tutor: "book-open",
  Other: "tool",
};

export default function ServicesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<ServiceTab>("all");

  const load = useCallback(async () => {
    if (!profile?.city) return;
    try {
      const data = await listServices(profile.city);
      setServices(data);
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

  const filtered = tab === "all" ? services : services.filter((s) => s.serviceType === tab);

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars: string[] = [];
    for (let i = 0; i < full; i++) stars.push("★");
    if (half) stars.push("★");
    return stars.join("");
  };

  const renderItem = ({ item }: { item: ServiceDoc }) => {
    const iconName = SERVICE_ICONS[item.serviceType] || "tool";
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push({ pathname: "/service-detail", params: { id: item.$id } })}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconCircle}>
            <Feather name={iconName as any} size={20} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.providerName}>{item.providerName}</Text>
              {item.verified && (
                <Feather name="check-circle" size={14} color={colors.brand} />
              )}
            </View>
            <Text style={styles.serviceType}>{item.serviceType}</Text>
          </View>
          <View style={styles.priceWrap}>
            {item.hourlyRate != null && (
              <Text style={styles.priceText}>₹{item.hourlyRate}/hr</Text>
            )}
          </View>
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description || "Service provider"}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.ratingRow}>
            <Text style={styles.starsText}>{renderStars(item.rating)}</Text>
            <Text style={styles.ratingNum}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount})</Text>
          </View>
          {item.locality ? (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={12} color={colors.muted} />
              <Text style={styles.cardMetaText}>{item.locality}</Text>
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
          <Text style={styles.headerEyebrow}>DIRECTORY</Text>
          <Text style={styles.headerTitle}>SERVICE PROVIDERS</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            testID={`service-tab-${t.key}`}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          testID="services-list"
          data={filtered}
          keyExtractor={(s) => s.$id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="tool" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>No service providers</Text>
              <Text style={styles.emptyText}>
                {tab === "all"
                  ? "Check back soon for verified professionals in your area."
                  : `No ${tab.toLowerCase()}s listed yet.`}
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push("/create-service")}
      >
        <Feather name="plus" size={24} color={colors.onBrand} />
        <Text style={styles.fabText}>Offer Service</Text>
      </Pressable>
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
  tabsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.md },
  tab: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary,
    borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  tabTextActive: { color: colors.onBrand },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: "center" },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  providerName: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  serviceType: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
  priceWrap: { alignItems: "flex-end" },
  priceText: { fontSize: 14, fontWeight: "700", color: colors.brand },
  cardDesc: { fontSize: 13, color: colors.onSurfaceTertiary, lineHeight: 18 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  starsText: { fontSize: 14, color: colors.warning, letterSpacing: -1 },
  ratingNum: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  reviewCount: { fontSize: 12, color: colors.muted },
  cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontSize: 12, color: colors.muted },
  fab: {
    position: "absolute", bottom: 24, right: spacing.lg,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.brand, paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: radius.pill,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: colors.onBrand, fontSize: 14, fontWeight: "700" },
});
