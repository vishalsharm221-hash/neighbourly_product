import type { Models } from "react-native-appwrite";
import {
  databases,
  storage,
  realtime,
  ID,
  Permission,
  Role,
  Query,
  DB,
  COL,
  BUCKET,
} from "@/src/appwrite";

type AppwriteDoc<T> = Models.Document & T;

// ---------- Profile ----------
export type Profile = {
  $id: string;
  userId: string;
  name: string;
  email: string;
  handle?: string;
  city: string | null;
  locality: string | null;
  userType?: "resident" | "student" | null;
  college?: string | null;
  gender?: string | null;
  dob?: string | null;
  bio?: string | null;
  avatarFileId?: string | null;
  verified: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
};

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const res = await databases.listDocuments<AppwriteDoc<Profile>>({
    databaseId: DB,
    collectionId: COL.profiles,
    queries: [Query.equal("userId", userId), Query.limit(1)],
  });
  return res.documents[0] || null;
}

export async function createProfile(userId: string, email: string, name = ""): Promise<Profile> {
  return await databases.createDocument<AppwriteDoc<Profile>>({
    databaseId: DB,
    collectionId: COL.profiles,
    documentId: ID.unique(),
    data: {
      userId, email, name,
      city: null, locality: null, verified: false,
      followerCount: 0, followingCount: 0, postCount: 0,
    },
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ],
  });
}

export async function updateProfile(docId: string, patch: Partial<Profile>) {
  return await databases.updateDocument<AppwriteDoc<Profile>>({
    databaseId: DB,
    collectionId: COL.profiles,
    documentId: docId,
    data: patch,
  });
}

// ---------- Posts ----------
export type PostDoc = {
  $id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  authorLocality?: string;
  authorVerified?: boolean;
  category: string;
  content: string;
  city: string;
  locality?: string;
  imageFileId?: string | null;
  $createdAt: string;
};

export async function listPosts(city: string, category?: string, college?: string | null): Promise<PostDoc[]> {
  const queries = [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)];
  if (category && category !== "all") queries.push(Query.equal("category", category));
  if (college) queries.push(Query.equal("college", college));
  const res = await databases.listDocuments<AppwriteDoc<PostDoc>>({ databaseId: DB, collectionId: COL.posts, queries });
  return res.documents;
}

export async function listPostsByAuthor(authorId: string): Promise<PostDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<PostDoc>>({
    databaseId: DB,
    collectionId: COL.posts,
    queries: [Query.equal("authorId", authorId), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.documents;
}

export async function createPost(data: {
  authorId: string; authorName: string; authorAvatar?: string | null; authorLocality?: string; authorVerified?: boolean;
  category: string; content: string; city: string; locality?: string;
  audience?: "all" | "college" | "locality"; college?: string | null;
  imageFileId?: string | null;
}, profileDocId?: string) {
  const post = await databases.createDocument<AppwriteDoc<PostDoc>>({
    databaseId: DB, collectionId: COL.posts, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.authorId)),
      Permission.delete(Role.user(data.authorId)),
    ],
  });
  if (profileDocId) {
    try {
      const me = await databases.getDocument<AppwriteDoc<Profile>>({
        databaseId: DB, collectionId: COL.profiles, documentId: profileDocId,
      });
      await databases.updateDocument<AppwriteDoc<Profile>>({
        databaseId: DB, collectionId: COL.profiles, documentId: profileDocId,
        data: { postCount: (me.postCount || 0) + 1 },
      });
    } catch {
      console.warn("Failed to increment postCount");
    }
  }
  return post;
}

// ---------- Likes ----------
type LikeDoc = { $id: string; postId: string; userId: string };

export async function fetchLikeMap(postIds: string[], myUserId: string): Promise<{ counts: Record<string, number>; mine: Record<string, string> }> {
  if (postIds.length === 0) return { counts: {}, mine: {} };
  const res = await databases.listDocuments<AppwriteDoc<LikeDoc>>({
    databaseId: DB, collectionId: COL.likes,
    queries: [Query.equal("postId", postIds), Query.limit(1000)],
  });
  const counts: Record<string, number> = {};
  const mine: Record<string, string> = {};
  for (const d of res.documents) {
    counts[d.postId] = (counts[d.postId] || 0) + 1;
    if (d.userId === myUserId) mine[d.postId] = d.$id;
  }
  return { counts, mine };
}

export async function likePost(postId: string, userId: string) {
  return await databases.createDocument<AppwriteDoc<LikeDoc>>({
    databaseId: DB, collectionId: COL.likes, documentId: ID.unique(),
    data: { postId, userId },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(userId))],
  });
}

