import { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

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

  useEffect(() => {
    if (profile?.userId) {
      loadChats();
    }
  }, [profile?.userId]);

  useEffect(() => {
    if (!profile?.userId) return;
    const unsubscribe = subscribeToChatUpdates(profile.userId, (updatedChat) => {
      setChats(prev => {
        const exists = prev.find(c => c.$id === updatedChat.$id);
        if (exists) {
          return prev.map(c => c.$id === updatedChat.$id ? updatedChat : c);
        }
        return [updatedChat, ...prev];
      });
    });
    return unsubscribe;
  }, [profile?.userId]);

  const loadChats = async () => {
    try {
      const userChats = await listChatsForUser(profile!.userId);
      setChats(userChats);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatPress = (chat: ChatDoc) => {
    const otherParticipantId = chat.participantIds.find(id => id !== profile?.userId);
    router.push({
      pathname: '/chat-room' as any,
      params: { id: chat.$id }
    });
  };

  const MOCK_CHATS = [
    { id: "1", name: "Sneha Kapoor", avatar: "https://images.unsplash.com/photo-1774755621822-39a460bcd2a5?auto=format&fit=crop&w=150&q=80", last: "Are we still on for the study group?", time: "2m", unread: 3, online: true },
    { id: "2", name: "Apartment 4B Neighbors", avatar: "https://images.unsplash.com/photo-1540553016722-983e48a2cd10?auto=format&fit=crop&w=150&q=80", last: "Someone left their package downstairs.", time: "1h", unread: 0, online: false, isGroup: true },
    { id: "3", name: "Ravi Teja", avatar: "https://images.unsplash.com/photo-1729395736788-37509a61fd49?auto=format&fit=crop&w=150&q=80", last: "Got the notes. Thanks! 🙏", time: "Yesterday", unread: 0, online: true },
    ];

  const filtered = MOCK_CHATS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const renderChatItem = ({ item }: { item: typeof MOCK_CHATS[0] }) => (
    <Pressable style={styles.chatRow} onPress={() => handleChatPress({ $id: item.id, participantIds: ["me", item.id], updatedAt: new Date().toISOString() } as ChatDoc)}>
      <View style={styles.chatAvatarWrap}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.chatAvatar} contentFit="cover" />
        ) : (
          <View style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>{item.name[0]}</Text>
          </View>
        )}
        {item.online && <View style={styles.onlineDot} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.chatName}>{item.name}</Text>
          {item.isGroup && <View style={styles.groupBadge}><Text style={styles.groupText}>GROUP</Text></View>}
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Text style={[styles.chatLast, item.unread > 0 && { color: colors.onSurface, fontWeight: "700" }]} numberOfLines={1}>
            {item.last}
          </Text>
        </View>
      </View>
      {item.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread}</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>MESSAGES</Text>
        <Text style={styles.headerTitle}>Chats 💬</Text>
        <Pressable style={styles.newChatBtn}>
          <Feather name="plus" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={colors.muted} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search besties..."
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.center}><Text style={styles.loadingTxt}>Loading... 💬</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 120 }}
          renderItem={renderChatItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="message-square" size={44} color={colors.muted} />
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptyText}>Start a convo bestie ✨</Text>
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
  center: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md, marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: "600", textAlign: "center" },
  chatRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
  },
  chatAvatarWrap: { position: "relative" },
  chatAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandTertiary, borderWidth: 2, borderColor: "#000", overflow: "hidden" },
  chatAvatarText: { color: colors.brand, fontSize: 18, fontWeight: "900" },
  onlineDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "#66FF33",
    borderWidth: 2, borderColor: colors.surfaceSecondary,
  },
  groupBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: "#7C3AED",
    borderRadius: 6,
  },
  groupText: { fontSize: 9, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.5 },
  chatName: { fontSize: 15, fontWeight: "900", color: colors.onSurface },
  chatTime: { fontSize: 11, fontWeight: "700", color: colors.muted, marginLeft: "auto" },
  chatLast: { fontSize: 13, fontWeight: "600", color: colors.muted, flex: 1 },
  unreadBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#3366FF",
    borderWidth: 2, borderColor: "#000",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  unreadText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
});
