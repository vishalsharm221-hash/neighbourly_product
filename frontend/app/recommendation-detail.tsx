import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
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
} from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

export default function RecommendationDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [rec, setRec] = useState<RecommendationDoc | null>(null);
  const [likeMap, setLikeMap] = useState<{ counts: Record<string, number>; mine: Record<string, string> }>({ counts: {}, mine: {} });
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.city || !id) return;
    try {
      const data = await listRecommendations(profile.city);
      const found = data.find((r) => r.$id === id) || null;
      setRec(found);
      if (found && profile.userId) {
        const lm = await fetchLikeMap([found.$id], profile.userId);
        setLikeMap(lm);
        const c = await listComments(found.$id);
        setComments(c);
      }
    } catch (e) {
      console.warn(e);
    }
  }, [id, profile?.city, profile?.userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onLike = async () => {
    if (!rec || !profile?.userId) return;
    const liked = !!likeMap.mine[rec.$id];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLikeMap((prev) => {
      const counts = { ...prev.counts };
      const mine = { ...prev.mine };
      if (liked) {
        counts[rec.$id] = Math.max(0, (counts[rec.$id] || 1) - 1);
        delete mine[rec.$id];
      } else {
        counts[rec.$id] = (counts[rec.$id] || 0) + 1;
        mine[rec.$id] = "pending";
      }
      return { counts, mine };
    });
    try {
      if (liked) {
        await unlikePost(likeMap.mine[rec.$id]);
      } else {
        const doc = await likePost(rec.$id, profile.userId);
        setLikeMap((prev) => ({ ...prev, mine: { ...prev.mine, [rec.$id]: doc.$id } }));
      }
    } catch {
      load();
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !rec || !profile?.userId) return;
    setCommentBusy(true);
    try {
      const doc = await createComment(rec.$id, profile.userId, profile.name, commentText.trim());
      setComments((prev) => [doc, ...prev]);
      setCommentText("");
    } catch {}
    setCommentBusy(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Recommendation</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!rec) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Recommendation</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>Not found</Text>
          <Text style={styles.emptyText}>This recommendation may have been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const liked = !!likeMap.mine[rec.$id];
  const likes = likeMap.counts[rec.$id] || 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Recommendation</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        testID="recommendation-detail"
        data={comments}
        keyExtractor={(c) => c.$id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            {rec.imageFileId ? (
              <Image source={imagePreviewUrl(rec.imageFileId)} style={styles.heroImage} contentFit="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Feather name="star" size={48} color={colors.brand} />
              </View>
            )}
            <View style={styles.body}>
              <View style={styles.metaRowTop}>
                <Text style={styles.author}>{rec.authorName}</Text>
                <View style={styles.catPill}>
                  <Text style={styles.catPillText}>{rec.category}</Text>
                </View>
              </View>
              <Text style={styles.locMeta}>
                <Feather name="map-pin" size={12} color={colors.muted} /> {rec.locality || "Local"}
              </Text>
              <Text style={styles.detailTitle}>{rec.title}</Text>
              <Text style={styles.detailContent}>{rec.content}</Text>

              <View style={styles.actionRow}>
                <Pressable testID={`like-${rec.$id}`} onPress={onLike} style={styles.actionBtn}>
                  <Feather name="heart" size={22} color={liked ? colors.error : colors.onSurfaceTertiary} />
                  <Text style={[styles.actionCount, liked && styles.actionCountActive]}>{likes} {likes === 1 ? "like" : "likes"}</Text>
                </Pressable>
                <View style={styles.actionBtn}>
                  <Feather name="message-circle" size={22} color={colors.onSurfaceTertiary} />
                  <Text style={styles.actionCount}>{comments.length} comments</Text>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Comments</Text>
              </View>
            </View>
          </View>
        }
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
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.noComments}>
            <Text style={styles.emptyText}>No comments yet. Start the conversation.</Text>
          </View>
        }
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
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", textAlign: "center", marginTop: spacing.md },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 4 },
  heroImage: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.surfaceTertiary },
  heroPlaceholder: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.lg, paddingBottom: 120 },
  metaRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  author: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  catPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.brandTertiary },
  catPillText: { fontSize: 10, fontWeight: "700", color: colors.brand },
  locMeta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  detailTitle: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: spacing.md },
  detailContent: { fontSize: 15, color: colors.onSurfaceTertiary, marginTop: spacing.sm, lineHeight: 22 },
  actionRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: { fontSize: 13, fontWeight: "600", color: colors.onSurface },
  actionCountActive: { color: colors.error },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  commentItem: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.xs },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  commentAvatarText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  commentAuthor: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  commentTime: { fontSize: 11, color: colors.muted },
  commentContent: { fontSize: 13, color: colors.onSurface, marginTop: 2, lineHeight: 18 },
  noComments: { alignItems: "center", paddingVertical: spacing.xl },
  commentInputRow: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  commentInput: {
    flex: 1, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: 10, fontSize: 14, color: colors.onSurface,
  },
});
