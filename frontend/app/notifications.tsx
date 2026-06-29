import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/src/db";
import type { NotificationDoc } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function iconFor(type: string) {
  const t = type.toLowerCase();
  if (t.includes("safety")) return "shield";
  if (t.includes("message") || t.includes("chat")) return "message-square";
  if (t.includes("event")) return "calendar";
  if (t.includes("follow")) return "user-plus";
  if (t.includes("market")) return "shopping-bag";
  return "bell";
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.userId) {
      setLoading(false);
      return;
    }
    try {
      const data = await listNotifications(profile.userId);
      setItems(data);
    } catch (e) {
      console.warn("Failed to load notifications", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.userId]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!profile?.userId || unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead(profile.userId);
    } catch {
      load();
    }
  };

  const openNotification = async (item: NotificationDoc) => {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.$id === item.$id ? { ...n, read: true } : n)));
      try {
        await markNotificationRead(item.$id);
      } catch {}
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>UPDATES</Text>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <Pressable onPress={markAllRead} disabled={unread === 0} style={[styles.markBtn, unread === 0 && styles.markBtnDisabled]}>
          <Feather name="check" size={16} color={unread === 0 ? colors.muted : colors.onBrand} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.$id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 120, flexGrow: 1 }}
          ListHeaderComponent={
            unread > 0 ? (
              <View style={styles.summary}>
                <Text style={styles.summaryText}>{unread} unread update{unread === 1 ? "" : "s"}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bell" size={44} color={colors.muted} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>Likes, replies, alerts, and local updates will show up here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={[styles.row, !item.read && styles.rowUnread]} onPress={() => openNotification(item)}>
              <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
                <Feather name={iconFor(item.type) as any} size={19} color={!item.read ? colors.onBrand : colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.time}>{timeAgo(item.createdAt || item.$createdAt)}</Text>
                </View>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000", backgroundColor: "rgba(255,255,255,0.94)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  eyebrow: { fontSize: 10, fontWeight: "800", color: colors.brand, letterSpacing: 1.2 },
  title: { fontSize: 22, fontWeight: "900", color: colors.onSurface },
  markBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary,
    borderWidth: 2, borderColor: "#000", alignItems: "center", justifyContent: "center",
  },
  markBtnDisabled: { backgroundColor: colors.surfaceTertiary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  summary: {
    padding: spacing.md, backgroundColor: colors.brandTertiary,
    borderWidth: 2, borderColor: "#000", borderRadius: radius.md,
  },
  summaryText: { fontSize: 13, fontWeight: "800", color: colors.onSurface },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md, borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 }, elevation: 3,
  },
  rowUnread: { backgroundColor: "#FFF6F9" },
  iconWrap: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandTertiary,
    borderWidth: 2, borderColor: "#000", alignItems: "center", justifyContent: "center",
  },
  iconWrapUnread: { backgroundColor: colors.brand },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: "900", color: colors.onSurface },
  time: { fontSize: 11, fontWeight: "700", color: colors.muted },
  body: { marginTop: 3, fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary, lineHeight: 18 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brandSecondary, borderWidth: 1, borderColor: "#000" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: colors.onSurface, textAlign: "center" },
  emptyText: { fontSize: 13, fontWeight: "600", color: colors.muted, textAlign: "center", lineHeight: 19 },
});
