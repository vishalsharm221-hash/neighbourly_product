import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { ListingDoc, listListings, imagePreviewUrl, isFollowing, follow, unfollow } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

const LISTING_TYPES = [
  { key: "all", label: "All" },
  { key: "sale", label: "For Sale" },
  { key: "rental", label: "Rental" },
  { key: "pg", label: "PG" },
];

export default function Listings() {
  const router = useRouter();
  const { profile } = useAuth();
  const [listings, setListings] = useState<ListingDoc[]>([]);
  const [followMap, setFollowMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

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
      if (!profile?.userId || listings.length === 0) return;
      const ids = Array.from(new Set(listings.map((l) => l.hostId)));
      const results = await Promise.all(ids.map((id) => isFollowing(profile.userId, id)));
      const map: Record<string, string | null> = {};
      ids.forEach((id, i) => { map[id] = results[i]; });
      setFollowMap(map);
    })();
  }, [listings.length, profile?.userId]);

  const load = useCallback(async () => {
    if (!profile?.city) return;
    try {
      const type = filter === "all" ? undefined : filter;
      const data = await listListings(profile.city, type);
      setListings(data);
    } catch (e) {
      console.warn(e);
    }
  }, [profile?.city, filter]);

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

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PROPERTIES</Text>
        <Text style={styles.title}>Properties 🏠</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          testID="listings-list"
          data={listings}
          keyExtractor={(item) => item.$id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="home" size={32} color={colors.muted} />
              <Text style={styles.emptyTitle}>No properties in your hood 🏠</Text>
              <Text style={styles.emptyText}>List yours — tap +</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`listing-${item.$id}`}
              onPress={() => router.push(`/listing-detail?id=${item.$id}`)}
              style={styles.card}
            >
              <View style={styles.thumb}>
                {item.imageFileId ? (
                  <Image
                    source={imagePreviewUrl(item.imageFileId)}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />
                ) : (
                  <Feather name="home" size={28} color={colors.brand} />
                )}
              </View>
              <View style={{ padding: spacing.md, gap: 4 }}>
                <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.price}>₹{Math.round(item.price).toLocaleString("en-IN")}</Text>
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={11} color={colors.muted} />
                  <Pressable
                    onPress={() => {
                      router.push({ pathname: "/user-profile", params: { userId: item.hostId, name: item.hostName } });
                      ensureFollow(item.hostId);
                    }}
                  >
                    <Text style={[styles.meta, { color: colors.brand, fontWeight: "600" }]} numberOfLines={1}>
                      {item.hostName}
                    </Text>
                  </Pressable>
                  {profile?.userId !== item.hostId && (
                    <Pressable
                      onPress={() => toggleFollow(item.hostId)}
                      style={[styles.miniFollow, followMap[item.hostId] && styles.miniFollowActive]}
                    >
                      <Text style={[styles.miniFollowText, followMap[item.hostId] && styles.miniFollowTextActive]}>
                        {followMap[item.hostId] ? "Following" : "Follow"}
                      </Text>
                    </Pressable>
                  )}
                </View>
                {item.bedrooms != null || item.bathrooms != null || item.area_sqft != null ? (
                  <Text style={styles.detailsLine} numberOfLines={1}>
                    {[item.bedrooms != null ? `${item.bedrooms} bd` : null, item.bathrooms != null ? `${item.bathrooms} ba` : null, item.area_sqft != null ? `${item.area_sqft} sqft` : null].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}

      <Pressable
        testID="listings-fab-create"
        onPress={() => router.push("/create-listing")}
        style={styles.fab}
      >
        <Feather name="plus" size={26} color={colors.onBrand} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFBF9" },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000", backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  eyebrow: { fontSize: 10, fontWeight: "800", color: "#3366FF", letterSpacing: 1.2 },
  title: { fontSize: 22, fontWeight: "900", color: "#000", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyTitle: { color: "#000", fontSize: 16, fontWeight: "900", textAlign: "center", marginTop: 0 },
  emptyText: { color: "#000", fontSize: 13, textAlign: "center", lineHeight: 19, fontWeight: "500" },
  card: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 20,
    borderWidth: 3, borderColor: "#000", overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  thumb: {
    height: 110, backgroundColor: "#F3F3F5",
    alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "#000",
  },
  listingTitle: { fontSize: 14, fontWeight: "800", color: "#000" },
  price: { fontSize: 15, fontWeight: "900", color: "#3366FF" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: 11, color: "#000", flex: 1, fontWeight: "600" },
  miniFollow: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12,
    borderWidth: 2, borderColor: "#3366FF", backgroundColor: "#F3F3F5",
  },
  miniFollowActive: { backgroundColor: "#3366FF" },
  miniFollowText: { fontSize: 9, fontWeight: "800", color: "#3366FF" },
  miniFollowTextActive: { color: "#FFFFFF" },
  detailsLine: { fontSize: 11, color: "#000", marginTop: 2, fontWeight: "600" },
  fab: {
    position: "absolute", right: spacing.lg, bottom: 80,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    borderWidth: 3, borderColor: "#000",
  },
});
