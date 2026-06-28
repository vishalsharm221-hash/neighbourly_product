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
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/auth-context";
import {
  EventDoc,
  listEvents,
  fetchRsvpMap,
  rsvpEvent,
  unrsvpEvent,
  isFollowing,
  follow,
  unfollow,
} from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

export default function Events() {
  const router = useRouter();
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [rsvpMap, setRsvpMap] = useState<{ counts: Record<string, number>; mine: Record<string, string> }>({ counts: {}, mine: {} });
  const [followMap, setFollowMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.city) return;
    try {
      const data = await listEvents(profile.city);
      setEvents(data);
      if (profile.userId) {
        const map = await fetchRsvpMap(data.map((e) => e.$id), profile.userId);
        setRsvpMap(map);
      }
    } catch (e) {
      console.warn(e);
    }
  }, [profile?.city, profile?.userId]);

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

  const onRsvp = async (ev: EventDoc) => {
    if (!profile?.userId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const going = !!rsvpMap.mine[ev.$id];
    setRsvpMap((prev) => {
      const counts = { ...prev.counts };
      const mine = { ...prev.mine };
      if (going) {
        counts[ev.$id] = Math.max(0, (counts[ev.$id] || 1) - 1);
        delete mine[ev.$id];
      } else {
        counts[ev.$id] = (counts[ev.$id] || 0) + 1;
        mine[ev.$id] = "pending";
      }
      return { counts, mine };
    });
    try {
      if (going) {
        await unrsvpEvent(rsvpMap.mine[ev.$id]);
      } else {
        const doc = await rsvpEvent(ev.$id, profile.userId);
        setRsvpMap((prev) => ({ ...prev, mine: { ...prev.mine, [ev.$id]: doc.$id } }));
      }
    } catch {
      load();
    }
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

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>LOCAL HAPPENINGS</Text>
          <Text style={styles.title}>Local Events</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingTxt}>Loading events...</Text>
        </View>
      ) : (
        <FlatList
          testID="events-list"
          data={events}
          keyExtractor={(e) => e.$id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3366FF" />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="calendar" size={44} color={colors.muted} />
              <Text style={styles.emptyTitle}>No events near {profile?.locality}</Text>
              <Text style={styles.emptyText}>Your hood is quiet — host something!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const going = !!rsvpMap.mine[item.$id];
            const count = rsvpMap.counts[item.$id] || 0;
            const isSelf = profile?.userId === item.hostId;
            return (
              <View testID={`event-${item.$id}`} style={styles.card}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateMonth}>
                    {new Date(item.date).toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}
                  </Text>
                  <Text style={styles.dateDay}>{new Date(item.date).getDate()}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.evTitle}>{item.title}</Text>
                  <Text style={styles.evDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.evMetaRow}>
                    <Feather name="map-pin" size={11} color={colors.muted} />
                    <Text style={styles.evMeta} numberOfLines={1}>{item.location}</Text>
                  </View>
                  <View style={styles.evMetaRow}>
                    <Pressable
                      onPress={() => {
                        router.push({ pathname: "/user-profile" as any, params: { userId: item.hostId, name: item.hostName } });
                        ensureFollow(item.hostId);
                      }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}
                    >
                      <Feather name="user" size={11} color={colors.muted} />
                      <Text style={[styles.evMeta, { color: colors.brand, fontWeight: "700" }]} numberOfLines={1}>
                        by {item.hostName}
                      </Text>
                    </Pressable>
                    {!isSelf && (
                      <Pressable
                        onPress={() => toggleFollow(item.hostId)}
                        style={[styles.miniFollow, followMap[item.hostId] && styles.miniFollowActive]}
                      >
                        <Text style={[styles.miniFollowText, followMap[item.hostId] && styles.miniFollowTextActive]}>
                          {followMap[item.hostId] ? "✓" : "+"}
                        </Text>
                      </Pressable>
                    )}
                    <Text style={styles.evMeta}>· {count}</Text>
                  </View>
                  <Pressable
                    testID={`rsvp-${item.$id}`}
                    onPress={() => onRsvp(item)}
                    style={[styles.rsvpBtn, going && styles.rsvpBtnActive]}
                  >
                    <Feather name={going ? "check" : "plus"} size={14} color={going ? "#FFFFFF" : colors.brand} />
                    <Text style={[styles.rsvpText, going && styles.rsvpTextActive]}>
                      {going ? "Going" : "RSVP"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <Pressable
        testID="events-fab-create"
        onPress={() => router.push("/create-event")}
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
    flexDirection: "row", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  dateBox: {
    width: 56, height: 64, borderRadius: radius.md,
    backgroundColor: "#E6EFE9", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  dateMonth: { fontSize: 10, fontWeight: "800", color: colors.brand, letterSpacing: 1 },
  dateDay: { fontSize: 22, fontWeight: "900", color: colors.brand },
  evTitle: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  evDesc: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary, marginTop: 2, lineHeight: 18 },
  evMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  evMeta: { fontSize: 12, fontWeight: "700", color: colors.muted, flex: 1 },
  miniFollow: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.surfaceSecondary,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 1, height: 1 }, elevation: 1,
  },
  miniFollowActive: { backgroundColor: colors.brand },
  miniFollowText: { fontSize: 10, fontWeight: "800", color: colors.brand },
  miniFollowTextActive: { color: colors.onBrand },
  rsvpBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000", marginTop: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  rsvpBtnActive: { backgroundColor: colors.brand, borderColor: "#000" },
  rsvpText: { fontSize: 12, fontWeight: "800", color: colors.brand },
  rsvpTextActive: { color: colors.onBrand },
  fab: {
    position: "absolute", right: spacing.lg, bottom: 80,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 6,
    borderWidth: 2, borderColor: "#000",
  },
});
