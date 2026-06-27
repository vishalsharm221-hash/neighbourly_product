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
import { listPolls, getPollVote, type PollDoc, isFollowing, follow, unfollow } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

export default function PollsScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [polls, setPolls] = useState<PollDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votedMap, setVotedMap] = useState<Record<string, boolean>>({});
  const [followMap, setFollowMap] = useState<Record<string, string | null>>({});

  const city = profile?.city || "";

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

  const loadPolls = useCallback(async () => {
    if (!city || !user?.$id) {
      setPolls([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await listPolls(city);
      setPolls(data);
      const voteChecks: Record<string, boolean> = {};
      await Promise.all(
        data.map(async (p) => {
          const v = await getPollVote(p.$id, user.$id);
          if (v) voteChecks[p.$id] = true;
        })
      );
      setVotedMap(voteChecks);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load polls");
    } finally {
      setLoading(false);
    }
  }, [city, user?.$id]);

  useEffect(() => {
    (async () => {
      if (!profile?.userId || polls.length === 0) return;
      const ids = Array.from(new Set(polls.map((p) => p.creatorId)));
      const results = await Promise.all(ids.map((id) => isFollowing(profile.userId, id)));
      const map: Record<string, string | null> = {};
      ids.forEach((id, i) => { map[id] = results[i]; });
      setFollowMap(map);
    })();
  }, [polls.length, profile?.userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPolls();
    }, [loadPolls])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPolls();
    setRefreshing(false);
  }, [loadPolls]);

  const renderPoll = ({ item }: { item: PollDoc }) => {
    const hasVoted = votedMap[item.$id];
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push({ pathname: "/poll-detail", params: { id: item.$id } })}
      >
        <Text style={styles.question} numberOfLines={3}>{item.question}</Text>
        <View style={styles.optionsRow}>
          {item.options.slice(0, 4).map((opt, i) => (
            <View key={i} style={[styles.optionPill, hasVoted && styles.optionPillVoted]}>
              <Text style={[styles.optionPillText, hasVoted && styles.optionPillTextVoted]}>{opt}</Text>
            </View>
          ))}
          {item.options.length > 4 ? (
            <View style={[styles.optionPill, styles.optionPillMore]}>
              <Text style={styles.optionPillText}>+{item.options.length - 4}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <Feather name="user" size={14} color={colors.muted} />
            <Pressable onPress={() => router.push({ pathname: "/user-profile", params: { userId: item.creatorId, name: item.creatorName } })}>
              <Text style={[styles.metaText, { color: colors.brand, fontWeight: "600" }]}>{item.creatorName}</Text>
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
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{timeAgo(item.$createdAt)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={14} color={colors.muted} />
            <Text style={styles.metaText}>
              {item.locality ? `${item.locality}, ${item.city}` : item.city}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Feather name="users" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{item.totalVotes || 0} votes</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          {hasVoted ? (
            <View style={styles.votedBadge}>
              <Feather name="check-circle" size={16} color={colors.onBrand} />
              <Text style={styles.votedBadgeText}>Voted</Text>
            </View>
          ) : (
            <Pressable
              style={styles.voteBtn}
              onPress={(e) => {
                e.stopPropagation();
                router.push({ pathname: "/poll-detail", params: { id: item.$id } });
              }}
            >
              <Text style={styles.voteBtnText}>Vote</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Feather name="bar-chart-2" size={48} color={colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>No polls rn 📊</Text>
      <Text style={styles.emptySubtitle}>Create one — ask the hood what they think!</Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Polls 📊</Text>
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
          <Text style={styles.headerTitle}>Polls 📊</Text>
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadPolls}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Polls 📊</Text>
      </View>
      <FlatList
        data={polls}
        keyExtractor={(item) => item.$id}
        renderItem={renderPoll}
        contentContainerStyle={[styles.listContent, polls.length === 0 && styles.emptyListContent]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      />
      <Pressable style={styles.fab} onPress={() => router.push("/create-poll")}>
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
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: "#000",
    textAlign: "center",
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
    gap: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 4,
  },
  question: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    lineHeight: 22,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#F3F3F5",
  },
  optionPillVoted: {
    borderColor: "#3366FF",
    backgroundColor: "#FBFBF9",
  },
  optionPillText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#000",
  },
  optionPillTextVoted: {
    color: "#3366FF",
  },
  optionPillMore: {
    backgroundColor: "#F3F3F5",
  },
  cardFooter: {
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#000",
    fontWeight: "600",
  },
  metaDot: {
    fontSize: 12,
    color: "#000",
    marginHorizontal: 2,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 2,
    borderTopColor: "#000",
    paddingTop: spacing.sm,
  },
  voteBtn: {
    backgroundColor: "#3366FF",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 4,
  },
  voteBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  votedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#66FF33",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#000",
  },
  votedBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#000",
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
  miniFollow: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
    borderWidth: 2, borderColor: "#3366FF", backgroundColor: "#F3F3F5",
  },
  miniFollowActive: { backgroundColor: "#3366FF" },
  miniFollowText: { fontSize: 10, fontWeight: "800", color: "#3366FF" },
  miniFollowTextActive: { color: "#FFFFFF" },
});
