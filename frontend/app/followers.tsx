import { useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";

import { Image } from "expo-image";
import { useAuth } from "@/src/auth-context";
import { listFollowers, getProfilesByUserIds, imagePreviewUrl } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

export default function FollowersScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [follows, setFollows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.userId) return;
    try {
      const f = await listFollowers(profile.userId);
      setFollows(f);
      const ids = f.map((doc: any) => doc.followerId);
      const ps = await getProfilesByUserIds(ids);
      setProfiles(ps);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [profile?.userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : profiles.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={36} color={colors.muted} />
          <Text style={styles.emptyTitle}>No followers yet</Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.$id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: "/user-profile" as any, params: { userId: item.userId, name: item.name } })}
            >
              <View style={styles.avatar}>
                {item.avatarFileId ? (
                  <Image source={{ uri: imagePreviewUrl(item.avatarFileId) }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>{item.locality} · {item.city}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          )}
        />
      )}
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.onSurface },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarText: { color: colors.brand, fontWeight: "700", fontSize: 16 },
  name: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
