import { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth-context";
import { listChatsForUser } from "@/src/db";
import type { ChatDoc } from "@/src/db";

export default function Messages() {
  const router = useRouter();
  const { profile } = useAuth();
  const [chats, setChats] = useState<ChatDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.userId) {
      loadChats();
    }
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
      pathname: '/chat-room',
      params: { id: chat.$id }
    });
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return `${Math.floor(diffMinutes / 1440)}d`;
  };

  const renderChatItem = ({ item }: { item: ChatDoc }) => {
    const otherParticipantId = item.participantIds.find(id => id !== profile?.userId);
    const participantName = item.participantIds.length === 2 
      ? `Participant ${otherParticipantId?.substring(0, 8)}` 
      : 'Group Chat';
    
    return (
      <Pressable style={styles.chatRow} onPress={() => handleChatPress(item)}>
        <View style={styles.chatAvatar}>
          <Text style={styles.chatAvatarText}>{participantName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.chatName}>{participantName}</Text>
            <Text style={styles.chatTime}>{formatTime(item.updatedAt)}</Text>
          </View>
          <Text style={styles.chatLast} numberOfLines={1}>// Chat with {otherParticipantId?.substring(0, 8)}...</Text>
        </View>
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>0</Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        data={chats}
        keyExtractor={(c) => c.$id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-square" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>Start a conversation with other users.</Text>
          </View>
        }
        renderItem={renderChatItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: colors.muted },
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
