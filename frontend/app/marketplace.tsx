import { useCallback, useState } from "react";
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
import { MarketDoc, listMarket, imagePreviewUrl, isFollowing, follow, unfollow } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

export default function Marketplace() {
  const router = useRouter();
  const { profile } = useAuth();
  const [items, setItems] = useState<MarketDoc[]>([]);
  const [followMap, setFollowMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.city) return;
    try {
      const data = await listMarket(profile.city);
      setItems(data);
    } catch (e) {
      console.warn(e);
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

  const renderItem = ({ item }: { item: MarketDoc }) => {
    const isSelf = profile?.userId === item.sellerId;
    return (
      <View testID={`market-${item.$id}`} style={styles.card}>
        <View style={styles.thumb}>
          {item.imageFileId ? (
            <Image
              source={imagePreviewUrl(item.imageFileId)}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          ) : (
            <Feather name="shopping-bag" size={28} color={colors.brand} />
          )}
        </View>
        <View style={{ padding: spacing.md, gap: 4 }}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.price}>₹{Math.round(item.price).toLocaleString("en-IN")}</Text>
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={11} color={colors.muted} />
            <Pressable
              onPress={() => {
                router.push({ pathname: "/user-profile", params: { userId: item.sellerId, name: item.sellerName } });
                ensureFollow(item.sellerId);
              }}
            >
              <Text style={[styles.meta, { color: colors.brand, fontWeight: "700" }]} numberOfLines={1}>
                {item.sellerName}
              </Text>
            </Pressable>
            {!isSelf && (
              <Pressable
                onPress={() => toggleFollow(item.sellerId)}
                style={[styles.miniFollow, followMap[item.sellerId] && styles.miniFollowActive]}
              >
                <Text style={[styles.miniFollowText, followMap[item.sellerId] && styles.miniFollowTextActive]}>
                  {followMap[item.sellerId] ? "✓" : "+"}
                </Text>
              </Pressable>
            )}
            <Text style={styles.meta} numberOfLines={1}>
              · {item.locality}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>BAZAAR</Text>
          <Text style={styles.title}>Bazaar 🛒</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingTxt}>Loading... 🛒</Text>
        </View>
      ) : (
        <FlatList
          testID="market-list"
          data={items}
          keyExtractor={(i) => i.$id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3366FF" />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="shopping-bag" size={44} color={colors.muted} />
              <Text style={styles.emptyTitle}>Nothing for sale in {profile?.city} yet</Text>
              <Text style={styles.emptyText}>Tap + to list your first item ✨</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      <Pressable
        testID="market-fab-create"
        onPress={() => router.push("/create-market")}
        style={styles.fab}
      >
        <Feather name="plus" size={26} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  eyebrow: { fontSize: 10, fontWeight: "800", color: colors.brand, letterSpacing: 1.2 },
  title: { fontSize: 24, fontWeight: "900", color: colors.onSurface, marginTop: 2, letterSpacing: -0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingTxt: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  card: {
    flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    overflow: "hidden",
  },
  thumb: {
    height: 110, backgroundColor: "#E6EFE9",
    alignItems: "center", justifyContent: "center",
    borderBottomWidth: 2, borderBottomColor: "#000",
  },
  itemTitle: { fontSize: 13, fontWeight: "800", color: colors.onSurface, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  price: { fontSize: 16, fontWeight: "900", color: colors.brand, paddingHorizontal: spacing.md },
  desc: { fontSize: 12, fontWeight: "600", color: colors.onSurfaceTertiary, lineHeight: 16, paddingHorizontal: spacing.md },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, paddingHorizontal: spacing.md },
  meta: { fontSize: 11, fontWeight: "700", color: colors.muted, flex: 1 },
  miniFollow: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.surfaceSecondary,
  },
  miniFollowActive: { backgroundColor: colors.brand },
  miniFollowText: { fontSize: 9, fontWeight: "700", color: colors.brand },
  miniFollowTextActive: { color: colors.onBrand },
  fab: {
    position: "absolute", right: spacing.lg, bottom: 80,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 6,
    borderWidth: 2, borderColor: "#000",
  },
});
