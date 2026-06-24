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
import { MarketDoc, listMarket, imagePreviewUrl } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

export default function Marketplace() {
  const router = useRouter();
  const { profile } = useAuth();
  const [items, setItems] = useState<MarketDoc[]>([]);
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

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>NEIGHBOURHOOD MARKET</Text>
        <Text style={styles.title}>For Sale Nearby</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          testID="market-list"
          data={items}
          keyExtractor={(i) => i.$id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="shopping-bag" size={32} color={colors.muted} />
              <Text style={styles.emptyTitle}>Nothing for sale in {profile?.city} yet</Text>
              <Text style={styles.emptyText}>Tap + to list your first item.</Text>
            </View>
          }
          renderItem={({ item }) => (
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
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.sellerName} · {item.locality}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Pressable
        testID="market-fab-create"
        onPress={() => router.push("/create-market")}
        style={styles.fab}
      >
        <Feather name="plus" size={26} color={colors.onBrand} />
      </Pressable>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  card: {
    flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  thumb: {
    height: 110, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  itemTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  price: { fontSize: 16, fontWeight: "800", color: colors.brand },
  desc: { fontSize: 12, color: colors.onSurfaceTertiary, lineHeight: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  meta: { fontSize: 11, color: colors.muted, flex: 1 },
  fab: {
    position: "absolute", right: spacing.lg, bottom: 80,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
