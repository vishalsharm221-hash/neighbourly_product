import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth-context";
import { colors, spacing } from "@/src/theme";
import { databases, DB, COL } from "@/src/appwrite";
import { getChatByParticipants, sendMessage, listMessages } from "@/src/db";
import type { AppwriteDoc, ChatDoc, MessageDoc } from "@/src/db";

interface Message extends MessageDoc {
  localId?: string; // For optimistic UI
  sending?: boolean; // For optimistic UI
}

export default function ChatRoom() {
  const { id: chatIdParam } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  
  const [chat, setChat] = useState<ChatDoc | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  const otherParticipantId = chat?.participantIds.find(id => id !== profile?.userId);
  const otherParticipantName = chat?.participantNames?.[otherParticipantId || ''] || 'Chat';

  useEffect(() => {
    if (chatIdParam) {
      loadChat(chatIdParam as string);
    }
  }, [chatIdParam]);

  useEffect(() => {
    if (chat?.$id) {
      loadMessages(chat.$id);
    }
  }, [chat?.$id]);

  const loadChat = async (id: string) => {
    try {
      // Try to get chat by ID first (from navigation params)
      if (id) {
        const res = await databases.getDocument<AppwriteDoc<ChatDoc>>({
          databaseId: DB,
          collectionId: COL.chats,
          documentId: id,
        });
        setChat(res);
      } else {
        // Fallback to finding by participant IDs if ID not provided
        const chatData = await getChatByParticipants(
          otherParticipantId || '',
          profile?.userId || ''
        );
        if (chatData) {
          setChat(chatData);
        } else {
          setError('Chat not found');
        }
      }
    } catch {
      setError('Failed to load chat');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const messagesData = await listMessages(chatId);
      setMessages(messagesData);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chat || !profile?.userId || !otherParticipantId) return;

    const tempId = Date.now().toString();
    const optimisticMessage: Message = {
      $id: tempId,
      $createdAt: new Date().toISOString(),
      chatId: chat.$id,
      senderId: profile.userId,
      receiverId: otherParticipantId,
      content: newMessage,
      localId: tempId,
      sending: true,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      const sentMessage = await sendMessage(
        chat.$id,
        profile.userId,
        otherParticipantId,
        newMessage
      );
      
      setMessages(prev => prev.map(msg =>
        msg.localId === tempId
          ? { ...msg, $id: sentMessage.$id, localId: undefined, sending: false }
          : msg
      ));
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.map(msg =>
        msg.localId === tempId
          ? { ...msg, sending: false }
          : msg
      ));
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === profile?.userId;
    
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
        marginBottom: 4,
      }}>
        {isMyMessage ? (
          <LinearGradient
            colors={["#FF3366", "#3366FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: 20,
              borderBottomRightRadius: 4,
              maxWidth: '80%',
              borderWidth: 2,
              borderColor: "#000",
            }}
          >
            <Text style={{ fontSize: 14, color: "#FFFFFF", lineHeight: 20, fontWeight: "600" }}>{item.content}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 }}>
              <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>{formatTime(item.$createdAt)}</Text>
              <Feather name={item.sending ? 'clock' : 'check'} size={12} color="rgba(255,255,255,0.7)" />
            </View>
          </LinearGradient>
        ) : (
          <View style={{
            backgroundColor: "#FFFFFF",
            padding: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: 20,
            borderBottomLeftRadius: 4,
            maxWidth: '80%',
            borderWidth: 2,
            borderColor: "#000",
            shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
          }}>
            <Text style={{ fontSize: 14, color: "#000", lineHeight: 20, fontWeight: "600" }}>{item.content}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
              <Text style={{ fontSize: 10, color: "#000", fontWeight: "600" }}>{formatTime(item.$createdAt)}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <Text>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !chat) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Chat not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherParticipantName}</Text>
          <Text style={styles.headerStatus}>Conversation</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.$id || item.localId || item.senderId + item.$createdAt}
        contentContainerStyle={styles.messagesList}
        renderItem={renderMessageItem}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message"
            multiline
            maxLength={1000}
          />
          <Pressable 
            style={styles.sendButton} 
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Feather name="send" size={20} color={colors.onBrand} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFBF9" },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorTitle: { fontSize: 16, fontWeight: '800', color: "#000", marginVertical: spacing.md },
  backButton: { backgroundColor: "#3366FF", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 16, marginTop: spacing.md, borderWidth: 3, borderColor: "#000", shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4 },
  backButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 3, borderBottomColor: "#000", backgroundColor: "rgba(255,255,255,0.92)", shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  headerInfo: { flex: 1, marginLeft: spacing.md },
  headerName: { fontSize: 16, fontWeight: "900", color: "#000", letterSpacing: 0 },
  headerStatus: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: "700" },
  messagesList: { padding: spacing.lg, gap: spacing.sm },
  inputContainer: { borderTopWidth: 3, borderTopColor: "#000", backgroundColor: "#FBFBF9" },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, gap: spacing.sm },
  textInput: { flex: 1, backgroundColor: "#F3F3F5", borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, maxHeight: 100, textAlignVertical: 'top', borderWidth: 2, borderColor: "#000", color: "#000" },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#3366FF", alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: "#000", shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4 },
});