export async function unlikePost(likeDocId: string) {
  await databases.deleteDocument({ databaseId: DB, collectionId: COL.likes, documentId: likeDocId });
}

// ---------- Events ----------
export type EventDoc = {
  $id: string; hostId: string; hostName: string;
  title: string; description: string; date: string; location: string;
  city: string; locality?: string; imageFileId?: string | null; $createdAt: string;
};

export async function listEvents(city: string): Promise<EventDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<EventDoc>>({
    databaseId: DB, collectionId: COL.events,
    queries: [Query.equal("city", city), Query.orderAsc("date"), Query.limit(50)],
  });
  return res.documents;
}

export async function createEvent(data: Omit<EventDoc, "$id" | "$createdAt">) {
  return await databases.createDocument<AppwriteDoc<EventDoc>>({
    databaseId: DB, collectionId: COL.events, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.hostId)),
      Permission.delete(Role.user(data.hostId)),
    ],
  });
}

type RsvpDoc = { $id: string; eventId: string; userId: string };

export async function fetchRsvpMap(eventIds: string[], myUserId: string): Promise<{ counts: Record<string, number>; mine: Record<string, string> }> {
  if (eventIds.length === 0) return { counts: {}, mine: {} };
  const res = await databases.listDocuments<AppwriteDoc<RsvpDoc>>({
    databaseId: DB, collectionId: COL.rsvps,
    queries: [Query.equal("eventId", eventIds), Query.limit(1000)],
  });
  const counts: Record<string, number> = {};
  const mine: Record<string, string> = {};
  for (const d of res.documents) {
    counts[d.eventId] = (counts[d.eventId] || 0) + 1;
    if (d.userId === myUserId) mine[d.eventId] = d.$id;
  }
  return { counts, mine };
}

export async function rsvpEvent(eventId: string, userId: string) {
  return await databases.createDocument<AppwriteDoc<RsvpDoc>>({
    databaseId: DB, collectionId: COL.rsvps, documentId: ID.unique(),
    data: { eventId, userId },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(userId))],
  });
}

export async function unrsvpEvent(rsvpDocId: string) {
  await databases.deleteDocument({ databaseId: DB, collectionId: COL.rsvps, documentId: rsvpDocId });
}

// ---------- Marketplace ----------
export type MarketDoc = {
  $id: string; sellerId: string; sellerName: string; sellerLocality?: string;
  title: string; description: string; price: number;
  city: string; locality?: string; imageFileId?: string | null; $createdAt: string;
};

export async function listMarket(city: string): Promise<MarketDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<MarketDoc>>({
    databaseId: DB, collectionId: COL.market,
    queries: [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.documents;
}

export async function createMarket(data: Omit<MarketDoc, "$id" | "$createdAt">) {
  return await databases.createDocument<AppwriteDoc<MarketDoc>>({
    databaseId: DB, collectionId: COL.market, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.sellerId)),
      Permission.delete(Role.user(data.sellerId)),
    ],
  });
}

// ---------- Follow ----------
const FOLLOWS = "follows";
type FollowDoc = { $id: string; followerId: string; followedId: string };

export async function isFollowing(followerId: string, followedId: string): Promise<string | null> {
  const res = await databases.listDocuments<AppwriteDoc<FollowDoc>>({
    databaseId: DB, collectionId: FOLLOWS,
    queries: [Query.equal("followerId", followerId), Query.equal("followedId", followedId), Query.limit(1)],
  });
  return res.documents[0]?.$id || null;
}

export async function follow(followerId: string, followedId: string, followerProfileId: string, _followedProfileId: string) {
  const doc = await databases.createDocument<AppwriteDoc<FollowDoc>>({
    databaseId: DB, collectionId: FOLLOWS, documentId: ID.unique(),
    data: { followerId, followedId },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(followerId))],
  });
  try {
    const me = await databases.getDocument<AppwriteDoc<Profile>>({
      databaseId: DB, collectionId: COL.profiles, documentId: followerProfileId,
    });
    await databases.updateDocument<AppwriteDoc<Profile>>({
      databaseId: DB, collectionId: COL.profiles, documentId: followerProfileId,
      data: { followingCount: (me.followingCount || 0) + 1 },
    });
  } catch {
    console.warn("Failed to increment followingCount");
  }
  return doc;
}

