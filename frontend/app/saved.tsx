import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { listSavedItems, unsaveItem, SavedItemDoc } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

const TYPE_ICON: Record<string, keyof typeof Feather> = {
  post: "file-text",
  event: "calendar",
  market: "shopping-bag",
  business: "briefcase",
  listing: "home",
  recommendation: "star",
};

const TYPE_LABEL: Record<string, string> = {
  post: "Post",
  event: "Event",
  market: "Market",
  business: "Business",
  listing: "Listing",
  recommendation: "Recommendation",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function Saved() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<SavedItemDoc[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const data = await listSavedItems(user.$id);
      setItems(data);
    } catch (e) {
      console.warn("Failed to load saved items", e);
    } finally {
      setBusy(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(load);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  const handleDelete = useCallback((item: SavedItemDoc) => {
    Alert.alert("Remove Saved Item", "Are you sure you want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (!user) return;
          try {
            await unsaveItem(user.$id, item.itemType, item.itemId);
            setItems((prev) => prev.filter((i) => i.$id !== item.$id));
          } catch (e) {
            console.warn("Failed to unsave item", e);
          }
        },
      },
    ]);
  }, [user]);

  const renderItem = useCallback(({ item }: { item: SavedItemDoc }) => {
    const iconName = TYPE_ICON[item.itemType] || "bookmark";
    const label = TYPE_LABEL[item.itemType] || item.itemType;
    return (
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Feather name={iconName} size={18} color={colors.brand} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.typeLabel}>{label}</Text>
          <Text style={styles.itemId}>ID: {item.itemId.slice(0, 8)}...</Text>
          <Text style={styles.date}>{formatDate(item.$createdAt)}</Text>
        </View>
        <Pressable
          testID={`unsave-${item.$id}`}
          onPress={() => handleDelete(item)}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Feather name="trash-2" size={18} color={colors.error} />
        </Pressable>
      </View>
    );
  }, [handleDelete]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="saved-back" onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Saved 🔖</Text>
        <View style={{ width: 24 }} />
      </View>

      {busy && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="bookmark" size={40} color={colors.muted} />
          <Text style={styles.emptyText}>Nothing saved yet?</Text>
          <Text style={styles.emptySub}>Tap the 🔖 on things you love bestie</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.$id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Full item preview coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFBF9" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000", gap: spacing.md, backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "900", color: "#000", textAlign: "center", letterSpacing: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  emptyText: { fontSize: 16, fontWeight: "800", color: "#000", marginTop: spacing.md },
  emptySub: { fontSize: 14, color: "#000", fontWeight: "500" },
  row: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 3,
    borderColor: "#000",
    gap: spacing.md,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "#F3F3F5",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
  },
  textWrap: { flex: 1 },
  typeLabel: { fontSize: 14, fontWeight: "800", color: "#000" },
  itemId: { fontSize: 12, color: "#000", marginTop: 2, fontWeight: "600" },
  date: { fontSize: 11, color: "#000", marginTop: 2, fontWeight: "600" },
  deleteBtn: { padding: spacing.sm },
  footer: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderTopWidth: 3, borderTopColor: "#000",
    backgroundColor: "#F3F3F5",
  },
  footerText: { fontSize: 12, color: "#000", textAlign: "center", fontWeight: "600" },
});
