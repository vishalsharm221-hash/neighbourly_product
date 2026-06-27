import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius } from "@/src/theme";

const { width: SCREEN_W } = Dimensions.get("window");

type FilterKey = "all" | "post" | "event" | "market" | "business";

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "grid" },
  { key: "post", label: "Posts", icon: "file-text" },
  { key: "event", label: "Events", icon: "calendar" },
  { key: "market", label: "Market", icon: "shopping-bag" },
  { key: "business", label: "Businesses", icon: "briefcase" },
];

const FAKE_ITEMS = [
  { id: "1", type: "post" as FilterKey, title: "Weekend market at Central Park", locality: "Greenwood", distance: "0.3 km" },
  { id: "2", type: "event" as FilterKey, title: "Community Yoga Session", locality: "Riverside", distance: "0.7 km" },
  { id: "3", type: "market" as FilterKey, title: "Handmade pottery for sale", locality: "Old Town", distance: "1.2 km" },
  { id: "4", type: "business" as FilterKey, title: "Joe's Corner Café", locality: "Main Street", distance: "0.5 km" },
  { id: "5", type: "post" as FilterKey, title: "Lost cat — brown tabby", locality: "Maple Lane", distance: "0.9 km" },
  { id: "6", type: "event" as FilterKey, title: "Street Food Festival 2026", locality: "Harbor View", distance: "2.1 km" },
  { id: "7", type: "market" as FilterKey, title: "Vintage bicycle for sale", locality: "East End", distance: "1.5 km" },
  { id: "8", type: "business" as FilterKey, title: "QuickFix Plumbing", locality: "Northside", distance: "0.4 km" },
];

const TYPE_ICON: Record<FilterKey, string> = {
  all: "map-pin",
  post: "file-text",
  event: "calendar",
  market: "shopping-bag",
  business: "briefcase",
};

export default function MapView() {
  const router = useRouter();
  const { profile } = useAuth();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Placeholder focus hook — real implementation would centre map on user's locality
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const city = profile?.city ?? "Your City";
  const locality = profile?.locality ?? "Your Locality";

  const filtered = filter === "all" ? FAKE_ITEMS : FAKE_ITEMS.filter((i) => i.type === filter);

  const renderChip = (f: typeof FILTERS[number]) => {
    const active = filter === f.key;
    return (
      <Pressable
        key={f.key}
        testID={`map-filter-${f.key}`}
        onPress={() => setFilter(f.key)}
        style={[
          styles.chip,
          active && { backgroundColor: colors.brand, borderColor: colors.brand },
        ]}
      >
        <Feather name={f.icon as any} size={14} color={active ? colors.onBrand : colors.onSurfaceTertiary} />
        <Text style={[styles.chipText, active && { color: colors.onBrand }]}>{f.label}</Text>
      </Pressable>
    );
  };

  const renderItem = ({ item }: { item: typeof FAKE_ITEMS[number] }) => {
    const iconName = TYPE_ICON[item.type] || "map-pin";
    return (
      <View style={styles.card}>
        <View style={styles.cardIconWrap}>
          <Feather name={iconName as any} size={16} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.cardMetaRow}>
            <Feather name="map-pin" size={12} color={colors.muted} />
            <Text style={styles.cardMetaText}>{item.locality}</Text>
            <View style={styles.dot} />
            <Feather name="navigation" size={12} color={colors.muted} />
            <Text style={styles.cardMetaText}>{item.distance}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="map-back" onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>MAP VIEW</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.locationBar}>
        <Feather name="map-pin" size={14} color={colors.brand} />
        <Text style={styles.locationText}>
          {locality}, {city}
        </Text>
      </View>

      <FlatList
        data={FILTERS}
        horizontal
        keyExtractor={(f) => f.key}
        renderItem={({ item }) => renderChip(item)}
        contentContainerStyle={styles.chipRow}
        showsHorizontalScrollIndicator={false}
      />

      <View style={styles.mapPlaceholder}>
        <View style={styles.grid}>
          <View style={styles.gridInner}>
            {Array.from({ length: 40 }).map((_, i) => (
              <View key={i} style={styles.gridCell} />
            ))}
          </View>
          <View style={styles.mapOverlay}>
            <Feather name="map" size={48} color={colors.borderStrong} />
            <Text style={styles.mapPlaceholderText}>Map area</Text>
            <Text style={styles.mapPlaceholderSub}>Items appear here when map is enabled</Text>
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listBelow}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Feather name="map" size={32} color={colors.muted} />
              <Text style={styles.emptyText}>No items match this filter</Text>
            </View>
          }
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Map integration coming soon — powered by Mapbox/Google Maps</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  locationBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  locationText: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  chipRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  chip: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
  },
  grid: {
    height: 220,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  gridInner: {
    flex: 1,
    flexDirection: "row", flexWrap: "wrap",
    padding: 1,
  },
  gridCell: {
    width: (SCREEN_W - 2) / 8,
    height: (220 - 2) / 5,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  mapOverlay: {
    position: "absolute", inset: 0,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(251,251,249,0.7)",
    gap: spacing.sm,
  },
  mapPlaceholderText: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceTertiary },
  mapPlaceholderSub: { fontSize: 12, color: colors.muted },
  listBelow: { padding: spacing.lg },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  cardIconWrap: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.onSurface },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  cardMetaText: { fontSize: 12, color: colors.muted },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginHorizontal: 4 },
  emptyList: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.muted },
  footer: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  footerText: { fontSize: 12, color: colors.muted, textAlign: "center", fontStyle: "italic" },
});
