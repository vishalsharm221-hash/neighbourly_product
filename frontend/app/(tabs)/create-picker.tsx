import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, radius } from "@/src/theme";

type Action = { key: string; label: string; icon: string; route: string; tileColor: string; tileBg: string };

const ACTIONS: Action[] = [
  { key: "post", label: "Post", icon: "file-text", route: "/create-post", tileColor: "#FF3366", tileBg: "#FFE0EC" },
  { key: "event", label: "Event", icon: "calendar", route: "/create-event", tileColor: "#B58500", tileBg: "#FFF4D9" },
  { key: "listing", label: "Listing", icon: "home", route: "/create-listing", tileColor: "#2E5C3B", tileBg: "#E6EFE9" },
  { key: "recommendation", label: "Reco", icon: "star", route: "/create-recommendation", tileColor: "#437A53", tileBg: "#E0F0E4" },
  { key: "poll", label: "Poll", icon: "bar-chart-2", route: "/create-poll", tileColor: "#3366FF", tileBg: "#D9E5FF" },
  { key: "service", label: "Service", icon: "tool", route: "/create-service", tileColor: "#FF6B35", tileBg: "#FFE8D9" },
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
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.tileBg }]}>
              <Feather name={item.icon as any} size={28} color={item.tileColor} />
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
    borderBottomWidth: 3, borderBottomColor: "#000",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  eyebrow: { fontSize: 10, fontWeight: "800", color: colors.brand, letterSpacing: 1.2 },
  title: { fontSize: 20, fontWeight: "900", color: colors.onSurface, marginTop: 2, letterSpacing: -0.5 },
  actionCard: {
    flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    alignItems: "center", padding: spacing.lg, gap: spacing.md, minHeight: 120,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
  },
  actionLabel: { fontSize: 13, fontWeight: "900", color: colors.onSurface, textAlign: "center" },
});
