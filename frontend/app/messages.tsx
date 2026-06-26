import { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

type ChatPreview = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
};

const MOCK_CHATS: ChatPreview[] = [
  { id: "1", name: "Priya Sharma", lastMessage: "Hey! Are you going to the event tomorrow?", time: "2m", unread: 2 },
  { id: "2", name: "Rahul Verma", lastMessage: "Thanks for the recommendation!", time: "1h", unread: 0 },
  { id: "3", name: "Ananya Gupta", lastMessage: "Is the market stall still open?", time: "3h", unread: 1 },
];

export default function Messages() {
  const router = useRouter();
  const { profile } = useAuth();

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Messages</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={MOCK_CHATS}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-square" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>Start a conversation with your neighbours.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.chatRow}>
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarText}>{item.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatTime}>{item.time}</Text>
              </View>
              <Text style={styles.chatLast} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            {item.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            )}
          </Pressable>
        )}
      />
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
  title: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  empty: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: "center" },
  chatRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  chatAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  chatAvatarText: { color: colors.brand, fontSize: 18, fontWeight: "700" },
  chatName: { fontSize: 15, fontWeight: "600", color: colors.onSurface },
  chatTime: { fontSize: 12, color: colors.muted },
  chatLast: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  unreadText: { color: colors.onBrand, fontSize: 11, fontWeight: "700" },
});
