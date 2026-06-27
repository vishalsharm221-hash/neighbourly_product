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
import { listGroups, isFollowing, follow, unfollow } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";
import type { GroupDoc } from "@/src/db";

type Filter = "all" | "mine" | "popular";

export default function GroupsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [followMap, setFollowMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

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
      if (!profile?.userId || groups.length === 0) return;
      const ids = Array.from(new Set(groups.map((g) => g.creatorId)));
      const results = await Promise.all(ids.map((id) => isFollowing(profile.userId, id)));
      const map: Record<string, string | null> = {};
      ids.forEach((id, i) => { map[id] = results[i]; });
      setFollowMap(map);
    })();
  }, [groups.length, profile?.userId]);

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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <Text style={styles.cardCreator}>by </Text>
        <Pressable onPress={() => router.push({ pathname: "/user-profile", params: { userId: item.creatorId, name: item.creatorName } })}>
          <Text style={[styles.cardCreator, { color: colors.brand, fontWeight: "600" }]}>{item.creatorName}</Text>
        </Pressable>
        {profile?.userId !== item.creatorId && (
          <Pressable
            onPress={() => toggleFollow(item.creatorId)}
            style={[styles.miniFollow, followMap[item.creatorId] && styles.miniFollowActive]}
          >
            <Text style={[styles.miniFollowText, followMap[item.creatorId] && styles.miniFollowTextActive]}>
              {followMap[item.creatorId] ? "Following" : "Follow"}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Feather name="users" size={48} color={colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>No squads yet</Text>
      <Text style={styles.emptySubtitle}>Start one — find your people in the hood 👥</Text>
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
          <Text style={styles.headerTitle}>Squads 👥</Text>
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
          <Text style={styles.headerTitle}>Squads 👥</Text>
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
        <Text style={styles.headerTitle}>Squads 👥</Text>
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
  root: { flex: 1, backgroundColor: "#FBFBF9" },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: "#000",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: "#000",
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#F3F3F5",
  },
  chipActive: {
    backgroundColor: "#3366FF",
    borderColor: "#000",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#000",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#000",
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F3F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
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
    fontWeight: "900",
    color: "#000",
  },
  creatorBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "#F3F3F5",
    borderWidth: 2,
    borderColor: "#000",
  },
  creatorBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#3366FF",
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
    fontWeight: "500",
  },
  cardMeta: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  miniFollow: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
    borderWidth: 2, borderColor: "#3366FF", backgroundColor: "#F3F3F5",
  },
  miniFollowActive: { backgroundColor: "#3366FF" },
  miniFollowText: { fontSize: 10, fontWeight: "800", color: "#3366FF" },
  miniFollowTextActive: { color: "#FFFFFF" },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#000",
    fontWeight: "600",
  },
  cardCreator: {
    fontSize: 12,
    color: "#000",
    marginTop: spacing.xs,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3366FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 4,
    borderWidth: 3,
    borderColor: "#000",
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
    backgroundColor: "#F3F3F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 3,
    borderColor: "#000",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#000",
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
    fontWeight: "500",
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
    fontWeight: "900",
    color: "#000",
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: 14,
    color: "#000",
    textAlign: "center",
    marginTop: spacing.sm,
    fontWeight: "500",
  },
  retryBtn: {
    backgroundColor: "#3366FF",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    marginTop: spacing.lg,
    borderWidth: 3,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 4,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
