import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Share,
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
  listComments,
  createComment,
  CommentDoc,
} from "@/src/db";
import { CATEGORIES } from "@/src/data";
import { colors, spacing, radius } from "@/src/theme";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
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
  const [commentPost, setCommentPost] = useState<PostDoc | null>(null);
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const lastTapRef = useRef<{ id: string; time: number }>({ id: "", time: 0 });

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
        setLikeMap((prev) => ({ ...prev, mine: { ...prev.mine, [p.$id]: doc.$id } }));
      }
    } catch {
      load();
    }
  };

  const onDoubleTap = (p: PostDoc) => {
    if (!likeMap.mine[p.$id]) onLike(p);
  };

  const openComments = async (p: PostDoc) => {
    setCommentPost(p);
    setComments([]);
    setCommentText("");
    try {
      const data = await listComments(p.$id);
      setComments(data);
    } catch {}
  };

  const submitComment = async () => {
    if (!commentText.trim() || !commentPost || !profile?.userId) return;
    setCommentBusy(true);
    try {
      const doc = await createComment(commentPost.$id, profile.userId, profile.name, commentText.trim());
      setComments((prev) => [doc, ...prev]);
      setCommentText("");
    } catch {}
    setCommentBusy(false);
  };

  const onShare = async (p: PostDoc) => {
    try {
      await Share.share({ message: `${p.content}\n\nShared from Neighbourly` });
    } catch {}
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
        <Pressable onPress={() => router.push("/messages" as unknown as Parameters<typeof router.push>[0])} style={styles.headerBtn}>
          <Feather name="send" size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
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
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          testID="feed-list"
          data={posts}
          keyExtractor={(item) => item.$id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="camera" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>Be the first to share with your neighbourhood.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const liked = !!likeMap.mine[item.$id];
            const likes = likeMap.counts[item.$id] || 0;
            return (
              <View testID={`post-${item.$id}`} style={styles.card}>
                {/* Author header */}
                <View style={styles.cardHead}>
                  <View style={styles.avatar}>
                    {item.authorAvatar ? (
                      <Image source={imagePreviewUrl(item.authorAvatar)} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    ) : (
                      <Text style={styles.avatarText}>{item.authorName?.[0]?.toUpperCase() || "?"}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={styles.author}>{item.authorName}</Text>
                      {item.authorVerified && <Feather name="check-circle" size={13} color={colors.brand} />}
                    </View>
                    <Text style={styles.meta}>
                      {item.locality} · {timeAgo(item.$createdAt)}
                    </Text>
                  </View>
                  <View style={styles.catPill}>
                    <Text style={styles.catPillText}>{catLabel(item.category)}</Text>
                  </View>
                </View>

                {/* Double-tap wrapper for image */}
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

                {/* Content / caption */}
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
                  <Text style={styles.content}>{item.content}</Text>
                </View>

                {/* Actions bar */}
                <View style={styles.actions}>
                  <Pressable testID={`like-${item.$id}`} onPress={() => onLike(item)} style={styles.actionBtn}>
                    <Feather name={liked ? "heart" : "heart"} size={22} color={liked ? colors.error : colors.onSurfaceTertiary} />
                  </Pressable>
                  <Pressable onPress={() => openComments(item)} style={styles.actionBtn}>
                    <Feather name="message-circle" size={22} color={colors.onSurfaceTertiary} />
                  </Pressable>
                  <Pressable onPress={() => onShare(item)} style={styles.actionBtn}>
                    <Feather name="send" size={22} color={colors.onSurfaceTertiary} />
                  </Pressable>
                </View>

                {/* Like count + comment count */}
                <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
                  {likes > 0 && <Text style={styles.likes}>{likes} {likes === 1 ? "like" : "likes"}</Text>}
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}

      <Pressable testID="feed-fab-create" onPress={() => router.push("/create-post")} style={styles.fab}>
        <Feather name="plus" size={26} color={colors.onBrand} />
      </Pressable>

      {/* Comments Modal */}
      <Modal visible={!!commentPost} animationType="slide" transparent>
        <View style={styles.commentOverlay}>
          <View style={styles.commentSheet}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>Comments</Text>
              <Pressable onPress={() => setCommentPost(null)} hitSlop={10}>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  headerEyebrow: { fontSize: 10, fontWeight: "700", color: colors.brand, letterSpacing: 1.2 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
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
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  author: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.brandTertiary },
  catPillText: { fontSize: 10, fontWeight: "700", color: colors.brand },
  postImage: { width: "100%", aspectRatio: 1, backgroundColor: colors.surfaceTertiary },
  content: { fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  actions: {
    flexDirection: "row", gap: spacing.lg,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  likes: { fontSize: 13, fontWeight: "700", color: colors.onSurface, marginTop: 4 },
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
