import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth-context";
import { listChatsForUser, subscribeToChatUpdates } from "@/src/db";
import type { ChatDoc } from "@/src/db";

export default function Messages() {
  const router = useRouter();
  const { profile } = useAuth();
  const [chats, setChats] = useState<ChatDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadChats = useCallback(async () => {
    if (!profile?.userId) return;
    try {
      const userChats = await listChatsForUser(profile.userId);
      setChats(userChats);
    } catch (error) {
      console.error("Failed to load chats:", error);
    } finally {
      setLoading(false);
    }
  }, [profile?.userId]);

  useEffect(() => {
    if (profile?.userId) {
      loadChats();
    } else {
      setLoading(false);
    }
  }, [loadChats, profile?.userId]);

  useEffect(() => {
    if (!profile?.userId) return;
    const unsubscribe = subscribeToChatUpdates(profile.userId, (updatedChat) => {
      setChats((prev) => {
        const exists = prev.some((c) => c.$id === updatedChat.$id);
        if (exists) return prev.map((c) => (c.$id === updatedChat.$id ? updatedChat : c));
        return [updatedChat, ...prev];
      });
    });
    return unsubscribe;
  }, [profile?.userId]);

  const getChatName = (chat: ChatDoc) => {
    const otherId = chat.participantIds.find((id) => id !== profile?.userId) || chat.participantIds[0];
    return chat.participantNames?.[otherId] || "Neighbor";
  };

  const formatChatTime = (iso?: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return "now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filtered = chats.filter((chat) => getChatName(chat).toLowerCase().includes(search.trim().toLowerCase()));

  const renderChatItem = ({ item }: { item: ChatDoc }) => {
    const name = getChatName(item);
    const initial = name.trim()[0]?.toUpperCase() || "?";

    return (
      <Pressable
        style={styles.chatRow}
        onPress={() => router.push({ pathname: "/chat-room" as any, params: { id: item.$id } })}
      >
        <View style={styles.chatAvatar}>
          <Text style={styles.chatAvatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName} numberOfLines={1}>{name}</Text>
            <Text style={styles.chatTime}>{formatChatTime(item.updatedAt || item.$createdAt)}</Text>
          </View>
          <Text style={styles.chatLast} numberOfLines={1}>Tap to open the conversation</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>MESSAGES</Text>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <Pressable style={styles.newChatBtn} onPress={() => router.push("/search" as any)}>
          <Feather name="edit-3" size={17} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={colors.muted} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search chats"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.center}><Text style={styles.loadingTxt}>Loading chats...</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.$id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 120, flexGrow: 1 }}
          renderItem={renderChatItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="message-square" size={44} color={colors.muted} />
              <Text style={styles.emptyTitle}>{search.trim() ? "No matching chats" : "No chats yet"}</Text>
              <Text style={styles.emptyText}>
                {search.trim() ? "Try a different name." : "Start a conversation from someone's profile."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    backgroundColor: "#FF3366",
    borderBottomWidth: 3, borderBottomColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  headerEyebrow: { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.8)", letterSpacing: 1.2 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", marginTop: 2 },
  newChatBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 2, borderColor: "#000",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm,
    backgroundColor: "#F3F3F5",
    borderWidth: 2, borderColor: "#000",
    borderRadius: radius.md,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  searchIcon: { marginLeft: spacing.lg },
  searchInput: { flex: 1, paddingVertical: 12, paddingRight: spacing.lg, fontSize: 14, fontWeight: "600", color: colors.onSurface },
  loadingTxt: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: "600", textAlign: "center", lineHeight: 19 },
  chatRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 }, elevation: 3,
  },
  chatAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.brandTertiary,
    borderWidth: 2, borderColor: "#000",
    alignItems: "center", justifyContent: "center",
  },
  chatAvatarText: { color: colors.brand, fontSize: 18, fontWeight: "900" },
  chatTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chatName: { flex: 1, fontSize: 15, fontWeight: "900", color: colors.onSurface },
  chatTime: { fontSize: 11, fontWeight: "700", color: colors.muted },
  chatLast: { fontSize: 13, fontWeight: "600", color: colors.muted, marginTop: 2 },
});
