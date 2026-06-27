import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { listServices, ServiceDoc, isFollowing, follow, unfollow } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

type ServiceTab = "all" | "Plumber" | "Electrician" | "Cleaner" | "Tutor" | "Other";

const TABS: { key: ServiceTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Plumber", label: "Plumber" },
  { key: "Electrician", label: "Electrician" },
  { key: "Cleaner", label: "Cleaner" },
  { key: "Tutor", label: "Tutor" },
  { key: "Other", label: "Other" },
];

const SERVICE_ICONS: Record<string, string> = {
  Plumber: "droplet",
  Electrician: "zap",
  Cleaner: "wind",
  Tutor: "book-open",
  Other: "tool",
};

export default function ServicesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [followMap, setFollowMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<ServiceTab>("all");

  const ensureFollow = async (uid: string) => {
    if (!profile?.userId || followMap[uid] !== undefined) return;
    const fid = await isFollowing(profile.userId, uid);
    setFollowMap((prev) => ({ ...prev, [uid]: fid }));
  };

  const toggleFollow = async (uid: string) => {
    if (!profile?.userId || !profile?.$id) return;
    const current = followMap[uid];
    if (current) {
      await unfollow(current, profile.$id);
      setFollowMap((prev) => ({ ...prev, [uid]: null }));
    } else {
      const doc = await follow(profile.userId, uid, profile.$id, "");
      setFollowMap((prev) => ({ ...prev, [uid]: doc.$id }));
    }
  };

  useEffect(() => {
    (async () => {
      if (!profile?.userId || services.length === 0) return;
      const ids = Array.from(new Set(services.map((s) => s.providerId)));
      const results = await Promise.all(ids.map((id) => isFollowing(profile.userId, id)));
      const map: Record<string, string | null> = {};
      ids.forEach((id, i) => { map[id] = results[i]; });
      setFollowMap(map);
    })();
  }, [services.length, profile?.userId]);

  const load = useCallback(async () => {
    if (!profile?.city) return;
    try {
      const data = await listServices(profile.city);
      setServices(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [profile?.city]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = tab === "all" ? services : services.filter((s) => s.serviceType === tab);

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars: string[] = [];
    for (let i = 0; i < full; i++) stars.push("★");
    if (half) stars.push("★");
    return stars.join("");
  };

  const renderItem = ({ item }: { item: ServiceDoc }) => {
    const iconName = SERVICE_ICONS[item.serviceType] || "tool";
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push({ pathname: "/service-detail" as any, params: { id: item.$id } })}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconCircle}>
            <Feather name={iconName as any} size={20} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Pressable onPress={() => router.push({ pathname: "/user-profile" as any, params: { userId: item.providerId, name: item.providerName } })}>
                <Text style={styles.providerName}>{item.providerName}</Text>
              </Pressable>
              {item.verified && (
                <Feather name="check-circle" size={14} color={colors.brand} />
              )}
              {profile?.userId !== item.providerId && (
                <Pressable
                  onPress={() => toggleFollow(item.providerId)}
                  style={[styles.miniFollow, followMap[item.providerId] && styles.miniFollowActive]}
                >
                  <Text style={[styles.miniFollowText, followMap[item.providerId] && styles.miniFollowTextActive]}>
                    {followMap[item.providerId] ? "Following" : "Follow"}
                  </Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.serviceType}>{item.serviceType}</Text>
          </View>
          <View style={styles.priceWrap}>
            {item.hourlyRate != null && (
              <Text style={styles.priceText}>₹{item.hourlyRate}/hr</Text>
            )}
          </View>
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description || "Service provider"}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.ratingRow}>
            <Text style={styles.starsText}>{renderStars(item.rating)}</Text>
            <Text style={styles.ratingNum}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount})</Text>
          </View>
          {item.locality ? (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={12} color={colors.muted} />
              <Text style={styles.cardMetaText}>{item.locality}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.headerEyebrow}>LOCAL PROS</Text>
          <Text style={styles.headerTitle}>Services 🔧</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            testID={`service-tab-${t.key}`}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          testID="services-list"
          data={filtered}
          keyExtractor={(s) => s.$id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="tool" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>No service providers</Text>
              <Text style={styles.emptyText}>
                {tab === "all"
                  ? "No pros in your hood yet — be the first bestie 🔧"
                  : `No ${tab.toLowerCase()}s listed yet.`}
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push("/create-service" as any)}
      >
        <Feather name="plus" size={24} color={colors.onBrand} />
        <Text style={styles.fabText}>Offer Service</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFBF9" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000", gap: spacing.md, backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  headerEyebrow: { fontSize: 11, fontWeight: "800", color: "#3366FF", letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#000" },
  tabsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.md },
  tab: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: 12, backgroundColor: "#F3F3F5",
    borderWidth: 2, borderColor: "#000",
  },
  tabActive: { backgroundColor: "#3366FF", borderColor: "#000" },
  tabText: { fontSize: 13, fontWeight: "800", color: "#000" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "900" },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#000" },
  emptyText: { fontSize: 13, color: "#000", textAlign: "center", fontWeight: "500" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20,
    borderWidth: 3, borderColor: "#000", padding: spacing.lg, gap: spacing.sm,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  iconCircle: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: "#F3F3F5",
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  providerName: { fontSize: 15, fontWeight: "900", color: "#000" },
  serviceType: { fontSize: 13, color: "#000", marginTop: 2, fontWeight: "600" },
  miniFollow: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
    borderWidth: 2, borderColor: "#3366FF", backgroundColor: "#F3F3F5",
  },
  miniFollowActive: { backgroundColor: "#3366FF" },
  miniFollowText: { fontSize: 10, fontWeight: "800", color: "#3366FF" },
  miniFollowTextActive: { color: "#FFFFFF" },
  priceWrap: { alignItems: "flex-end" },
  priceText: { fontSize: 14, fontWeight: "900", color: "#3366FF" },
  cardDesc: { fontSize: 13, color: "#000", lineHeight: 18, fontWeight: "500" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  starsText: { fontSize: 14, color: "#B58500", letterSpacing: -1 },
  ratingNum: { fontSize: 14, fontWeight: "800", color: "#000" },
  reviewCount: { fontSize: 12, color: "#000", fontWeight: "600" },
  cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontSize: 12, color: "#000", fontWeight: "600" },
  fab: {
    position: "absolute", bottom: 24, right: spacing.lg,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#3366FF", paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000", shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 4,
    borderWidth: 3, borderColor: "#000",
  },
  fabText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
