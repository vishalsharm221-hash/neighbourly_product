import { useCallback, ComponentProps } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { imagePreviewUrl } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

type FeatherName = ComponentProps<typeof Feather>["name"];

export default function Profile() {
  const { user, profile, signOut, refresh } = useAuth();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.avatarBig}>
            {profile?.avatarFileId ? (
              <Image
                source={imagePreviewUrl(profile.avatarFileId)}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.avatarBigText}>{profile?.name?.[0]?.toUpperCase() || "?"}</Text>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md }}>
            <Text testID="profile-name" style={styles.name}>{profile?.name}</Text>
            {profile?.verified && <Feather name="check-circle" size={18} color={colors.brand} />}
          </View>
          <View style={styles.locRow}>
            <Feather name="map-pin" size={13} color={colors.muted} />
            <Text testID="profile-locality" style={styles.locText}>
              {profile?.locality} · {profile?.city}
            </Text>
          </View>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <Text style={styles.email}>{user?.email}</Text>

          {/* Insta-style stats */}
          <View style={styles.statsRow}>
            <Stat value={profile?.postCount ?? 0} label="Posts" />
            <View style={styles.statDivider} />
            <Stat value={profile?.followerCount ?? 0} label="Followers" />
            <View style={styles.statDivider} />
            <Stat value={profile?.followingCount ?? 0} label="Following" />
          </View>

          <Pressable
            testID="edit-profile-button"
            onPress={() => router.push("/edit-profile")}
            style={styles.editBtn}
          >
            <Feather name="edit-2" size={14} color={colors.brand} />
            <Text style={styles.editBtnText}>Edit profile</Text>
          </Pressable>
        </View>

        <Pressable
          testID="change-location"
          onPress={() => router.push("/onboarding")}
          style={styles.menuRowSolo}
        >
          <Feather name="map-pin" size={18} color={colors.brand} />
          <Text style={styles.menuLabel}>Change city / locality</Text>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </Pressable>

        <View style={styles.menu}>
          <MenuRow icon="bell" label="Notifications" />
          <MenuRow icon="shield" label="Safety & Privacy" />
          <MenuRow icon="help-circle" label="Help & Support" />
          <MenuRow icon="info" label="About Neighbourly" last />
        </View>

        <Pressable
          testID="logout-button"
          onPress={handleLogout}
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}
        >
          <Feather name="log-out" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({ icon, label, last }: { icon: FeatherName; label: string; last?: boolean }) {
  return (
    <Pressable style={[styles.menuRow, last && { borderBottomWidth: 0 }]}>
      <Feather name={icon} size={18} color={colors.onSurfaceTertiary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Feather name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  heroCard: {
    alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.xl, borderWidth: 1, borderColor: colors.border,
  },
  avatarBig: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  avatarBigText: { color: colors.brand, fontWeight: "800", fontSize: 36 },
  name: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locText: { fontSize: 13, color: colors.onSurfaceTertiary },
  bio: { fontSize: 14, color: colors.onSurface, marginTop: spacing.md, textAlign: "center", lineHeight: 20 },
  email: { fontSize: 12, color: colors.muted, marginTop: spacing.xs },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg, alignSelf: "stretch" },
  stat: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.brand, marginTop: spacing.lg,
  },
  editBtnText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  menuRowSolo: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    marginTop: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: 14,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  menu: {
    marginTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 14, color: colors.onSurface },
  logout: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, marginTop: spacing.xl,
    paddingVertical: 14, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.error,
  },
  logoutText: { color: colors.error, fontWeight: "700", fontSize: 14 },
});
