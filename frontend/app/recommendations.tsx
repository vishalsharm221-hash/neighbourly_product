import { useCallback, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/auth-context";
import {
  RecommendationDoc,
  listRecommendations,
  fetchLikeMap,
  likePost,
  unlikePost,
  listComments,
  createComment,
  CommentDoc,
  imagePreviewUrl,
  isFollowing,
  follow,
  unfollow,
} from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

const REC_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "food", label: "Food" },
  { key: "parks", label: "Parks" },
  { key: "services", label: "Services" },
  { key: "shopping", label: "Shopping" },
  { key: "other", label: "Other" },
];

export default function Recommendations() {
  const router = useRouter();
  const { profile } = useAuth();
  const [recs, setRecs] = useState<RecommendationDoc[]>([]);
  const [likeMap, setLikeMap] = useState<{ counts: Record<string, number>; mine: Record<string, string> }>({ counts: {}, mine: {} });
  const [followMap, setFollowMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [commentRec, setCommentRec] = useState<RecommendationDoc | null>(null);
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const lastTapRef = useRef<{ id: string; time: number }>({ id: "", time: 0 });

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
      if (!profile?.userId || recs.length === 0) return;
      const ids = Array.from(new Set(recs.map((r) => r.authorId)));
      const results = await Promise.all(ids.map((id) => isFollowing(profile.userId, id)));
      const map: Record<string, string | null> = {};
      ids.forEach((id, i) => { map[id] = results[i]; });
      setFollowMap(map);
    })();
  }, [recs.length, profile?.userId]);

  const load = useCallback(async () => {
    if (!profile?.city) return;
    try {
      const cat = filter === "all" ? undefined : filter;
      const data = await listRecommendations(profile.city, cat);
      setRecs(data);
      if (profile.userId) {
        const ids = data.map((r) => r.$id);
        const lm = await fetchLikeMap(ids, profile.userId);
        setLikeMap(lm);
      }
    } catch (e) {
      console.warn(e);
    }
  }, [profile?.city, profile?.userId, filter]);

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

  const onLike = async (r: RecommendationDoc) => {
    if (!profile?.userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const liked = !!likeMap.mine[r.$id];
    setLikeMap((prev) => {
      const counts = { ...prev.counts };
      const mine = { ...prev.mine };
      if (liked) {
        counts[r.$id] = Math.max(0, (counts[r.$id] || 1) - 1);
        delete mine[r.$id];
      } else {
        counts[r.$id] = (counts[r.$id] || 0) + 1;
        mine[r.$id] = "pending";
      }
      return { counts, mine };
    });
    try {
      if (liked) {
        await unlikePost(likeMap.mine[r.$id]);
      } else {
        const doc = await likePost(r.$id, profile.userId);
        setLikeMap((prev) => ({ ...prev, mine: { ...prev.mine, [r.$id]: doc.$id } }));
      }
    } catch {
      load();
    }
  };

  const onDoubleTap = (r: RecommendationDoc) => {
    if (!likeMap.mine[r.$id]) onLike(r);
  };

  const openComments = async (r: RecommendationDoc) => {
    setCommentRec(r);
    setComments([]);
    setCommentText("");
    try {
      const data = await listComments(r.$id);
      setComments(data);
    } catch {}
  };

  const submitComment = async () => {
    if (!commentText.trim() || !commentRec || !profile?.userId) return;
    setCommentBusy(true);
    try {
      const doc = await createComment(commentRec.$id, profile.userId, profile.name, commentText.trim());
      setComments((prev) => [doc, ...prev]);
      setCommentText("");
    } catch {}
    setCommentBusy(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>NEIGHBOURHOOD</Text>
        <Text style={styles.title}>LOCAL RECOMMENDATIONS</Text>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {REC_CATEGORIES.map((c) => {
            const active = filter === c.key;
            return (
              <Pressable
                key={c.key}
                testID={`recommendations-filter-${c.key}`}
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
          testID="recommendations-list"
          data={recs}
          keyExtractor={(item) => item.$id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="star" size={32} color={colors.muted} />
              <Text style={styles.emptyTitle}>No recommendations yet</Text>
              <Text style={styles.emptyText}>Be the first to share a local tip.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const liked = !!likeMap.mine[item.$id];
            const likes = likeMap.counts[item.$id] || 0;
            return (
              <Pressable
                testID={`recommendation-${item.$id}`}
                onPress={() => router.push(`/recommendation-detail?id=${item.$id}`)}
                style={styles.card}
              >
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      <Pressable onPress={() => router.push({ pathname: "/user-profile", params: { userId: item.authorId, name: item.authorName } })}>
                        <Text style={styles.author}>{item.authorName}</Text>
                      </Pressable>
                      {profile?.userId !== item.authorId && (
                        <Pressable
                          onPress={() => toggleFollow(item.authorId)}
                          style={[styles.miniFollow, followMap[item.authorId] && styles.miniFollowActive]}
                        >
                          <Text style={[styles.miniFollowText, followMap[item.authorId] && styles.miniFollowTextActive]}>
                            {followMap[item.authorId] ? "Following" : "Follow"}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    <View style={styles.metaRow}>
                      <Feather name="map-pin" size={12} color={colors.muted} />
                      <Text style={styles.meta}>
                        {item.locality || "Local"} · {item.category}
                      </Text>
                    </View>
                  </View>
                </View>

                {item.imageFileId ? (
                  <Pressable
                    onPress={() => {
                      const now = Date.now();
                      if (lastTapRef.current.id === item.$id && now - lastTapRef.current.time < 300) {
                        onDoubleTap(item);
                      }
                      lastTapRef.current = { id: item.$id, time: now };
                    }}
                  >
                    <Image
                      source={imagePreviewUrl(item.imageFileId)}
                      style={styles.postImage}
                      contentFit="cover"
                    />
                  </Pressable>
                ) : null}

                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
                  <Text style={styles.titleText}>{item.title}</Text>
                  <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
                </View>

                <View style={styles.actions}>
                  <Pressable testID={`like-${item.$id}`} onPress={() => onLike(item)} style={styles.actionBtn}>
                    <Feather name="heart" size={22} color={liked ? colors.error : colors.onSurfaceTertiary} />
                    <Text style={[styles.actionCount, liked && styles.actionCountActive]}>{likes}</Text>
                  </Pressable>
                  <Pressable onPress={() => openComments(item)} style={styles.actionBtn}>
                    <Feather name="message-circle" size={22} color={colors.onSurfaceTertiary} />
                    <Text style={styles.actionCount}>{item.commentCount || 0}</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}

      <Pressable
        testID="recommendations-fab-create"
        onPress={() => router.push("/create-recommendation")}
        style={styles.fab}
      >
        <Feather name="plus" size={26} color={colors.onBrand} />
      </Pressable>

      <Modal visible={!!commentRec} animationType="slide" transparent>
        <View style={styles.commentOverlay}>
          <View style={styles.commentSheet}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>Comments</Text>
              <Pressable onPress={() => setCommentRec(null)} hitSlop={10}>
                <Feather name="x" size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            <FlatList
              data={comments}
              keyExtractor={(c) => c.$id}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
              ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: "center", marginTop: 40 }}>No comments yet</Text>}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>{item.authorName?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.commentAuthor}>{item.authorName}</Text>
                      <Text style={styles.commentTime}>{timeAgo(item.$createdAt)}</Text>
                    </View>
                    <Text style={styles.commentContent}>{item.content}</Text>
                  </View>
                </View>
              )}
            />
            <View style={styles.commentInputRow}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Write a comment..."
                placeholderTextColor={colors.muted}
                style={styles.commentInput}
              />
              <Pressable onPress={submitComment} disabled={commentBusy || !commentText.trim()}>
                <Feather name="send" size={20} color={commentText.trim() ? colors.brand : colors.muted} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  eyebrow: { fontSize: 10, fontWeight: "700", color: colors.brand, letterSpacing: 1.2 },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
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
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md, marginTop: 60 },
  emptyTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  author: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  miniFollow: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.surfaceSecondary,
  },
  miniFollowActive: { backgroundColor: colors.brand },
  miniFollowText: { fontSize: 10, fontWeight: "700", color: colors.brand },
  miniFollowTextActive: { color: colors.onBrand },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  meta: { fontSize: 11, color: colors.muted },
  postImage: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.surfaceTertiary },
  titleText: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  content: { fontSize: 14, color: colors.onSurfaceTertiary, marginTop: 4, lineHeight: 20 },
  actions: {
    flexDirection: "row", gap: spacing.lg,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: { fontSize: 13, fontWeight: "600", color: colors.onSurface },
  actionCountActive: { color: colors.error },
  fab: {
    position: "absolute", right: spacing.lg, bottom: 80,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  commentOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  commentSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", minHeight: "50%" },
  commentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  commentTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  commentItem: { flexDirection: "row", gap: spacing.md },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  commentAvatarText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  commentAuthor: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  commentTime: { fontSize: 11, color: colors.muted },
  commentContent: { fontSize: 13, color: colors.onSurface, marginTop: 2, lineHeight: 18 },
  commentInputRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border,
  },
  commentInput: {
    flex: 1, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: 10, fontSize: 14, color: colors.onSurface,
  },
});