export async function unfollow(followDocId: string, followerProfileId: string) {
  await databases.deleteDocument({ databaseId: DB, collectionId: FOLLOWS, documentId: followDocId });
  try {
    const me = await databases.getDocument<AppwriteDoc<Profile>>({
      databaseId: DB, collectionId: COL.profiles, documentId: followerProfileId,
    });
    await databases.updateDocument<AppwriteDoc<Profile>>({
      databaseId: DB, collectionId: COL.profiles, documentId: followerProfileId,
      data: { followingCount: Math.max(0, (me.followingCount || 0) - 1) },
    });
  } catch {
    console.warn("Failed to decrement followingCount");
  }
}

// ---------- Chat & Messages ----------
export type ChatDoc = {
  $id: string;
  participantIds: string[]; // array of two userIds
  participantNames?: Record<string, string>; // name lookup
  $createdAt: string;
  updatedAt: string;
};

export type MessageDoc = {
  $id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  content: string;
  $createdAt: string;
};

export async function getChatByParticipants(userId1: string, userId2: string): Promise<ChatDoc | null> {
  const res = await databases.listDocuments<AppwriteDoc<ChatDoc>>({
    databaseId: DB,
    collectionId: COL.chats,
    queries: [
      Query.limit(100),
    ],
  });
  
  // Find chat with both participants (order doesn't matter)
  for (const chat of res.documents) {
    if (
      chat.participantIds.includes(userId1) && 
      chat.participantIds.includes(userId2) &&
      chat.participantIds.length === 2
    ) {
      return chat;
    }
  }
  return null;
}

export async function createChat(participantIds: string[]): Promise<ChatDoc> {
  return await databases.createDocument<AppwriteDoc<ChatDoc>>({
    databaseId: DB,
    collectionId: COL.chats,
    documentId: ID.unique(),
    data: {
      participantIds,
      $createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    permissions: [Permission.read(Role.users())],
  });
}

export async function listChatsForUser(userId: string): Promise<ChatDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<ChatDoc>>({
    databaseId: DB,
    collectionId: COL.chats,
    queries: [
      Query.equal("participantIds", [userId]),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ],
  });
  return res.documents;
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  receiverId: string,
  content: string
): Promise<MessageDoc> {
  const message = await databases.createDocument<AppwriteDoc<MessageDoc>>({
    databaseId: DB,
    collectionId: COL.messages,
    documentId: ID.unique(),
    data: { chatId, senderId, receiverId, content, $createdAt: new Date().toISOString() },
    permissions: [Permission.read(Role.users())],
  });
  // Update chat's lastMessage
  await databases.updateDocument<AppwriteDoc<ChatDoc>>({
    databaseId: DB,
    collectionId: COL.chats,
    documentId: chatId,
    data: { updatedAt: new Date().toISOString() },
  });
  return message;
}

export async function listMessages(chatId: string): Promise<MessageDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<MessageDoc>>({
    databaseId: DB,
    collectionId: COL.messages,
    queries: [Query.equal("chatId", chatId), Query.orderAsc("$createdAt"), Query.limit(100)],
  });
  return res.documents;
}

export async function createConversation(userId1: string, userId2: string): Promise<ChatDoc> {
  const chat = await createChat([userId1, userId2]);
  return chat;
}

export async function getMessagesByChatId(chatId: string): Promise<MessageDoc[]> {
  return await listMessages(chatId);
}

export async function getConversationMessages(chatId: string): Promise<MessageDoc[]> {
  return await listMessages(chatId);
}

export async function markConversationAsRead(chatId: string, userId: string) {
  // Optional: track read status
  console.log('markConversationAsRead not yet implemented');
}

// Real-time subscriptions
export function subscribeToMessages(userId: string, onMessage: (message: MessageDoc) => void) {
  try {
    const channel = realtime.subscribe(
      `databases.${DB}.collections.${COL.messages}.documents`,
      (payload: any) => {
        if (payload.events.includes(`databases.${DB}.collections.${COL.messages}.documents.*.create`)) {
          const msg = payload.payload as MessageDoc;
          if (msg.receiverId === userId || msg.senderId === userId) {
            onMessage(msg);
          }
        }
      }
    );
    return () => {
      try { channel.unsubscribe(); } catch {}
    };
  } catch (error) {
    console.error('Failed to subscribe to messages', error);
    return () => {};
  }
}

