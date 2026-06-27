import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, radius } from "@/src/theme";

type Section = { key: string; label: string; icon: string; route: string; tileColor: string; tileBg: string };

const SECTIONS: Section[] = [
  { key: "businesses", label: "Local Biz", icon: "briefcase", route: "/businesses", tileColor: "#FF6B35", tileBg: "#FFE8D9" },
  { key: "events", label: "Events", icon: "calendar", route: "/events", tileColor: "#FF3366", tileBg: "#FFE0EC" },
  { key: "groups", label: "Groups", icon: "users", route: "/groups", tileColor: "#7C3AED", tileBg: "#EDE5FF" },
  { key: "marketplace", label: "Market", icon: "shopping-bag", route: "/marketplace", tileColor: "#22C55E", tileBg: "#D4F5E2" },
  { key: "services", label: "Services", icon: "tool", route: "/services", tileColor: "#3366FF", tileBg: "#D9E5FF" },
  { key: "safety", label: "Safety", icon: "shield", route: "/safety", tileColor: "#EF4444", tileBg: "#FFE0D9" },
];

export default function Explore() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 400));
    setRefreshing(false);
  };

  const TRENDING = [
    {
      id: "1", type: "Event", title: "DU Fest 2026 Passes",
      subtitle: "1,200 people interested",
      img: "https://images.unsplash.com/photo-1540553016722-983e48a2cd10?auto=format&fit=crop&w=150&q=80",
      color: "#FF3366",
    },
    {
      id: "2", type: "Safety Alert", title: "Traffic jam at DND",
      subtitle: "Reported 10 mins ago",
      img: null,
      color: "#66FF33",
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Blue brutalist header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>DISCOVER</Text>
            <Text style={styles.headerTitle}>Explore 👀</Text>
          </View>
          <View style={styles.locBadge}>
            <Feather name="map-pin" size={14} color="#FF3366" />
            <Text style={styles.locBadgeText}>North Campus, DU</Text>
          </View>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {["All", "Food 🍕", "Events 🎟️", "News 📰", "Market 🛍️"].map((label) => (
            <Pressable key={label} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3366FF" />}
      >
        {/* Icon grid */}
        <View style={styles.grid}>
          {SECTIONS.map((s) => (
            <Pressable
              key={s.key}
              testID={`explore-${s.key}`}
              style={styles.gridItem}
              onPress={() => router.push(s.route)}
            >
              <View style={[styles.gridIcon, { backgroundColor: s.tileBg }]}>
                <Feather name={s.icon as any} size={26} color={s.tileColor} />
              </View>
              <Text style={styles.gridLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Trending */}
        <View>
          <View style={styles.trendingHead}>
            <Feather name="send" size={20} color="#FF3366" />
            <Text style={styles.trendingTitle}>Trending Now 🔥</Text>
          </View>
          {TRENDING.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.trendCard, { borderLeftColor: item.color }]}
              onPress={() => {}}
            >
              {item.img ? (
                <View style={styles.trendImg}>
                  <Image source={{ uri: item.img }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                </View>
              ) : (
                <View style={[styles.trendIcon, { backgroundColor: item.tileBg }]}>
                  <Feather name="alert-triangle" size={24} color={item.color} />
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.trendType, { color: item.color }]}>{item.type}</Text>
                <Text style={styles.trendTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.trendSub}>{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.center}>
          <Text style={styles.emptyText}>More sections coming soon bestie ✨</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { Image } from "expo-image";
import { ScrollView } from "react-native";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    backgroundColor: "#3366FF",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.8)", letterSpacing: 1.2 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#FFFFFF", marginTop: 2, letterSpacing: -1 },
  locBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  locBadgeText: { fontSize: 12, fontWeight: "800", color: "#000" },
  chipsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, paddingRight: spacing.lg },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  chipText: { fontSize: 12, fontWeight: "800", color: "#000", whiteSpace: "nowrap" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  gridItem: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.sm,
  },
  gridIcon: {
    width: 52, height: 52, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
  },
  gridLabel: { fontSize: 12, fontWeight: "900", color: colors.onSurface, textAlign: "center" },
  trendingHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.md },
  trendingTitle: { fontSize: 22, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.5 },
  trendCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 2, borderColor: "#000",
    borderLeftWidth: 6,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    marginBottom: spacing.md,
  },
  trendImg: { width: 56, height: 56, borderRadius: radius.md, borderWidth: 2, borderColor: "#000", overflow: "hidden" },
  trendIcon: {
    width: 56, height: 56, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
  },
  trendType: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  trendTitle: { fontSize: 16, fontWeight: "900", color: colors.onSurface, lineHeight: 20 },
  trendSub: { fontSize: 12, fontWeight: "700", color: colors.muted },
  center: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: "600", textAlign: "center" },
});
