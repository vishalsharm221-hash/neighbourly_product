import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api, CATEGORIES } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius } from "@/src/theme";

type Post = {
  id: string;
  content: string;
  category: string;
  city: string;
  locality: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  author: { name: string; locality?: string; verified?: boolean };
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function catColor(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.color || colors.muted;
}
function catLabel(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.label || key;
}

export default function Feed() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [translateModal, setTranslateModal] = useState<{ id: string; text: string } | null>(null);
  const [translation, setTranslation] = useState<string>("");
  const [translating, setTranslating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listPosts(filter);
      setPosts(data);
    } catch (e) {
      console.warn(e);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onLike = async (p: Post) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // optimistic
    setPosts((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? { ...x, liked_by_me: !x.liked_by_me, like_count: x.like_count + (x.liked_by_me ? -1 : 1) }
          : x
      )
    );
    try {
      await api.likePost(p.id);
    } catch {
      load();
    }
  };

  const onTranslate = async (p: Post, target: "hindi" | "english") => {
    setTranslating(true);
    setTranslation("");
    setTranslateModal({ id: p.id, text: p.content });
    try {
      const res = await api.translate(p.content, target);
      setTranslation(res.translation);
    } catch (e: any) {
      setTranslation(`Error: ${e?.message || "failed"}`);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>YOUR NEIGHBOURHOOD</Text>
          <Text testID="feed-locality" style={styles.headerTitle}>
            <Feather name="map-pin" size={16} color={colors.brand} /> {user?.locality} · {user?.city}
          </Text>
        </View>
      </View>

      {/* Category chips */}
      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {[{ key: "all", label: "All" }, ...CATEGORIES].map((c) => {
            const active = filter === c.key;
            return (
              <Pressable
                key={c.key}
                testID={`feed-filter-${c.key}`}
                onPress={() => setFilter(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          testID="feed-list"
          data={posts}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={32} color={colors.muted} />
              <Text style={styles.emptyText}>No posts yet. Be the first to say hi!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View testID={`post-${item.id}`} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.author.name?.[0]?.toUpperCase() || "?"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={styles.author}>{item.author.name}</Text>
                    {item.author.verified && (
                      <Feather name="check-circle" size={13} color={colors.brand} />
                    )}
                  </View>
                  <Text style={styles.meta}>
                    📍 {item.locality} · {timeAgo(item.created_at)}
                  </Text>
                </View>
                <View style={[styles.catPill, { backgroundColor: `${catColor(item.category)}15`, borderColor: catColor(item.category) }]}>
                  <Text style={[styles.catPillText, { color: catColor(item.category) }]}>
                    {catLabel(item.category)}
                  </Text>
                </View>
              </View>

              <Text style={styles.content}>{item.content}</Text>

              <View style={styles.actions}>
                <Pressable
                  testID={`like-${item.id}`}
                  onPress={() => onLike(item)}
                  style={styles.actionBtn}
                >
                  <Feather
                    name="heart"
                    size={18}
                    color={item.liked_by_me ? colors.error : colors.onSurfaceTertiary}
                  />
                  <Text style={[styles.actionText, item.liked_by_me && { color: colors.error }]}>
                    {item.like_count}
                  </Text>
                </Pressable>
                <Pressable
                  testID={`translate-hindi-${item.id}`}
                  onPress={() => onTranslate(item, "hindi")}
                  style={styles.actionBtn}
                >
                  <Feather name="globe" size={18} color={colors.onSurfaceTertiary} />
                  <Text style={styles.actionText}>हिं</Text>
                </Pressable>
                <Pressable
                  testID={`translate-en-${item.id}`}
                  onPress={() => onTranslate(item, "english")}
                  style={styles.actionBtn}
                >
                  <Feather name="globe" size={18} color={colors.onSurfaceTertiary} />
                  <Text style={styles.actionText}>EN</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        testID="feed-fab-create"
        onPress={() => router.push("/create-post")}
        style={styles.fab}
      >
        <Feather name="plus" size={26} color={colors.onBrand} />
      </Pressable>

      {/* Translate modal */}
      <Modal
        visible={translateModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTranslateModal(null)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setTranslateModal(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHead}>
              <Feather name="globe" size={18} color={colors.brand} />
              <Text style={styles.modalTitle}>Translation</Text>
              <Pressable onPress={() => setTranslateModal(null)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.onSurfaceTertiary} />
              </Pressable>
            </View>
            <Text style={styles.modalLabel}>Original</Text>
            <Text style={styles.modalText}>{translateModal?.text}</Text>
            <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>Translated</Text>
            {translating ? (
              <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.sm }} />
            ) : (
              <Text testID="translation-result" style={styles.modalText}>
                {translation}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerEyebrow: { fontSize: 10, fontWeight: "700", color: colors.brand, letterSpacing: 1.2 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  chipsWrap: { height: 56, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: "center" },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  chipTextActive: { color: colors.onBrand },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyText: { color: colors.muted, fontSize: 14 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.brand, fontWeight: "700", fontSize: 16 },
  author: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  catPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  catPillText: { fontSize: 11, fontWeight: "700" },
  content: { fontSize: 15, color: colors.onSurface, lineHeight: 22 },
  actions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontSize: 13, color: colors.onSurfaceTertiary, fontWeight: "600" },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, width: "100%", maxWidth: 480 },
  modalHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface },
  modalLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 1, marginBottom: 4 },
  modalText: { fontSize: 15, color: colors.onSurface, lineHeight: 22 },
});
