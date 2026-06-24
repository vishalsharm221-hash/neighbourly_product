import { useCallback, useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  host_name: string;
  rsvp_count: number;
  rsvped: boolean;
};

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listEvents();
      setEvents(data);
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

  const onRsvp = async (ev: Event) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setEvents((prev) =>
      prev.map((x) =>
        x.id === ev.id
          ? { ...x, rsvped: !x.rsvped, rsvp_count: x.rsvp_count + (x.rsvped ? -1 : 1) }
          : x
      )
    );
    try {
      await api.rsvp(ev.id);
    } catch {
      load();
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>WHAT'S HAPPENING</Text>
        <Text style={styles.title}>Local Events</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          testID="events-list"
          data={events}
          keyExtractor={(e) => e.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, gap: spacing.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="calendar" size={32} color={colors.muted} />
              <Text style={styles.emptyText}>No upcoming events nearby.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View testID={`event-${item.id}`} style={styles.card}>
              <View style={styles.dateBox}>
                <Text style={styles.dateMonth}>
                  {new Date(item.date).toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}
                </Text>
                <Text style={styles.dateDay}>{new Date(item.date).getDate()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.evTitle}>{item.title}</Text>
                <Text style={styles.evDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.evMetaRow}>
                  <Feather name="map-pin" size={12} color={colors.muted} />
                  <Text style={styles.evMeta} numberOfLines={1}>{item.location}</Text>
                </View>
                <View style={styles.evMetaRow}>
                  <Feather name="user" size={12} color={colors.muted} />
                  <Text style={styles.evMeta}>by {item.host_name} · {item.rsvp_count} going</Text>
                </View>
                <Pressable
                  testID={`rsvp-${item.id}`}
                  onPress={() => onRsvp(item)}
                  style={[styles.rsvpBtn, item.rsvped && styles.rsvpBtnActive]}
                >
                  <Feather
                    name={item.rsvped ? "check" : "plus"}
                    size={14}
                    color={item.rsvped ? colors.onBrand : colors.brand}
                  />
                  <Text style={[styles.rsvpText, item.rsvped && styles.rsvpTextActive]}>
                    {item.rsvped ? "Going" : "RSVP"}
                  </Text>
                </Pressable>
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
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBox: {
    width: 56,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  dateMonth: { fontSize: 10, fontWeight: "700", color: colors.brand, letterSpacing: 1 },
  dateDay: { fontSize: 22, fontWeight: "800", color: colors.brand },
  evTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  evDesc: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2, lineHeight: 18 },
  evMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  evMeta: { fontSize: 12, color: colors.muted, flex: 1 },
  rsvpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  rsvpBtnActive: { backgroundColor: colors.brand },
  rsvpText: { fontSize: 12, fontWeight: "700", color: colors.brand },
  rsvpTextActive: { color: colors.onBrand },
});
