import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius } from "@/src/theme";

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <View style={styles.heroCard}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarBigText}>{profile?.name?.[0]?.toUpperCase() || "?"}</Text>
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
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Feather name="shield" size={18} color={colors.brand} />
            <Text style={styles.statValue}>{profile?.verified ? "Verified" : "New"}</Text>
            <Text style={styles.statLabel}>Trust</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="home" size={18} color={colors.brand} />
            <Text style={styles.statValue}>{profile?.city || "—"}</Text>
            <Text style={styles.statLabel}>City</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="cloud" size={18} color={colors.brand} />
            <Text style={styles.statValue}>Appwrite</Text>
            <Text style={styles.statLabel}>Backend</Text>
          </View>
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

function MenuRow({ icon, label, last }: { icon: any; label: string; last?: boolean }) {
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
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center",
  },
  avatarBigText: { color: colors.brand, fontWeight: "800", fontSize: 32 },
  name: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locText: { fontSize: 13, color: colors.onSurfaceTertiary },
  email: { fontSize: 12, color: colors.muted, marginTop: spacing.xs },
  statsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  statCard: {
    flex: 1, alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  statValue: { fontSize: 13, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  statLabel: { fontSize: 11, color: colors.muted },
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