export function subscribeToChatUpdates(userId: string, onUpdate: (chat: ChatDoc) => void) {
  try {
    const channel = realtime.subscribe(
      `databases.${DB}.collections.${COL.chats}.documents`,
      (payload: any) => {
        if (payload.events.includes(`databases.${DB}.collections.${COL.chats}.documents.*.update`)) {
          const chat = payload.payload as ChatDoc;
          if (chat.participantIds.includes(userId)) {
            onUpdate(chat);
          }
        }
      }
    );
    return () => {
      try { channel.unsubscribe(); } catch {}
    };
  } catch (error) {
    console.error('Failed to subscribe to chat updates', error);
    return () => {};
  }
}
export async function uploadImage(uri: string, name: string, mime: string, size: number, userId: string) {
  const file = await storage.createFile({
    bucketId: BUCKET, fileId: ID.unique(),
    file: { uri, name, type: mime, size },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(userId))],
  });
  return file.$id;
}

export function imagePreviewUrl(fileId: string): string {
  const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
  return `${endpoint}/storage/buckets/${BUCKET}/files/${fileId}/view?project=${project}`;
}

// ============================================================
// NEW FEATURES — Comments, Groups, Businesses, Reviews, etc.
// ============================================================

// ---------- Comments ----------
export type CommentDoc = {
  $id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  $createdAt: string;
};

export async function listComments(postId: string): Promise<CommentDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<CommentDoc>>({
    databaseId: DB, collectionId: COL.comments,
    queries: [Query.equal("postId", postId), Query.orderAsc("$createdAt"), Query.limit(50)],
  });
  return res.documents;
}

export async function createComment(postId: string, authorId: string, authorName: string, content: string): Promise<CommentDoc> {
  return await databases.createDocument<AppwriteDoc<CommentDoc>>({
    databaseId: DB, collectionId: COL.comments, documentId: ID.unique(),
    data: { postId, authorId, authorName, content, $createdAt: new Date().toISOString() },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(authorId))],
  });
}

export async function listEventComments(eventId: string): Promise<CommentDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<CommentDoc>>({
    databaseId: DB, collectionId: COL.comments,
    queries: [Query.equal("postId", eventId), Query.orderAsc("$createdAt"), Query.limit(50)],
  });
  return res.documents;
}

export async function createEventComment(eventId: string, authorId: string, authorName: string, content: string): Promise<CommentDoc> {
  return await databases.createDocument<AppwriteDoc<CommentDoc>>({
    databaseId: DB, collectionId: COL.comments, documentId: ID.unique(),
    data: { postId: eventId, authorId, authorName, content, $createdAt: new Date().toISOString() },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(authorId))],
  });
}

export async function listMarketComments(marketId: string): Promise<CommentDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<CommentDoc>>({
    databaseId: DB, collectionId: COL.comments,
    queries: [Query.equal("postId", marketId), Query.orderAsc("$createdAt"), Query.limit(50)],
  });
  return res.documents;
}

export async function createMarketComment(marketId: string, authorId: string, authorName: string, content: string): Promise<CommentDoc> {
  return await databases.createDocument<AppwriteDoc<CommentDoc>>({
    databaseId: DB, collectionId: COL.comments, documentId: ID.unique(),
    data: { postId: marketId, authorId, authorName, content, $createdAt: new Date().toISOString() },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(authorId))],
  });
}

// ---------- Groups ----------
export type GroupDoc = {
  $id: string;
  name: string;
  description?: string;
  city: string;
  locality?: string;
  college?: string;
  creatorId: string;
  creatorName: string;
  memberCount: number;
  isPublic: boolean;
  imageFileId?: string | null;
  $createdAt: string;
};

export async function listGroups(city: string, locality?: string, college?: string): Promise<GroupDoc[]> {
  const queries: any[] = [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)];
  if (locality) queries.push(Query.equal("locality", locality));
  if (college) queries.push(Query.equal("college", college));
  const res = await databases.listDocuments<AppwriteDoc<GroupDoc>>({
    databaseId: DB, collectionId: COL.groups, queries,
  });
  return res.documents;
}

export async function getGroupById(groupId: string): Promise<GroupDoc | null> {
  try {
    const doc = await databases.getDocument<AppwriteDoc<GroupDoc>>({
      databaseId: DB, collectionId: COL.groups, documentId: groupId,
    });
    return doc;
  } catch {
    return null;
  }
}

export async function createGroup(data: Omit<GroupDoc, "$id" | "$createdAt">): Promise<GroupDoc> {
  return await databases.createDocument<AppwriteDoc<GroupDoc>>({
    databaseId: DB, collectionId: COL.groups, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.creatorId)),
      Permission.delete(Role.user(data.creatorId)),
    ],
  });
}

