import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

type Item = {
  id: string;
  title: string;
  price: number;
  description: string;
  locality: string;
  seller: { name: string; locality?: string };
};

export default function Marketplace() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listMarket();
      setItems(data);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

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
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, gap: spacing.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="shopping-bag" size={32} color={colors.muted} />
              <Text style={styles.emptyText}>Nothing for sale nearby.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View testID={`market-${item.id}`} style={styles.card}>
              <View style={styles.thumb}>
                <Feather name="shopping-bag" size={28} color={colors.brand} />
              </View>
              <View style={{ padding: spacing.md, gap: 4 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.price}>₹{item.price.toLocaleString("en-IN")}</Text>
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={11} color={colors.muted} />
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.seller.name} · {item.locality}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eyebrow: { fontSize: 10, fontWeight: "700", color: colors.brand, letterSpacing: 1.2 },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyText: { color: colors.muted, fontSize: 14 },
  card: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  thumb: {
    height: 100,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  price: { fontSize: 16, fontWeight: "800", color: colors.brand },
  desc: { fontSize: 12, color: colors.onSurfaceTertiary, lineHeight: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  meta: { fontSize: 11, color: colors.muted, flex: 1 },
});
