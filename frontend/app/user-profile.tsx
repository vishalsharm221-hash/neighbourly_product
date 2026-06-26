import { useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, FlatList, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { getProfileByUserId, getProfilesByUserIds, isFollowing, follow, unfollow } from "@/src/db";
import { listPostsByAuthor } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

export default function UserProfile() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const params = useLocalSearchParams<{ userId: string; name: string }>();
  const targetUserId = params.userId || "";
  const targetName = params.name || "User";

  const [targetProfile, setTargetProfile] = useState<(ReturnType<typeof getProfileByUserId>> extends Promise<infer R> ? R : any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followId, setFollowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isSelf = profile?.userId === targetUserId;

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      (async () => {
        try {
          const p = await getProfileByUserId(targetUserId);
          setTargetProfile(p);
          if (p) {
            const [postsData, fid] = await Promise.all([
              listPostsByAuthor(targetUserId),
              profile?.userId ? isFollowing(profile.userId, targetUserId) : Promise.resolve(null),
            ]);
            setPosts(postsData);
            setFollowId(fid);
          }
        } catch (e) {
          console.warn(e);
        } finally {
          setLoading(false);
        }
      })();
    }, [targetUserId, profile?.userId])
  );

  const toggleFollow = async () => {
    if (!profile?.userId || !profile?.$id || !targetUserId) return;
    if (followId) {
      await unfollow(followId, profile.$id);
      setFollowId(null);
    } else {
      const doc = await follow(profile.userId, targetUserId, profile.$id, "");
      setFollowId(doc.$id);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      </SafeAreaView>
    );
  }

  if (!targetProfile) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>{targetName}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Feather name="user-x" size={40} color={colors.muted} />
          <Text style={styles.emptyTitle}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{targetName}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {targetProfile.avatarFileId ? (
                <Image source={imagePreviewUrl(targetProfile.avatarFileId)} style={StyleSheet.absoluteFillObject} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{targetProfile.name?.[0]?.toUpperCase() || "?"}</Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md }}>
            <Text style={styles.name}>{targetProfile.name}</Text>
            {targetProfile.verified && <Feather name="check-circle" size={18} color={colors.brand} />}
          </View>
          {targetProfile.handle && <Text style={styles.handle}>@{targetProfile.handle}</Text>}
          <View style={styles.locRow}>
            <Feather name="map-pin" size={13} color={colors.muted} />
            <Text style={styles.locText}>{targetProfile.locality} · {targetProfile.city}</Text>
          </View>
          {targetProfile.bio && <Text style={styles.bio}>{targetProfile.bio}</Text>}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{targetProfile.postCount ?? 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{targetProfile.followerCount ?? 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{targetProfile.followingCount ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {!isSelf && (
            <Pressable
              onPress={toggleFollow}
              style={[styles.followBtn, followId && styles.followBtnActive]}
            >
              <Feather name={followId ? "check" : "user-plus"} size={16} color={followId ? colors.onBrand : colors.brand} />
              <Text style={[styles.followBtnText, followId && styles.followBtnTextActive]}>
                {followId ? "Following" : "Follow"}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Posts by {targetProfile.name}</Text>
        </View>

        {posts.length === 0 ? (
          <View style={styles.center}>
            <Feather name="file-text" size={32} color={colors.muted} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p.$id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardContent} numberOfLines={4}>{item.content}</Text>
                <Text style={styles.cardMeta}>{item.$createdAt?.slice(0, 10)} · {item.category}</Text>
              </View>
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.onSurface },
  profileSection: { alignItems: "center", paddingTop: spacing.lg, paddingHorizontal: spacing.lg, gap: 4 },
  avatarWrap: { marginTop: 0 },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    borderWidth: 3, borderColor: colors.brand,
  },
  avatarText: { color: colors.brand, fontWeight: "800", fontSize: 36 },
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
  followBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.lg,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.surfaceSecondary,
  },
  followBtnActive: { backgroundColor: colors.brand },
  followBtnText: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  followBtnTextActive: { color: colors.onBrand },
  sectionHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 4,
  },
  cardContent: { fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  cardMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
