import React, { useState, useCallback, useEffect } from "react";
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
import { listBusinesses, isFollowing, follow, unfollow } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";
import type { BusinessDoc } from "@/src/db";

type CategoryFilter = string;

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "Restaurant", label: "Restaurant" },
  { key: "Cafe", label: "Cafe" },
  { key: "Plumber", label: "Plumber" },
  { key: "Electrician", label: "Electrician" },
  { key: "Cleaner", label: "Cleaner" },
  { key: "Tutor", label: "Tutor" },
  { key: "Other", label: "Other" },
];

export default function BusinessesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessDoc[]>([]);
  const [followMap, setFollowMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("all");

  const ensureFollow = async (uid: string) => {
    if (!profile?.userId || followMap[uid] !== undefined) return;
    const fid = await isFollowing(profile.userId, uid);
    setFollowMap((prev) => ({ ...prev, [uid]: fid }));
  };

  const toggleFollow = async (uid: string) => {
    if (!profile?.userId || !profile?.$id) return;
    const current = followMap[uid];
    if (current) {
      await unfollow(current, profile.$id);
      setFollowMap((prev) => ({ ...prev, [uid]: null }));
    } else {
      const doc = await follow(profile.userId, uid, profile.$id, "");
      setFollowMap((prev) => ({ ...prev, [uid]: doc.$id }));
    }
  };

  useEffect(() => {
    (async () => {
      if (!profile?.userId || businesses.length === 0) return;
      const ids = Array.from(new Set(businesses.map((b) => b.ownerId)));
      const results = await Promise.all(ids.map((id) => isFollowing(profile.userId, id)));
      const map: Record<string, string | null> = {};
      ids.forEach((id, i) => { map[id] = results[i]; });
      setFollowMap(map);
    })();
  }, [businesses.length, profile?.userId]);

  const city = profile?.city || "";

  const loadBusinesses = useCallback(async () => {
    if (!city) {
      setBusinesses([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await listBusinesses(city, category === "all" ? undefined : category);
      setBusinesses(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }, [city, category]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadBusinesses();
    }, [loadBusinesses])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBusinesses();
    setRefreshing(false);
  }, [loadBusinesses]);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Feather key={i} name="star" size={14} color="#B58500" />
        );
      } else if (i === fullStars && hasHalf) {
        stars.push(
          <Feather key={i} name="star" size={14} color="#B58500" style={{ opacity: 0.5 }} />
        );
      } else {
        stars.push(
          <Feather key={i} name="star" size={14} color={colors.borderStrong} />
        );
      }
    }
    return stars;
  };

  const renderBusiness = ({ item }: { item: BusinessDoc }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: "/business-detail", params: { id: item.$id } })}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.businessIcon}>
          <Feather
            name={
              item.category === "Restaurant"
                ? "coffee"
                : item.category === "Cafe"
                ? "coffee"
                : item.category === "Plumber"
                ? "tool"
                : item.category === "Electrician"
                ? "zap"
                : item.category === "Cleaner"
                ? "refresh-cw"
                : item.category === "Tutor"
                ? "book-open"
                : "briefcase"
            }
            size={22}
            color={colors.brand}
          />
        </View>
        <View style={styles.businessInfo}>
          <View style={styles.businessNameRow}>
            <Text style={styles.businessName} numberOfLines={1}>{item.name}</Text>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={14} color={colors.brand} />
              </View>
            )}
          </View>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{item.category}</Text>
          </View>
        </View>
      </View>

      <View style={styles.ratingRow}>
        <View style={styles.starsRow}>{renderStars(item.rating)}</View>
        <Text style={styles.ratingText}>
          {item.rating.toFixed(1)} ({item.reviewCount || 0})
        </Text>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={14} color={colors.muted} />
          <Text style={styles.metaText}>
            {item.locality ? `${item.locality}, ${item.city}` : item.city}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Feather name="briefcase" size={48} color={colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>No businesses found</Text>
      <Text style={styles.emptySubtitle}>
        {category === "all"
          ? "No businesses listed yet. Be the first to add one!"
          : `No ${category.toLowerCase()} businesses found in your area.`}
      </Text>
    </View>
  );

  const renderCategoryChip = (cat: { key: string; label: string }) => {
    const isActive = category === cat.key;
    return (
      <Pressable
        key={cat.key}
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => setCategory(cat.key)}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.label}</Text>
      </Pressable>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LOCAL BUSINESSES</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LOCAL BUSINESSES</Text>
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadBusinesses}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LOCAL BUSINESSES</Text>
      </View>

      <View style={styles.filterRow}>
        {CATEGORIES.map(renderCategoryChip)}
      </View>

      <FlatList
        data={businesses}
        keyExtractor={(item) => item.$id}
        renderItem={renderBusiness}
        contentContainerStyle={[styles.listContent, businesses.length === 0 && styles.emptyListContent]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      />

      <Pressable style={styles.fab} onPress={() => router.push("/create-business")}>
        <Feather name="plus" size={28} color={colors.onBrand} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: colors.onSurface,
    textAlign: "center",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceTertiary,
  },
  chipTextActive: {
    color: colors.onBrand,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  emptyListContent: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  businessIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  businessInfo: { flex: 1 },
  businessNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  businessName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  verifiedBadge: {
    marginLeft: spacing.xs,
  },
  categoryChip: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    marginTop: spacing.xs,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.3,
    textTransform: "capitalize",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  starsRow: { flexDirection: "row", gap: 2 },
  ratingText: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  cardMeta: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  retryBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
  retryBtnText: {
    color: colors.onBrand,
    fontSize: 14,
    fontWeight: "700",
  },
});