export async function updateGroup(groupId: string, patch: Partial<GroupDoc>): Promise<GroupDoc> {
  return await databases.updateDocument<AppwriteDoc<GroupDoc>>({
    databaseId: DB, collectionId: COL.groups, documentId: groupId, data: patch,
  });
}

export async function deleteGroup(groupId: string): Promise<void> {
  await databases.deleteDocument({ databaseId: DB, collectionId: COL.groups, documentId: groupId });
}

export async function joinGroup(groupId: string, userId: string): Promise<void> {
  await databases.createDocument<AppwriteDoc<any>>({
    databaseId: DB, collectionId: COL.groups, documentId: ID.unique(),
    data: { groupId, userId, joinedAt: new Date().toISOString() },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(userId))],
  });
  // increment memberCount
  try {
    const group = await getGroupById(groupId);
    if (group) await updateGroup(groupId, { memberCount: (group.memberCount || 0) + 1 });
  } catch { /* ignore */ }
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const res = await databases.listDocuments<AppwriteDoc<any>>({
    databaseId: DB, collectionId: COL.groups,
    queries: [Query.equal("groupId", groupId), Query.equal("userId", userId), Query.limit(1)],
  });
  if (res.documents[0]) {
    await databases.deleteDocument({ databaseId: DB, collectionId: COL.groups, documentId: res.documents[0].$id });
    const group = await getGroupById(groupId);
    if (group) await updateGroup(groupId, { memberCount: Math.max(0, (group.memberCount || 0) - 1) });
  }
}

export type GroupPostDoc = {
  $id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  content: string;
  imageFileId?: string | null;
  $createdAt: string;
};

export async function createGroupPost(data: Omit<GroupPostDoc, "$id" | "$createdAt">): Promise<GroupPostDoc> {
  return await databases.createDocument<AppwriteDoc<GroupPostDoc>>({
    databaseId: DB, collectionId: COL.group_posts, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.authorId)),
      Permission.delete(Role.user(data.authorId)),
    ],
  });
}

export async function listGroupPosts(groupId: string): Promise<GroupPostDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<GroupPostDoc>>({
    databaseId: DB, collectionId: COL.group_posts,
    queries: [Query.equal("groupId", groupId), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.documents;
}

// ---------- Businesses ----------
export type BusinessDoc = {
  $id: string;
  ownerId: string;
  name: string;
  category: string;
  description?: string;
  address?: string;
  city: string;
  locality?: string;
  phone?: string;
  email?: string;
  website?: string;
  imageFileId?: string | null;
  verified: boolean;
  rating: number;
  reviewCount: number;
  $createdAt: string;
};

export async function listBusinesses(city: string, category?: string): Promise<BusinessDoc[]> {
  const queries: any[] = [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)];
  if (category) queries.push(Query.equal("category", category));
  const res = await databases.listDocuments<AppwriteDoc<BusinessDoc>>({
    databaseId: DB, collectionId: COL.businesses, queries,
  });
  return res.documents;
}

export async function getBusinessById(businessId: string): Promise<BusinessDoc | null> {
  try {
    const doc = await databases.getDocument<AppwriteDoc<BusinessDoc>>({
      databaseId: DB, collectionId: COL.businesses, documentId: businessId,
    });
    return doc;
  } catch {
    return null;
  }
}

export async function createBusiness(data: Omit<BusinessDoc, "$id" | "$createdAt">): Promise<BusinessDoc> {
  return await databases.createDocument<AppwriteDoc<BusinessDoc>>({
    databaseId: DB, collectionId: COL.businesses, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.ownerId)),
      Permission.delete(Role.user(data.ownerId)),
    ],
  });
}

export async function updateBusiness(businessId: string, patch: Partial<BusinessDoc>): Promise<BusinessDoc> {
  return await databases.updateDocument<AppwriteDoc<BusinessDoc>>({
    databaseId: DB, collectionId: COL.businesses, documentId: businessId, data: patch,
  });
}

export async function deleteBusiness(businessId: string): Promise<void> {
  await databases.deleteDocument({ databaseId: DB, collectionId: COL.businesses, documentId: businessId });
}

// ---------- Reviews ----------
export type ReviewDoc = {
  $id: string;
  businessId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  city: string;
  $createdAt: string;
};

export async function listReviews(businessId: string): Promise<ReviewDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<ReviewDoc>>({
    databaseId: DB, collectionId: COL.reviews,
    queries: [Query.equal("businessId", businessId), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.documents;
}

export async function createReview(data: Omit<ReviewDoc, "$id" | "$createdAt">): Promise<ReviewDoc> {
  return await databases.createDocument<AppwriteDoc<ReviewDoc>>({
    databaseId: DB, collectionId: COL.reviews, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.userId)),
      Permission.delete(Role.user(data.userId)),
    ],
  });
}

