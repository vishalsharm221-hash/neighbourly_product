import { useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, FlatList, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/src/auth-context";
import { getProfileByUserId, isFollowing, follow, unfollow, imagePreviewUrl, listPostsByAuthor, type Profile } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

export default function UserProfile() {
  const router = useRouter();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ userId: string; name: string }>();
  const targetUserId = params.userId || "";
  const targetName = params.name || "User";

  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
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
        <View style={styles.center}><Text style={styles.loadingTxt}>Loading...</Text></View>
      </SafeAreaView>
    );
  }

  if (!targetProfile) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <LinearGradient colors={["#FF3366", "#3366FF"]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitleWhite}>{targetName}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Feather name="user-x" size={44} color={colors.muted} />
          <Text style={styles.emptyTitle}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <LinearGradient colors={["#FF3366", "#3366FF"]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitleWhite}>{targetName}</Text>
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
            {targetProfile.verified && <Feather name="check-circle" size={18} color="#FFFFFF" />}
          </View>
          {targetProfile.handle && <Text style={styles.handle}>@{targetProfile.handle}</Text>}
          <View style={styles.locRow}>
            <Feather name="map-pin" size={13} color="#FFFFFF" />
            <Text style={styles.locText}>{targetProfile.locality} · {targetProfile.city}</Text>
          </View>
          {targetProfile.bio && <Text style={styles.bio}>{targetProfile.bio}</Text>}

          <View style={styles.statsWrap}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{targetProfile.postCount ?? 0}</Text>
              <Text style={styles.statLbl}>Posts</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{targetProfile.followerCount ?? 0}</Text>
              <Text style={styles.statLbl}>Followers</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{targetProfile.followingCount ?? 0}</Text>
              <Text style={styles.statLbl}>Following</Text>
            </View>
          </View>

          {!isSelf && (
            <Pressable
              onPress={toggleFollow}
              style={[styles.followBtn, followId && styles.followBtnActive]}
            >
              <Feather name={followId ? "check" : "user-plus"} size={16} color={followId ? "#FFFFFF" : "#000"} />
              <Text style={[styles.followBtnText, followId && styles.followBtnTextActive]}>
                {followId ? "Following ✓" : "Follow +"}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Feather name="file-text" size={16} color={colors.onSurface} />
          <Text style={styles.sectionTitle}>Posts</Text>
        </View>

        {posts.length === 0 ? (
          <View style={styles.center}>
            <Feather name="file-text" size={32} color={colors.muted} />
            <Text style={styles.emptyTitle}>No posts yet 📝</Text>
          </View>
        ) : (
          posts.map((p) => (
            <View key={p.$id} style={styles.postCard}>
              <Text style={styles.postContent} numberOfLines={4}>{p.content}</Text>
              <Text style={styles.postMeta}>{new Date(p.$createdAt).toLocaleDateString("en-IN")}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxxl, gap: spacing.md },
  loadingTxt: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000",
    backgroundColor: "rgba(255,51,102,0.9)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    gap: spacing.md,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitleWhite: { flex: 1, fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  profileSection: { alignItems: "center", paddingTop: 48, paddingHorizontal: spacing.lg, gap: 6 },
  avatarWrap: { marginTop: 0 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    borderWidth: 4, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 8,
    backgroundColor: colors.brandTertiary,
  },
  avatarText: { color: colors.brand, fontWeight: "900", fontSize: 36 },
  name: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.5 },
  handle: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  bio: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.9)", marginTop: spacing.md, textAlign: "center", lineHeight: 20 },
  statsWrap: {
    flexDirection: "row", marginTop: spacing.lg, alignSelf: "stretch", gap: 0,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: radius.lg,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    overflow: "hidden",
  },
  statBox: { flex: 1, alignItems: "center", paddingVertical: spacing.lg },
  statVal: { fontSize: 22, fontWeight: "900", color: colors.onSurface },
  statLbl: { fontSize: 11, fontWeight: "700", color: colors.muted, marginTop: 2 },
  followBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.lg,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  followBtnActive: { backgroundColor: "#3366FF", borderColor: "#000" },
  followBtnText: { color: "#000", fontWeight: "900", fontSize: 14 },
  followBtnTextActive: { color: "#FFFFFF" },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 2, borderBottomColor: "#000",
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.3 },
  postCard: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    padding: spacing.lg, gap: 4,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  postContent: { fontSize: 14, fontWeight: "600", color: colors.onSurface, lineHeight: 20 },
  postMeta: { fontSize: 11, fontWeight: "700", color: colors.muted, marginTop: 4 },
});
