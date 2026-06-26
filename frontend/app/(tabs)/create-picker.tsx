import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, radius } from "@/src/theme";

type Action = { key: string; label: string; icon: string; route: string };

const ACTIONS: Action[] = [
  { key: "post", label: "Post", icon: "file-text", route: "/create-post" },
  { key: "event", label: "Event", icon: "calendar", route: "/create-event" },
  { key: "listing", label: "Listing", icon: "home", route: "/create-listing" },
  { key: "recommendation", label: "Recommendation", icon: "star", route: "/create-recommendation" },
  { key: "poll", label: "Poll", icon: "bar-chart-2", route: "/create-poll" },
  { key: "service", label: "Service", icon: "tool", route: "/create-service" },
];

export default function CreatePicker() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CREATE</Text>
        <Text style={styles.title}>What would you like to create?</Text>
      </View>

      <FlatList
        data={ACTIONS}
        keyExtractor={(a) => a.key}
        numColumns={3}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.lg }}
        renderItem={({ item }) => (
          <Pressable
            testID={`create-${item.key}`}
            style={styles.actionCard}
            onPress={() => router.push(item.route)}
          >
            <View style={styles.iconWrap}>
              <Feather name={item.icon as any} size={26} color={colors.brand} />
            </View>
            <Text style={styles.actionLabel}>{item.label}</Text>
          </Pressable>
        )}
      />
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
  title: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  actionCard: {
    flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, alignItems: "center", padding: spacing.lg, gap: spacing.md, minHeight: 120,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  actionLabel: { fontSize: 13, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
});