export async function getUserReviewForBusiness(userId: string, businessId: string): Promise<ReviewDoc | null> {
  const res = await databases.listDocuments<AppwriteDoc<ReviewDoc>>({
    databaseId: DB, collectionId: COL.reviews,
    queries: [Query.equal("userId", userId), Query.equal("businessId", businessId), Query.limit(1)],
  });
  return res.documents[0] || null;
}

// ---------- Recommendations ----------
export type RecommendationDoc = {
  $id: string;
  authorId: string;
  authorName: string;
  category: string;
  title: string;
  content: string;
  city: string;
  locality?: string;
  imageFileId?: string | null;
  likeCount: number;
  commentCount: number;
  $createdAt: string;
};

export async function listRecommendations(city: string, category?: string): Promise<RecommendationDoc[]> {
  const queries: any[] = [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)];
  if (category) queries.push(Query.equal("category", category));
  const res = await databases.listDocuments<AppwriteDoc<RecommendationDoc>>({
    databaseId: DB, collectionId: COL.recommendations, queries,
  });
  return res.documents;
}

export async function createRecommendation(data: Omit<RecommendationDoc, "$id" | "$createdAt">): Promise<RecommendationDoc> {
  return await databases.createDocument<AppwriteDoc<RecommendationDoc>>({
    databaseId: DB, collectionId: COL.recommendations, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.authorId)),
      Permission.delete(Role.user(data.authorId)),
    ],
  });
}

// ---------- Listings ----------
export type ListingDoc = {
  $id: string;
  hostId: string;
  hostName: string;
  type: string;
  title: string;
  description: string;
  price: number;
  address?: string;
  city: string;
  locality?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  imageFileId?: string | null;
  contactPhone?: string;
  contactEmail?: string;
  $createdAt: string;
};

export async function listListings(city: string, type?: string): Promise<ListingDoc[]> {
  const queries: any[] = [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)];
  if (type) queries.push(Query.equal("type", type));
  const res = await databases.listDocuments<AppwriteDoc<ListingDoc>>({
    databaseId: DB, collectionId: COL.listings, queries,
  });
  return res.documents;
}

export async function getListingById(listingId: string): Promise<ListingDoc | null> {
  try {
    const doc = await databases.getDocument<AppwriteDoc<ListingDoc>>({
      databaseId: DB, collectionId: COL.listings, documentId: listingId,
    });
    return doc;
  } catch {
    return null;
  }
}

export async function createListing(data: Omit<ListingDoc, "$id" | "$createdAt">): Promise<ListingDoc> {
  return await databases.createDocument<AppwriteDoc<ListingDoc>>({
    databaseId: DB, collectionId: COL.listings, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.hostId)),
      Permission.delete(Role.user(data.hostId)),
    ],
  });
}

export async function updateListing(listingId: string, patch: Partial<ListingDoc>): Promise<ListingDoc> {
  return await databases.updateDocument<AppwriteDoc<ListingDoc>>({
    databaseId: DB, collectionId: COL.listings, documentId: listingId, data: patch,
  });
}

// ---------- Saved Items ----------
export type SavedItemDoc = {
  $id: string;
  userId: string;
  itemType: string;
  itemId: string;
  $createdAt: string;
};

export async function listSavedItems(userId: string): Promise<SavedItemDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<SavedItemDoc>>({
    databaseId: DB, collectionId: COL.saved_items,
    queries: [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(100)],
  });
  return res.documents;
}

export async function saveItem(userId: string, itemType: string, itemId: string): Promise<SavedItemDoc> {
  return await databases.createDocument<AppwriteDoc<SavedItemDoc>>({
    databaseId: DB, collectionId: COL.saved_items, documentId: ID.unique(),
    data: { userId, itemType, itemId, $createdAt: new Date().toISOString() },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(userId))],
  });
}

export async function unsaveItem(userId: string, itemType: string, itemId: string): Promise<void> {
  const res = await databases.listDocuments<AppwriteDoc<SavedItemDoc>>({
    databaseId: DB, collectionId: COL.saved_items,
    queries: [Query.equal("userId", userId), Query.equal("itemType", itemType), Query.equal("itemId", itemId), Query.limit(1)],
  });
  if (res.documents[0]) {
    await databases.deleteDocument({ databaseId: DB, collectionId: COL.saved_items, documentId: res.documents[0].$id });
  }
}

