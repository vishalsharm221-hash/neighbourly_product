import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, radius } from "@/src/theme";

type Section = { key: string; label: string; icon: string; route: string };

const SECTIONS: Section[] = [
  { key: "businesses", label: "Nearby Businesses", icon: "briefcase", route: "/businesses" },
  { key: "services", label: "Local Services", icon: "tool", route: "/services" },
  { key: "groups", label: "Groups", icon: "users", route: "/groups" },
  { key: "events", label: "Events", icon: "calendar", route: "/events" },
  { key: "recommendations", label: "Recommendations", icon: "star", route: "/recommendations" },
  { key: "safety", label: "Safety Alerts", icon: "shield", route: "/safety" },
  { key: "news", label: "News", icon: "radio", route: "/news" },
  { key: "listings", label: "Real Estate", icon: "home", route: "/listings" },
  { key: "polls", label: "Polls", icon: "bar-chart-2", route: "/polls" },
  { key: "map", label: "Map", icon: "map", route: "/map" },
];

export default function Explore() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 400));
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DISCOVER</Text>
        <Text style={styles.title}>Explore</Text>
      </View>

      <FlatList
        data={SECTIONS}
        keyExtractor={(s) => s.key}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable
            testID={`explore-${item.key}`}
            style={styles.card}
            onPress={() => router.push(item.route)}
          >
            <View style={styles.iconWrap}>
              <Feather name={item.icon as any} size={22} color={colors.brand} />
            </View>
            <Text style={styles.cardLabel} numberOfLines={2}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={colors.muted} style={{ position: "absolute", top: spacing.md, right: spacing.md }} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Feather name="compass" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>Check back soon.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  eyebrow: { fontSize: 10, fontWeight: "700", color: colors.brand, letterSpacing: 1.2 },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  emptyText: { fontSize: 13, color: colors.muted },
  card: {
    flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm, minHeight: 110,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  cardLabel: { fontSize: 13, fontWeight: "700", color: colors.onSurface, lineHeight: 18 },
});
