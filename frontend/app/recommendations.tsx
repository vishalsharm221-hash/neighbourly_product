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
        <Text style={styles.eyebrow}>COMMUNITY</Text>
        <Text style={styles.title}>Recs ⭐</Text>
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
              <Text style={styles.emptyTitle}>No recs yet ⭐</Text>
              <Text style={styles.emptyText}>The hood is quiet — share your faves!</Text>
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
  root: { flex: 1, backgroundColor: "#FBFBF9" },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000", backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  eyebrow: { fontSize: 10, fontWeight: "800", color: "#3366FF", letterSpacing: 1.2 },
  title: { fontSize: 22, fontWeight: "900", color: "#000", marginTop: 2 },
  chipsWrap: { height: 56, justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "#000", backgroundColor: "#FFFFFF" },
  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: "center" },
  chip: {
    flexShrink: 0, height: 36, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: "#F3F3F5", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
  },
  chipActive: { backgroundColor: "#3366FF", borderColor: "#000" },
  chipText: { fontSize: 13, fontWeight: "800", color: "#000" },
  chipTextActive: { color: "#FFFFFF", fontWeight: "900" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md, marginTop: 60 },
  emptyTitle: { color: "#000", fontSize: 16, fontWeight: "900", textAlign: "center" },
  emptyText: { color: "#000", fontSize: 13, textAlign: "center", lineHeight: 19, fontWeight: "500" },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 3, borderBottomWidth: 3, borderColor: "#000",
    borderLeftWidth: 6, borderLeftColor: "#FF3366",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  author: { fontSize: 14, fontWeight: "800", color: "#000" },
  miniFollow: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
    borderWidth: 2, borderColor: "#3366FF", backgroundColor: "#F3F3F5",
  },
  miniFollowActive: { backgroundColor: "#3366FF" },
  miniFollowText: { fontSize: 10, fontWeight: "800", color: "#3366FF" },
  miniFollowTextActive: { color: "#FFFFFF" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  meta: { fontSize: 11, color: "#000", fontWeight: "600" },
  postImage: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#F3F3F5", borderWidth: 3, borderTopColor: "#000", borderBottomColor: "#000" },
  titleText: { fontSize: 15, fontWeight: "900", color: "#000" },
  content: { fontSize: 14, color: "#000", marginTop: 4, lineHeight: 20, fontWeight: "500" },
  actions: {
    flexDirection: "row", gap: spacing.lg,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 2, borderTopColor: "#000",
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: { fontSize: 13, fontWeight: "700", color: "#000" },
  actionCountActive: { color: "#FF3366" },
  fab: {
    position: "absolute", right: spacing.lg, bottom: 80,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    borderWidth: 3, borderColor: "#000",
  },
  commentOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  commentSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", minHeight: "50%", borderTopWidth: 3, borderTopColor: "#000" },
  commentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, borderBottomWidth: 3, borderBottomColor: "#000" },
  commentTitle: { fontSize: 16, fontWeight: "900", color: "#000" },
  commentItem: { flexDirection: "row", gap: spacing.md },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F3F5", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000" },
  commentAvatarText: { color: "#3366FF", fontWeight: "800", fontSize: 12 },
  commentAuthor: { fontSize: 13, fontWeight: "800", color: "#000" },
  commentTime: { fontSize: 11, color: "#000", fontWeight: "600" },
  commentContent: { fontSize: 13, color: "#000", marginTop: 2, lineHeight: 18, fontWeight: "500" },
  commentInputRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, borderTopWidth: 3, borderTopColor: "#000",
  },
  commentInput: {
    flex: 1, backgroundColor: "#F3F3F5", borderRadius: 12,
    paddingHorizontal: spacing.lg, paddingVertical: 10, fontSize: 14, color: "#000",
    borderWidth: 2, borderColor: "#000",
  },
});
