import { useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, FlatList, Modal, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Share from "expo-sharing";

import { useAuth } from "@/src/auth-context";
import { imagePreviewUrl, listPostsByAuthor, listSavedItems, listComments, createComment, type PostDoc, type SavedItemDoc, type CommentDoc } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

export default function Profile() {
  const { user, profile, signOut, refresh } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"posts" | "saved" | "activity">("posts");
  const [myPosts, setMyPosts] = useState<PostDoc[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItemDoc[]>([]);
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentPost, setCommentPost] = useState<PostDoc | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      if (tab === "posts") {
        const posts = await listPostsByAuthor(profile.userId);
        setMyPosts(posts);
      } else if (tab === "saved") {
        const items = await listSavedItems(profile.userId);
        setSavedItems(items);
      } else if (tab === "activity") {
        const all = await listPostsByAuthor(profile.userId);
        setComments([]);
        for (const p of all.slice(0, 10)) {
          const cs = await listComments(p.$id);
          setComments((prev) => [...prev, ...cs]);
        }
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [profile?.userId, tab]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onShare = async () => {
    try {
      await Share.share({ message: `Check out ${profile?.name} on Localy` });
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

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Cover + Avatar */}
      <View style={styles.coverWrap}>
        <View style={styles.cover} />
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {profile?.avatarFileId ? (
              <Image source={imagePreviewUrl(profile.avatarFileId)} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{profile?.name?.[0]?.toUpperCase() || "?"}</Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.profileSection}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text testID="profile-name" style={styles.name}>{profile?.name}</Text>
            {profile?.verified && <Feather name="check-circle" size={18} color={colors.brand} />}
          </View>
          {profile?.handle && <Text style={styles.handle}>@{profile.handle}</Text>}
          <View style={styles.locRow}>
            <Feather name="map-pin" size={13} color={colors.muted} />
            <Text testID="profile-locality" style={styles.locText}>
              {profile?.locality} · {profile?.city}
            </Text>
          </View>
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={styles.statsRow}>
            <Pressable style={styles.stat} onPress={() => router.push("/followers")}>
              <Text style={styles.statValue}>{profile?.followerCount ?? 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <Pressable style={styles.stat} onPress={() => router.push("/following")}>
              <Text style={styles.statValue}>{profile?.followingCount ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.postCount ?? 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable testID="edit-profile-button" onPress={() => router.push("/edit-profile")} style={styles.primaryBtn}>
              <Feather name="edit-2" size={14} color={colors.onBrand} />
              <Text style={styles.primaryBtnText}>Edit profile</Text>
            </Pressable>
            <Pressable onPress={onShare} style={styles.secondaryBtn}>
              <Feather name="share" size={14} color={colors.brand} />
              <Text style={styles.secondaryBtnText}>Share</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/saved")} style={styles.secondaryBtn}>
              <Feather name="bookmark" size={14} color={colors.brand} />
              <Text style={styles.secondaryBtnText}>Saved</Text>
            </Pressable>
          </View>
        </View>

        {/* Segments */}
        <View style={styles.segmentWrap}>
          {(["posts", "saved", "activity"] as const).map((t) => (
            <Pressable
              key={t}
              testID={`segment-${t}`}
              onPress={() => setTab(t)}
              style={[styles.segment, tab === t && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, tab === t && styles.segmentTextActive]}>
                {t === "posts" ? "My Posts" : t === "saved" ? "Saved" : "Activity"}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
        ) : (
          <FlatList
            data={tab === "posts" ? myPosts : tab === "saved" ? savedItems : comments}
            keyExtractor={(item) => item.$id}
            scrollEnabled={false}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Feather name={tab === "posts" ? "file-text" : tab === "saved" ? "bookmark" : "activity"} size={32} color={colors.muted} />
                <Text style={styles.emptyTitle}>No {tab === "posts" ? "posts" : tab === "saved" ? "saved items" : "activity"} yet</Text>
              </View>
            }
            renderItem={({ item }) => {
              if (tab === "posts") {
                const p = item as PostDoc;
                return (
                  <View style={styles.card}>
                    <Text style={styles.cardContent} numberOfLines={4}>{p.content}</Text>
                    <Text style={styles.cardMeta}>{timeAgo(p.$createdAt)} · {p.category}</Text>
                  </View>
                );
              }
              if (tab === "saved") {
                const s = item as SavedItemDoc;
                return (
                  <View style={styles.card}>
                    <Text style={styles.cardContent} numberOfLines={3}>Saved {s.itemType} · {s.itemId}</Text>
                    <Text style={styles.cardMeta}>{timeAgo(s.$createdAt)}</Text>
                  </View>
                );
              }
              const c = item as CommentDoc;
              return (
                <View style={styles.card}>
                  <Text style={styles.cardMeta}>{c.authorName} · {timeAgo(c.$createdAt)}</Text>
                  <Text style={styles.cardContent} numberOfLines={3}>{c.content}</Text>
                </View>
              );
            }}
          />
        )}
      </ScrollView>

      <Pressable
        testID="logout-button"
        onPress={handleLogout}
        style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}
      >
        <Feather name="log-out" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      {/* Comments Modal for activity */}
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
  coverWrap: { position: "relative" },
  cover: { height: 110, backgroundColor: colors.brandTertiary },
  avatarWrap: { position: "absolute", left: 0, right: 0, bottom: -36, alignItems: "center" },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    borderWidth: 3, borderColor: colors.surface,
  },
  avatarText: { color: colors.onBrand, fontWeight: "800", fontSize: 28 },
  profileSection: {
    alignItems: "center", paddingTop: 40, paddingHorizontal: spacing.lg, gap: 4,
  },
  name: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  handle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locText: { fontSize: 13, color: colors.onSurfaceTertiary },
  bio: { fontSize: 14, color: colors.onSurface, marginTop: spacing.md, textAlign: "center", lineHeight: 20 },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg, alignSelf: "stretch" },
  stat: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, alignSelf: "stretch" },
  primaryBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.brand,
  },
  primaryBtnText: { color: colors.onBrand, fontWeight: "700", fontSize: 13 },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.surfaceSecondary,
  },
  secondaryBtnText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  segmentWrap: {
    flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  segment: {
    flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
  },
  segmentActive: { backgroundColor: colors.brand },
  segmentText: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary },
  segmentTextActive: { color: colors.onBrand },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxxl },
  emptyTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", textAlign: "center" },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 4,
  },
  cardContent: { fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  cardMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  logout: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, marginTop: spacing.lg, marginHorizontal: spacing.lg,
    paddingVertical: 14, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.error,
  },
  logoutText: { color: colors.error, fontWeight: "700", fontSize: 14 },
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
