import { useCallback, useState } from "react";
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
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/auth-context";
import {
  PostDoc,
  listPosts,
  fetchLikeMap,
  likePost,
  unlikePost,
  imagePreviewUrl,
} from "@/src/db";
import { CATEGORIES } from "@/src/data";
import { colors, spacing, radius } from "@/src/theme";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function catColor(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.color || colors.muted;
}
function catLabel(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.label || key;
}

export default function Feed() {
  const router = useRouter();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [likeMap, setLikeMap] = useState<{ counts: Record<string, number>; mine: Record<string, string> }>({ counts: {}, mine: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    if (!profile?.city) return;
    try {
      const collegeScope = profile.userType === "student" ? profile.college : null;
      const data = await listPosts(profile.city, filter, collegeScope);
      setPosts(data);
      if (profile.userId) {
        const ids = data.map((p) => p.$id);
        const lm = await fetchLikeMap(ids, profile.userId);
        setLikeMap(lm);
      }
    } catch (e) {
      console.warn(e);
    }
  }, [profile?.city, profile?.userId, profile?.userType, profile?.college, filter]);

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

  const onLike = async (p: PostDoc) => {
    if (!profile?.userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const liked = !!likeMap.mine[p.$id];
    // optimistic
    setLikeMap((prev) => {
      const counts = { ...prev.counts };
      const mine = { ...prev.mine };
      if (liked) {
        counts[p.$id] = Math.max(0, (counts[p.$id] || 1) - 1);
        delete mine[p.$id];
      } else {
        counts[p.$id] = (counts[p.$id] || 0) + 1;
        mine[p.$id] = "pending";
      }
      return { counts, mine };
    });
    try {
      if (liked) {
        await unlikePost(likeMap.mine[p.$id]);
      } else {
        const doc = await likePost(p.$id, profile.userId);
        setLikeMap((prev) => ({ ...prev, mine: { ...prev.mine, [p.$id]: (doc as any).$id } }));
      }
    } catch {
      load();
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>YOUR {profile?.userType === "student" ? "COLLEGE" : "NEIGHBOURHOOD"}</Text>
          <Text testID="feed-locality" style={styles.headerTitle}>
            <Feather name={profile?.userType === "student" ? "book-open" : "map-pin"} size={16} color={colors.brand} />{" "}
            {profile?.userType === "student" ? profile?.college : profile?.locality} · {profile?.city}
          </Text>
        </View>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {[{ key: "all", label: "All" }, ...CATEGORIES].map((c) => {
            const active = filter === c.key;
            return (
              <Pressable
                key={c.key}
                testID={`feed-filter-${c.key}`}
                onPress={() => setFilter(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          testID="feed-list"
          data={posts}
          keyExtractor={(item) => item.$id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={32} color={colors.muted} />
              <Text style={styles.emptyTitle}>No posts in {profile?.locality} yet</Text>
              <Text style={styles.emptyText}>Be the first to start a conversation with your neighbours.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const liked = !!likeMap.mine[item.$id];
            const likes = likeMap.counts[item.$id] || 0;
            return (
              <View testID={`post-${item.$id}`} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.authorName?.[0]?.toUpperCase() || "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={styles.author}>{item.authorName}</Text>
                      {item.authorVerified && (
                        <Feather name="check-circle" size={13} color={colors.brand} />
                      )}
                    </View>
                    <Text style={styles.meta}>
                      📍 {item.locality} · {timeAgo(item.$createdAt)}
                    </Text>
                  </View>
                  <View style={[styles.catPill, { backgroundColor: `${catColor(item.category)}15`, borderColor: catColor(item.category) }]}>
                    <Text style={[styles.catPillText, { color: catColor(item.category) }]}>
                      {catLabel(item.category)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.content}>{item.content}</Text>

                {item.imageFileId ? (
                  <Image
                    source={imagePreviewUrl(item.imageFileId)}
                    style={styles.postImage}
                    contentFit="cover"
                  />
                ) : null}

                <View style={styles.actions}>
                  <Pressable
                    testID={`like-${item.$id}`}
                    onPress={() => onLike(item)}
                    style={styles.actionBtn}
                  >
                    <Feather
                      name="heart"
                      size={18}
                      color={liked ? colors.error : colors.onSurfaceTertiary}
                    />
                    <Text style={[styles.actionText, liked && { color: colors.error }]}>
                      {likes}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <Pressable
        testID="feed-fab-create"
        onPress={() => router.push("/create-post")}
        style={styles.fab}
      >
        <Feather name="plus" size={26} color={colors.onBrand} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  headerEyebrow: { fontSize: 10, fontWeight: "700", color: colors.brand, letterSpacing: 1.2 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  chipsWrap: { height: 56, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: "center" },
  chip: {
    flexShrink: 0, height: 36, paddingHorizontal: 14, borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  chipTextActive: { color: colors.onBrand },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.brand, fontWeight: "700", fontSize: 16 },
  author: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  catPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  catPillText: { fontSize: 11, fontWeight: "700" },
  content: { fontSize: 15, color: colors.onSurface, lineHeight: 22 },
  postImage: {
    width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md, marginTop: spacing.md,
    backgroundColor: colors.surfaceTertiary,
  },
  actions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontSize: 13, color: colors.onSurfaceTertiary, fontWeight: "600" },
  fab: {
    position: "absolute", right: spacing.lg, bottom: 80,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
