import React, { useState, useCallback } from "react";
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
import { listGroups } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";
import type { GroupDoc } from "@/src/db";

type Filter = "all" | "mine" | "popular";

export default function GroupsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const city = profile?.city || "";

  const loadGroups = useCallback(async () => {
    if (!city) {
      setGroups([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await listGroups(city);
      setGroups(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [city]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadGroups();
    }, [loadGroups])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  }, [loadGroups]);

  const filteredGroups = React.useMemo(() => {
    if (!profile?.user) return groups;
    const userId = profile.userId;
    switch (filter) {
      case "mine":
        return groups.filter((g) => g.creatorId === userId);
      case "popular":
        return [...groups].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
      default:
        return groups;
    }
  }, [groups, filter, profile]);

  const renderGroup = ({ item }: { item: GroupDoc }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: "/group-detail", params: { id: item.$id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Feather name="users" size={20} color={colors.brand} />
        </View>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          {item.creatorId === profile?.userId && (
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorBadgeText}>Creator</Text>
            </View>
          )}
        </View>
      </View>
      {item.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Feather name="user" size={14} color={colors.muted} />
          <Text style={styles.metaText}>{item.memberCount || 0} members</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={14} color={colors.muted} />
          <Text style={styles.metaText}>
            {item.locality ? `${item.locality}, ${item.city}` : item.city}
          </Text>
        </View>
      </View>
      <Text style={styles.cardCreator}>by {item.creatorName}</Text>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Feather name="users" size={48} color={colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>No groups yet</Text>
      <Text style={styles.emptySubtitle}>Start a community group for your neighbourhood!</Text>
    </View>
  );

  const renderFilterChip = (label: string, value: Filter) => {
    const isActive = filter === value;
    return (
      <Pressable
        key={value}
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => setFilter(value)}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>COMMUNITY GROUPS</Text>
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
          <Text style={styles.headerTitle}>COMMUNITY GROUPS</Text>
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadGroups}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COMMUNITY GROUPS</Text>
      </View>

      <View style={styles.filterRow}>
        {renderFilterChip("All", "all")}
        {renderFilterChip("My Groups", "mine")}
        {renderFilterChip("Popular", "popular")}
      </View>

      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.$id}
        renderItem={renderGroup}
        contentContainerStyle={[styles.listContent, filteredGroups.length === 0 && styles.emptyListContent]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      />

      <Pressable style={styles.fab} onPress={() => router.push("/create-group")}>
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  creatorBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
  },
  creatorBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.onSurfaceTertiary,
    lineHeight: 20,
  },
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
  cardCreator: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xs,
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
