import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import {
  getGroupById,
  joinGroup,
  leaveGroup,
  listGroupPosts,
  createGroupPost,
  deleteGroup,
  updateGroup,
} from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";
import type { GroupDoc, GroupPostDoc } from "@/src/db";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile, user } = useAuth();
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [posts, setPosts] = useState<GroupPostDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  const groupId = id || "";

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      setError(null);
      const [groupData, postsData] = await Promise.all([
        getGroupById(groupId),
        listGroupPosts(groupId),
      ]);
      setGroup(groupData);
      setPosts(postsData);
      if (groupData && profile?.userId) {
        setIsMember(groupData.creatorId === profile.userId);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load group");
    } finally {
      setLoading(false);
    }
  }, [groupId, profile?.userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleJoinLeave = useCallback(async () => {
    if (!group || !profile?.userId) return;
    setActionLoading(true);
    try {
      if (isMember) {
        await leaveGroup(group.$id, profile.userId);
        setIsMember(false);
        setGroup((g) => g ? { ...g, memberCount: Math.max(0, (g.memberCount || 0) - 1) } : g);
      } else {
        await joinGroup(group.$id, profile.userId);
        setIsMember(true);
        setGroup((g) => g ? { ...g, memberCount: (g.memberCount || 0) + 1 } : g);
      }
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }, [group, profile?.userId, isMember]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete Group", "Are you sure you want to delete this group? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!group) return;
          try {
            await deleteGroup(group.$id);
            router.back();
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete group");
          }
        },
      },
    ]);
  }, [group, router]);

  const handleCreatePost = useCallback(async () => {
    if (!newPost.trim() || !group || !profile || !user) return;
    setPosting(true);
    try {
      await createGroupPost({
        groupId: group.$id,
        authorId: user.$id,
        authorName: profile.name,
        content: newPost.trim(),
        imageFileId: null,
      });
      setNewPost("");
      const updatedPosts = await listGroupPosts(group.$id);
      setPosts(updatedPosts);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create post");
    } finally {
      setPosting(false);
    }
  }, [newPost, group, profile, user]);

  const isCreator = useMemo(
    () => group?.creatorId === profile?.userId,
    [group?.creatorId, profile?.userId]
  );

  const renderPost = ({ item }: { item: GroupPostDoc }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postAvatar}>
          <Feather name="user" size={16} color={colors.brand} />
        </View>
        <View style={styles.postMeta}>
          <Text style={styles.postAuthor}>{item.authorName}</Text>
          <Text style={styles.postDate}>
            {new Date(item.$createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
      </View>
      <Text style={styles.postContent}>{item.content}</Text>
      {item.imageFileId ? (
        <Image
          source={{ uri: `${process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/media/files/${item.imageFileId}/view?project=${process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID}` }}
          style={styles.postImage}
          contentFit="cover"
          placeholder={null}
        />
      ) : null}
    </View>
  );

  const renderEmptyPosts = () => (
    <View style={styles.emptyPostsContainer}>
      <Feather name="message-square" size={40} color={colors.muted} />
      <Text style={styles.emptyPostsTitle}>No posts yet</Text>
      <Text style={styles.emptyPostsSubtitle}>Be the first to share something with this group!</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Group</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>{error || "Group not found"}</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        </View>
        {isCreator && (
          <Pressable onPress={handleDelete} hitSlop={10}>
            <Feather name="trash-2" size={20} color={colors.error} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.groupInfoCard}>
          <View style={styles.groupIconLarge}>
            <Feather name="users" size={32} color={colors.brand} />
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description ? (
            <Text style={styles.groupDescription}>{group.description}</Text>
          ) : null}
          <View style={styles.groupMetaRow}>
            <View style={styles.groupMetaItem}>
              <Feather name="user" size={14} color={colors.muted} />
              <Text style={styles.groupMetaText}>{group.memberCount || 0} members</Text>
            </View>
            <View style={styles.groupMetaItem}>
              <Feather name="map-pin" size={14} color={colors.muted} />
              <Text style={styles.groupMetaText}>
                {group.locality ? `${group.locality}, ${group.city}` : group.city}
              </Text>
            </View>
          </View>
          <Text style={styles.groupCreatorLabel}>Created by {group.creatorName}</Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.joinBtn, isMember && styles.leaveBtn]}
            onPress={handleJoinLeave}
            disabled={actionLoading || isCreator}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <Text style={styles.joinBtnText}>
                {isCreator ? "You're the creator" : isMember ? "Leave Group" : "Join Group"}
              </Text>
            )}
          </Pressable>
          {isCreator && (
            <Pressable
              style={styles.editBtn}
              onPress={() => router.push({ pathname: "/create-group", params: { editId: group.$id } })}
            >
              <Feather name="edit-2" size={16} color={colors.brand} />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.postsSectionTitle}>Group Feed</Text>

          <View style={styles.newPostBox}>
            <View style={styles.newPostAvatar}>
              <Feather name="user" size={14} color={colors.onBrand} />
            </View>
            <TextInput
              style={styles.newPostInput}
              placeholder="Write a post for this group..."
              placeholderTextColor={colors.muted}
              value={newPost}
              onChangeText={setNewPost}
              multiline
            />
            <Pressable
              style={[styles.postSubmitBtn, (!newPost.trim() || posting) && { opacity: 0.4 }]}
              onPress={handleCreatePost}
              disabled={!newPost.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <Feather name="send" size={16} color={colors.onBrand} />
              )}
            </Pressable>
          </View>

          <FlatList
            data={posts}
            keyExtractor={(item) => item.$id}
            renderItem={renderPost}
            contentContainerStyle={[styles.postsList, posts.length === 0 && styles.emptyPostsList]}
            ListEmptyComponent={renderEmptyPosts}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
            }
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push({ pathname: "/create-group", params: { postForGroupId: group.$id } })}>
        <Feather name="plus" size={28} color={colors.onBrand} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  errorTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface, marginTop: spacing.md },
  backBtn: { backgroundColor: colors.brand, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, marginTop: spacing.md },
  backBtnText: { color: colors.onBrand, fontSize: 14, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  groupInfoCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  groupIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  groupName: { fontSize: 20, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  groupDescription: { fontSize: 14, color: colors.onSurfaceTertiary, textAlign: "center", lineHeight: 20 },
  groupMetaRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm },
  groupMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  groupMetaText: { fontSize: 13, color: colors.muted, fontWeight: "500" },
  groupCreatorLabel: { fontSize: 12, color: colors.muted, marginTop: spacing.xs },
  actionRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  joinBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  leaveBtn: { backgroundColor: colors.error },
  joinBtnText: { color: colors.onBrand, fontSize: 15, fontWeight: "700" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandTertiary,
  },
  editBtnText: { color: colors.brand, fontSize: 14, fontWeight: "700" },
  postsSection: { marginTop: spacing.xl },
  postsSectionTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 1, color: colors.onSurface, marginBottom: spacing.md },
  newPostBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  newPostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  newPostInput: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
    maxHeight: 80,
    textAlignVertical: "top",
  },
  postSubmitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  postsList: { gap: spacing.md },
  emptyPostsList: { flex: 1 },
  postCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  postHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  postMeta: { flex: 1 },
  postAuthor: { fontSize: 14, fontWeight: "600", color: colors.onSurface },
  postDate: { fontSize: 11, color: colors.muted },
  postContent: { fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  postImage: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.md, marginTop: spacing.xs },
  emptyPostsContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyPostsTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  emptyPostsSubtitle: { fontSize: 13, color: colors.muted, textAlign: "center" },
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
});