export async function isItemSaved(userId: string, itemType: string, itemId: string): Promise<boolean> {
  const res = await databases.listDocuments<AppwriteDoc<SavedItemDoc>>({
    databaseId: DB, collectionId: COL.saved_items,
    queries: [Query.equal("userId", userId), Query.equal("itemType", itemType), Query.equal("itemId", itemId), Query.limit(1)],
  });
  return res.documents.length > 0;
}

export async function savePost(userId: string, postId: string): Promise<void> {
  await saveItem(userId, "post", postId);
}

export async function unsavePost(userId: string, postId: string): Promise<void> {
  await unsaveItem(userId, "post", postId);
}

export async function saveEvent(userId: string, eventId: string): Promise<void> {
  await saveItem(userId, "event", eventId);
}

export async function unsaveEvent(userId: string, eventId: string): Promise<void> {
  await unsaveItem(userId, "event", eventId);
}

export async function saveMarketItem(userId: string, marketId: string): Promise<void> {
  await saveItem(userId, "market", marketId);
}

export async function unsaveMarketItem(userId: string, marketId: string): Promise<void> {
  await unsaveItem(userId, "market", marketId);
}

// ---------- Reports ----------
export type ReportDoc = {
  $id: string;
  reporterId: string;
  reporterName: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  status: string;
  resolvedBy?: string;
  resolvedAt?: string;
  $createdAt: string;
};

export async function createReport(data: Omit<ReportDoc, "$id" | "$createdAt" | "status" | "resolvedBy" | "resolvedAt">): Promise<ReportDoc> {
  return await databases.createDocument<AppwriteDoc<ReportDoc>>({
    databaseId: DB, collectionId: COL.reports, documentId: ID.unique(),
    data: { ...data, status: "pending", $createdAt: new Date().toISOString() },
    permissions: [Permission.read(Role.users())],
  });
}

export async function listReports(status?: string): Promise<ReportDoc[]> {
  const queries: any[] = [Query.orderDesc("$createdAt"), Query.limit(100)];
  if (status) queries.push(Query.equal("status", status));
  const res = await databases.listDocuments<AppwriteDoc<ReportDoc>>({
    databaseId: DB, collectionId: COL.reports, queries,
  });
  return res.documents;
}

// ---------- Notifications ----------
export type NotificationDoc = {
  $id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: string;
  read: boolean;
  createdAt: string;
  $createdAt: string;
};

export async function listNotifications(userId: string): Promise<NotificationDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<NotificationDoc>>({
    databaseId: DB, collectionId: COL.notifications,
    queries: [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.documents;
}

export async function createNotification(data: Omit<NotificationDoc, "$id" | "$createdAt">): Promise<NotificationDoc> {
  return await databases.createDocument<AppwriteDoc<NotificationDoc>>({
    databaseId: DB, collectionId: COL.notifications, documentId: ID.unique(),
    data: { ...data, $createdAt: new Date().toISOString() },
    permissions: [Permission.read(Role.user(data.userId))],
  });
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await databases.updateDocument<AppwriteDoc<NotificationDoc>>({
    databaseId: DB, collectionId: COL.notifications, documentId: notificationId,
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const res = await databases.listDocuments<AppwriteDoc<NotificationDoc>>({
    databaseId: DB, collectionId: COL.notifications,
    queries: [Query.equal("userId", userId), Query.equal("read", false), Query.limit(100)],
  });
  for (const n of res.documents) {
    await databases.updateDocument<AppwriteDoc<NotificationDoc>>({
      databaseId: DB, collectionId: COL.notifications, documentId: n.$id,
      data: { read: true },
    });
  }
}

// ---------- Polls ----------
export type PollDoc = {
  $id: string;
  creatorId: string;
  creatorName: string;
  question: string;
  options: string[];
  city: string;
  locality?: string;
  groupId?: string;
  expiresAt?: string;
  totalVotes: number;
  $createdAt: string;
};

export async function listPolls(city: string, groupId?: string): Promise<PollDoc[]> {
  const queries: any[] = [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)];
  if (groupId) queries.push(Query.equal("groupId", groupId));
  const res = await databases.listDocuments<AppwriteDoc<PollDoc>>({
    databaseId: DB, collectionId: COL.polls, queries,
  });
  return res.documents;
}

export async function getPollById(pollId: string): Promise<PollDoc | null> {
  try {
    const doc = await databases.getDocument<AppwriteDoc<PollDoc>>({
      databaseId: DB, collectionId: COL.polls, documentId: pollId,
    });
    return doc;
  } catch {
    return null;
  }
}

export async function createPoll(data: Omit<PollDoc, "$id" | "$createdAt">): Promise<PollDoc> {
  return await databases.createDocument<AppwriteDoc<PollDoc>>({
    databaseId: DB, collectionId: COL.polls, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.creatorId)),
      Permission.delete(Role.user(data.creatorId)),
    ],
  });
}

