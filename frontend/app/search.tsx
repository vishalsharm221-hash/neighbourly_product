import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import {
  listPosts,
  listBusinesses,
  listGroups,
  listListings,
  PostDoc,
  BusinessDoc,
  GroupDoc,
  ListingDoc,
} from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

type SearchTab = "all" | "posts" | "businesses" | "groups" | "listings";

type SearchResult =
  | { kind: "post"; data: PostDoc }
  | { kind: "business"; data: BusinessDoc }
  | { kind: "group"; data: GroupDoc }
  | { kind: "listing"; data: ListingDoc };

const QUICK_CATS = [
  { key: "posts", label: "Posts", icon: "file-text" },
  { key: "events", label: "Events", icon: "calendar" },
  { key: "market", label: "Market", icon: "shopping-bag" },
  { key: "businesses", label: "Businesses", icon: "briefcase" },
  { key: "groups", label: "Groups", icon: "users" },
  { key: "services", label: "Services", icon: "tool" },
] as const;

const TABS: { key: SearchTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "posts", label: "Posts" },
  { key: "businesses", label: "Businesses" },
  { key: "groups", label: "Groups" },
  { key: "listings", label: "Listings" },
];

export default function SearchScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const q = query.trim().toLowerCase();

  const loadAll = useCallback(async () => {
    if (!profile?.city) return;
    setLoading(true);
    try {
      const [posts, businesses, groups, listings] = await Promise.all([
        listPosts(profile.city),
        listBusinesses(profile.city),
        listGroups(profile.city),
        listListings(profile.city),
      ]);
      const merged: SearchResult[] = [
        ...posts.map((p) => ({ kind: "post" as const, data: p })),
        ...businesses.map((b) => ({ kind: "business" as const, data: b })),
        ...groups.map((g) => ({ kind: "group" as const, data: g })),
        ...listings.map((l) => ({ kind: "listing" as const, data: l })),
      ];
      setResults(merged);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [profile?.city]);

  const searchFiltered = useCallback(async (searchQuery: string) => {
    if (!profile?.city) return;
    setLoading(true);
    try {
      const [posts, businesses, groups, listings] = await Promise.all([
        listPosts(profile.city),
        listBusinesses(profile.city),
        listGroups(profile.city),
        listListings(profile.city),
      ]);

      const sq = searchQuery.toLowerCase();
      const filtered: SearchResult[] = [];

      for (const p of posts) {
        if (
          tab === "all" || tab === "posts"
        ) {
          if (
            !sq ||
            p.content.toLowerCase().includes(sq) ||
            p.authorName.toLowerCase().includes(sq)
          ) {
            filtered.push({ kind: "post", data: p });
          }
        }
      }
      for (const b of businesses) {
        if (tab === "all" || tab === "businesses") {
          if (
            !sq ||
            b.name.toLowerCase().includes(sq) ||
            b.category.toLowerCase().includes(sq)
          ) {
            filtered.push({ kind: "business", data: b });
          }
        }
      }
      for (const g of groups) {
        if (tab === "all" || tab === "groups") {
          if (!sq || g.name.toLowerCase().includes(sq)) {
            filtered.push({ kind: "group", data: g });
          }
        }
      }
      for (const l of listings) {
        if (tab === "all" || tab === "listings") {
          if (
            !sq ||
            l.title.toLowerCase().includes(sq) ||
            l.locality?.toLowerCase().includes(sq)
          ) {
            filtered.push({ kind: "listing", data: l });
          }
        }
      }
      setResults(filtered);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [profile?.city, tab]);

  useFocusEffect(
    useCallback(() => {
      if (q) {
        searchFiltered(q);
      } else {
        loadAll();
      }
    }, [q, tab])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (q) {
      await searchFiltered(q);
    } else {
      await loadAll();
    }
    setRefreshing(false);
  };

  const handleQuickCat = (key: string) => {
    if (key === "events") router.push("/events");
    else if (key === "market") router.push("/marketplace");
    else if (key === "services") router.push("/services");
    else {
      setTab(key as SearchTab);
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    switch (item.kind) {
      case "post":
        return (
          <Pressable style={styles.card} onPress={() => router.push("/chat-room")}>
            <View style={styles.cardHeader}>
              <View style={styles.typeDot} />
              <Text style={styles.cardTypeLabel}>Post</Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.data.content}</Text>
            <View style={styles.cardMeta}>
              <Feather name="user" size={12} color={colors.muted} />
              <Text style={styles.cardMetaText}>{item.data.authorName}</Text>
              {item.data.locality ? (
                <>
                  <Feather name="map-pin" size={12} color={colors.muted} />
                  <Text style={styles.cardMetaText}>{item.data.locality}</Text>
                </>
              ) : null}
            </View>
          </Pressable>
        );

      case "business":
        return (
          <Pressable style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeDot, { backgroundColor: colors.brand }]} />
              <Text style={styles.cardTypeLabel}>Business</Text>
              {item.data.verified && (
                <Feather name="check-circle" size={14} color={colors.brand} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.cardTitle}>{item.data.name}</Text>
            <Text style={styles.cardSub}>{item.data.category}</Text>
            <View style={styles.cardMeta}>
              <Feather name="star" size={12} color={colors.warning} />
              <Text style={styles.cardMetaText}>{item.data.rating.toFixed(1)}</Text>
              <Text style={styles.cardMetaText}>({item.data.reviewCount} reviews)</Text>
              {item.data.locality ? (
                <>
                  <Feather name="map-pin" size={12} color={colors.muted} />
                  <Text style={styles.cardMetaText}>{item.data.locality}</Text>
                </>
              ) : null}
            </View>
          </Pressable>
        );

      case "group":
        return (
          <Pressable style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeDot, { backgroundColor: colors.success }]} />
              <Text style={styles.cardTypeLabel}>Group</Text>
            </View>
            <Text style={styles.cardTitle}>{item.data.name}</Text>
            <View style={styles.cardMeta}>
              <Feather name="users" size={12} color={colors.muted} />
              <Text style={styles.cardMetaText}>{item.data.memberCount} members</Text>
              {item.data.locality ? (
                <>
                  <Feather name="map-pin" size={12} color={colors.muted} />
                  <Text style={styles.cardMetaText}>{item.data.locality}</Text>
                </>
              ) : null}
            </View>
          </Pressable>
        );

      case "listing":
        return (
          <Pressable style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.cardTypeLabel}>Listing</Text>
            </View>
            <Text style={styles.cardTitle}>{item.data.title}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.priceText}>₹{item.data.price.toLocaleString()}</Text>
              {item.data.locality ? (
                <>
                  <Feather name="map-pin" size={12} color={colors.muted} />
                  <Text style={styles.cardMetaText}>{item.data.locality}</Text>
                </>
              ) : null}
            </View>
          </Pressable>
        );
    }
  };

  const displayResults = tab === "all"
    ? results
    : results.filter((r) => r.kind === tab);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            placeholder="Search posts, businesses, groups…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); setTab("all"); }} hitSlop={8}>
              <Feather name="x-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {!q && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickCatsRow}
        >
          {QUICK_CATS.map((c) => (
            <Pressable
              key={c.key}
              testID={`quick-cat-${c.key}`}
              style={styles.quickChip}
              onPress={() => handleQuickCat(c.key)}
            >
              <Feather name={c.icon as any} size={15} color={colors.brand} />
              <Text style={styles.quickChipText}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            testID={`search-tab-${t.key}`}
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
          testID="search-results-list"
          data={displayResults}
          keyExtractor={(item) => `${item.kind}-${item.data.$id}`}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="search" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>
                {q ? "No results found" : "Start typing to search…"}
              </Text>
              <Text style={styles.emptyText}>
                {q ? `No results for "${query}"` : "Search posts, businesses, groups and more"}
              </Text>
            </View>
          }
          renderItem={renderResult}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  searchWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.onSurface, paddingVertical: spacing.xs },
  quickCatsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  quickChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill, backgroundColor: colors.brandTertiary,
    borderWidth: 1, borderColor: colors.brand, minWidth: 90, justifyContent: "center",
  },
  quickChipText: { fontSize: 13, fontWeight: "600", color: colors.brand },
  tabsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  tab: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary,
    borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  tabTextActive: { color: colors.onBrand },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: "center" },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs },
  typeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  cardTypeLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, textTransform: "uppercase" },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.onSurface, lineHeight: 20 },
  cardSub: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs },
  cardMetaText: { fontSize: 12, color: colors.muted },
  priceText: { fontSize: 14, fontWeight: "700", color: colors.brand },
});
