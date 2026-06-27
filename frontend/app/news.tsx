import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { listNews, NewsDoc } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

type NewsTab = "all" | "local" | "safety" | "traffic" | "events";

const TABS: { key: NewsTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "local", label: "Local" },
  { key: "safety", label: "Safety" },
  { key: "traffic", label: "Traffic" },
  { key: "events", label: "Events" },
];

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function imageUrl(doc: NewsDoc) {
  if (doc.imageUrl) return doc.imageUrl;
  return null;
}

export default function NewsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [news, setNews] = useState<NewsDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<NewsTab>("all");
  const [expanded, setExpanded] = useState<NewsDoc | null>(null);

  const load = useCallback(async () => {
    if (!profile?.city) return;
    try {
      const data = await listNews(profile.city);
      setNews(data);
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

  const filtered = tab === "all"
    ? news
    : news.filter((n) => (n.category || "").toLowerCase() === tab);

  const renderNewsItem = ({ item }: { item: NewsDoc }) => {
    const imgUrl = imageUrl(item);
    return (
      <Pressable
        style={styles.card}
        onPress={() => setExpanded(item)}
      >
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.cardImage} contentFit="cover" />
        ) : null}
        <View style={[styles.cardBody, !imgUrl && styles.cardBodyNoImage]}>
          <View style={styles.cardMetaRow}>
            {item.category ? (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{item.category}</Text>
              </View>
            ) : null}
            <Text style={styles.timeText}>{timeAgo(item.publishedAt)}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          {item.summary ? (
            <Text style={styles.cardSummary} numberOfLines={2}>{item.summary}</Text>
          ) : null}
          <View style={styles.cardMeta}>
            {item.source ? (
              <View style={styles.metaItem}>
                <Feather name="share-2" size={12} color={colors.muted} />
                <Text style={styles.cardMetaText}>{item.source}</Text>
              </View>
            ) : null}
          </View>
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
          <Text style={styles.headerEyebrow}>STAY INFORMED</Text>
          <Text style={styles.headerTitle}>Local News 📰</Text>
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
            testID={`news-tab-${t.key}`}
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
          testID="news-list"
          data={filtered}
          keyExtractor={(n) => n.$id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="newspaper" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>No news rn 📰</Text>
              <Text style={styles.emptyText}>{tab === "all" ? "Check back later bestie" : `No ${tab} news rn.`}</Text>
            </View>
          }
          renderItem={renderNewsItem}
        />
      )}

      <Modal visible={!!expanded} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalRoot} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setExpanded(null)} hitSlop={10}>
              <Feather name="x" size={24} color={colors.onSurface} />
            </Pressable>
            <Text style={styles.modalTitle}>Article</Text>
            <View style={{ width: 24 }} />
          </View>
          {expanded && (
            <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
              {imageUrl(expanded) ? (
                <Image source={{ uri: imageUrl(expanded)! }} style={styles.modalImage} contentFit="cover" />
              ) : null}
              {expanded.category ? (
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{expanded.category}</Text>
                </View>
              ) : null}
              <Text style={styles.modalHeadline}>{expanded.title}</Text>
              <View style={styles.modalMeta}>
                {expanded.source ? (
                  <View style={styles.metaItem}>
                    <Feather name="share-2" size={12} color={colors.muted} />
                    <Text style={styles.modalMetaText}>{expanded.source}</Text>
                  </View>
                ) : null}
                <Text style={styles.modalMetaText}>{timeAgo(expanded.publishedAt)}</Text>
              </View>
              <Text style={styles.modalBody}>
                {expanded.content || expanded.summary || expanded.title}
              </Text>
              {expanded.sourceUrl ? (
                <Pressable
                  style={styles.linkBtn}
                  onPress={() => {
                    setExpanded(null);
                    router.push({ pathname: expanded.sourceUrl } as any);
                  }}
                >
                  <Feather name="external-link" size={16} color={colors.onBrand} />
                  <Text style={styles.linkBtnText}>Open original article</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
    borderWidth: 3, borderColor: "#000", overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  cardImage: { width: "100%", height: 180, backgroundColor: "#F3F3F5", borderBottomWidth: 3, borderBottomColor: "#000" },
  cardBody: { padding: spacing.md, gap: 6 },
  cardBodyNoImage: { padding: spacing.lg },
  cardMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catBadge: {
    backgroundColor: "#F3F3F5", paddingHorizontal: spacing.sm,
    paddingVertical: 3, borderRadius: 12, borderWidth: 2, borderColor: "#000",
  },
  catBadgeText: { fontSize: 11, fontWeight: "800", color: "#3366FF", textTransform: "uppercase" },
  timeText: { fontSize: 12, color: "#000", fontWeight: "600" },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#000", lineHeight: 20 },
  cardSummary: { fontSize: 13, color: "#000", lineHeight: 18, fontWeight: "500" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  cardMetaText: { fontSize: 12, color: "#000", fontWeight: "600" },
  modalRoot: { flex: 1, backgroundColor: "#FBFBF9" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000", backgroundColor: "rgba(255,255,255,0.92)",
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#000" },
  modalImage: { width: "100%", height: 220, borderRadius: 20, marginBottom: spacing.md, borderWidth: 3, borderColor: "#000" },
  modalHeadline: { fontSize: 20, fontWeight: "900", color: "#000", lineHeight: 26, marginBottom: spacing.sm },
  modalMeta: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  modalMetaText: { fontSize: 13, color: "#000", fontWeight: "600" },
  modalBody: { fontSize: 15, color: "#000", lineHeight: 22, fontWeight: "500" },
  linkBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginTop: spacing.lg, paddingVertical: spacing.sm,
  },
  linkBtnText: { fontSize: 14, fontWeight: "800", color: "#3366FF" },
});