export async function votePoll(pollId: string, userId: string, optionIndex: number): Promise<void> {
  await databases.createDocument<AppwriteDoc<any>>({
    databaseId: DB, collectionId: COL.poll_votes, documentId: ID.unique(),
    data: { pollId, userId, optionIndex },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(userId))],
  });
  // increment totalVotes
  try {
    const poll = await getPollById(pollId);
    if (poll) {
      await databases.updateDocument<AppwriteDoc<PollDoc>>({
        databaseId: DB, collectionId: COL.polls, documentId: pollId,
        data: { totalVotes: (poll.totalVotes || 0) + 1 },
      });
    }
  } catch { /* ignore */ }
}

export async function getPollVote(pollId: string, userId: string): Promise<{ optionIndex: number } | null> {
  const res = await databases.listDocuments<AppwriteDoc<any>>({
    databaseId: DB, collectionId: COL.poll_votes,
    queries: [Query.equal("pollId", pollId), Query.equal("userId", userId), Query.limit(1)],
  });
  return res.documents[0] ? { optionIndex: res.documents[0].optionIndex } : null;
}

// ---------- News ----------
export type NewsDoc = {
  $id: string;
  title: string;
  summary?: string;
  content?: string;
  source?: string;
  sourceUrl?: string;
  imageUrl?: string;
  city: string;
  category?: string;
  publishedAt: string;
  $createdAt: string;
};

export async function listNews(city: string, category?: string): Promise<NewsDoc[]> {
  const queries: any[] = [Query.equal("city", city), Query.orderDesc("publishedAt"), Query.limit(50)];
  if (category) queries.push(Query.equal("category", category));
  const res = await databases.listDocuments<AppwriteDoc<NewsDoc>>({
    databaseId: DB, collectionId: COL.news, queries,
  });
  return res.documents;
}

// ---------- Safety Alerts ----------
export type SafetyAlertDoc = {
  $id: string;
  title: string;
  description: string;
  alertType: string;
  severity: string;
  city: string;
  locality?: string;
  source?: string;
  expiresAt?: string;
  imageUrl?: string;
  $createdAt: string;
};

export async function listSafetyAlerts(city: string): Promise<SafetyAlertDoc[]> {
  const res = await databases.listDocuments<AppwriteDoc<SafetyAlertDoc>>({
    databaseId: DB, collectionId: COL.safety_alerts,
    queries: [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.documents;
}

export async function createSafetyAlert(data: Omit<SafetyAlertDoc, "$id" | "$createdAt">): Promise<SafetyAlertDoc> {
  return await databases.createDocument<AppwriteDoc<SafetyAlertDoc>>({
    databaseId: DB, collectionId: COL.safety_alerts, documentId: ID.unique(), data,
    permissions: [Permission.read(Role.users())],
  });
}

// ---------- Services ----------
export type ServiceDoc = {
  $id: string;
  providerId: string;
  providerName: string;
  serviceType: string;
  description?: string;
  hourlyRate?: number;
  city: string;
  locality?: string;
  phone?: string;
  email?: string;
  imageFileId?: string | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  $createdAt: string;
};

export async function listServices(city: string, serviceType?: string): Promise<ServiceDoc[]> {
  const queries: any[] = [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)];
  if (serviceType) queries.push(Query.equal("serviceType", serviceType));
  const res = await databases.listDocuments<AppwriteDoc<ServiceDoc>>({
    databaseId: DB, collectionId: COL.services, queries,
  });
  return res.documents;
}

export async function createService(data: Omit<ServiceDoc, "$id" | "$createdAt">): Promise<ServiceDoc> {
  return await databases.createDocument<AppwriteDoc<ServiceDoc>>({
    databaseId: DB, collectionId: COL.services, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.providerId)),
      Permission.delete(Role.user(data.providerId)),
    ],
  });
}

export async function updateService(serviceId: string, patch: Partial<ServiceDoc>): Promise<ServiceDoc> {
  return await databases.updateDocument<AppwriteDoc<ServiceDoc>>({
    databaseId: DB, collectionId: COL.services, documentId: serviceId, data: patch,
  });
}
