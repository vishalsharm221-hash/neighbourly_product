import { useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, FlatList, Modal, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Share } from "react-native";

import { useAuth } from "@/src/auth-context";
import { imagePreviewUrl, listPostsByAuthor, listSavedItems, listComments, createComment, type PostDoc, type SavedItemDoc, type CommentDoc } from "@/src/db";
import { colors, spacing, radius, gradients } from "@/src/theme";

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
        <LinearGradient colors={["#FF3366", "#3366FF"]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarEmoji}>✨</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.profileSection}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text testID="profile-name" style={styles.name}>{profile?.name || "Username"}</Text>
            {profile?.verified && <Feather name="check-circle" size={18} color="#FFFFFF" />}
          </View>
          {profile?.handle && <Text style={styles.handle}>@{profile.handle}</Text>}
          <Text style={styles.bio}>{profile?.bio || "CS major at DU 💻 | Foodie 🍕 | Exploring Delhi one momo stall at a time."}</Text>

          <View style={styles.locRow}>
            <Feather name="map-pin" size={13} color="#FFFFFF" />
            <Text testID="profile-locality" style={styles.locText}>
              {profile?.locality || "North Campus"} · {profile?.city || "Delhi"}
            </Text>
          </View>

          <View style={styles.statsWrap}>
            <Pressable style={styles.statBox} onPress={() => router.push("/following" as any)}>
              <Text style={styles.statVal}>{profile?.followingCount ?? 0}</Text>
              <Text style={styles.statLbl}>Following</Text>
            </Pressable>
            <Pressable style={styles.statBox} onPress={() => router.push("/followers" as any)}>
              <Text style={styles.statVal}>{profile?.followerCount ?? 0}</Text>
              <Text style={styles.statLbl}>Followers</Text>
            </Pressable>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{profile?.postCount ?? 0}</Text>
              <Text style={styles.statLbl}>Posts</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable testID="edit-profile-button" onPress={() => router.push("/edit-profile")} style={styles.editBtn}>
              <Feather name="edit-2" size={14} color="#FFFFFF" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
            <Pressable onPress={onShare} style={styles.shareBtn}>
              <Feather name="share" size={14} color="#000" />
              <Text style={styles.shareBtnText}>Share</Text>
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
                {t === "posts" ? "Posts" : t === "saved" ? "Saved" : "Activity"}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}><Text style={styles.loadingText}>Loading... 🫠</Text></View>
        ) : tab === "posts" ? (
          <View style={styles.postGrid}>
            {myPosts.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No posts yet</Text>
              </View>
            ) : (
              myPosts.map((p, i) => (
                <Pressable key={p.$id} style={styles.postTile}>
                  {p.imageFileId ? (
                    <Image source={{ uri: imagePreviewUrl(p.imageFileId) }} style={styles.postTileImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.postTileImg, { backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" }]}>
                      <Feather name="file-text" size={24} color={colors.muted} />
                    </View>
                  )}
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <FlatList
            data={tab === "saved" ? savedItems : comments}
            keyExtractor={(item: any) => item.$id}
            scrollEnabled={false}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No {tab === "saved" ? "saved items" : "activity"} yet</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.cardSmall}>
                <Text style={styles.cardContent} numberOfLines={3}>
                  {tab === "saved" ? "Saved item" : (item as CommentDoc).content}
                </Text>
                <Text style={styles.cardMeta}>{timeAgo((item as any).$createdAt)}</Text>
              </View>
            )}
          />
        )}
      </ScrollView>

      {/* Logout */}
      <Pressable testID="logout-button" onPress={handleLogout} style={styles.logoutBtn}>
        <Feather name="log-out" size={16} color="#FF3366" />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

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
  coverWrap: { position: "relative", height: 140 },
  cover: { ...StyleSheet.absoluteFillObject },
  avatarBadge: {
    position: "absolute", bottom: -36, alignSelf: "center",
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 4, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 8,
    alignItems: "center", justifyContent: "center",
  },
  avatarEmoji: { fontSize: 36 },
  profileSection: {
    alignItems: "center", paddingTop: 48, paddingHorizontal: spacing.lg, gap: 6,
  },
  name: { fontSize: 24, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.5 },
  handle: { fontSize: 14, fontWeight: "700", color: colors.muted, marginTop: 2 },
  bio: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceTertiary, marginTop: spacing.md, textAlign: "center", lineHeight: 20 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  statsWrap: {
    flexDirection: "row", marginTop: spacing.lg, alignSelf: "stretch", gap: 0,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    overflow: "hidden",
  },
  statBox: { flex: 1, alignItems: "center", paddingVertical: spacing.lg },
  statVal: { fontSize: 22, fontWeight: "900", color: colors.onSurface },
  statLbl: { fontSize: 11, fontWeight: "700", color: colors.muted, marginTop: 2 },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, alignSelf: "stretch" },
  editBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: radius.pill, backgroundColor: "#FFFFFF",
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  editBtnText: { color: "#000", fontWeight: "900", fontSize: 13 },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000",
    backgroundColor: "#F3F3F5",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  shareBtnText: { color: "#000", fontWeight: "900", fontSize: 13 },
  segmentWrap: {
    flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 2, borderBottomColor: "#000",
  },
  segment: {
    flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  segmentActive: { backgroundColor: "#3366FF", borderColor: "#000" },
  segmentText: { fontSize: 13, fontWeight: "800", color: colors.onSurfaceTertiary },
  segmentTextActive: { color: "#FFFFFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxxl },
  loadingText: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  emptyText: { fontSize: 14, color: colors.muted, fontWeight: "700", textAlign: "center" },
  postGrid: { flexDirection: "row", flexWrap: "wrap", padding: 1, gap: 1, paddingBottom: 120 },
  postTile: { width: "33.33%", aspectRatio: 1, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: 1 },
  postTileImg: { ...StyleSheet.absoluteFillObject },
  cardSmall: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    padding: spacing.lg, gap: 4,
  },
  cardContent: { fontSize: 14, fontWeight: "600", color: colors.onSurface, lineHeight: 20 },
  cardMeta: { fontSize: 11, fontWeight: "600", color: colors.muted, marginTop: 4 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: spacing.lg, marginBottom: spacing.lg, paddingVertical: 14, borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#FF3366",
    backgroundColor: colors.surfaceSecondary,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  logoutText: { color: "#FF3366", fontWeight: "900", fontSize: 14 },
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
