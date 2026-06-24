import {
  databases,
  storage,
  ID,
  Permission,
  Role,
  Query,
  DB,
  COL,
  BUCKET,
} from "@/src/appwrite";

// ---------- Profile ----------
export type Profile = {
  $id: string;
  userId: string;
  name: string;
  email: string;
  handle?: string;
  city: string | null;
  locality: string | null;
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
  const res = await databases.listDocuments({
    databaseId: DB,
    collectionId: COL.profiles,
    queries: [Query.equal("userId", userId), Query.limit(1)],
  });
  return (res.documents[0] as any) || null;
}

export async function createProfile(userId: string, email: string, name = ""): Promise<Profile> {
  return await databases.createDocument({
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
  }) as any;
}

export async function updateProfile(docId: string, patch: Partial<Profile>) {
  return await databases.updateDocument({
    databaseId: DB,
    collectionId: COL.profiles,
    documentId: docId,
    data: patch as any,
  }) as any;
}

// ---------- Posts ----------
export type PostDoc = {
  $id: string;
  authorId: string;
  authorName: string;
  authorLocality?: string;
  authorVerified?: boolean;
  category: string;
  content: string;
  city: string;
  locality?: string;
  imageFileId?: string | null;
  $createdAt: string;
};

export async function listPosts(city: string, category?: string): Promise<PostDoc[]> {
  const queries = [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)];
  if (category && category !== "all") queries.push(Query.equal("category", category));
  const res = await databases.listDocuments({ databaseId: DB, collectionId: COL.posts, queries });
  return res.documents as any;
}

export async function listPostsByAuthor(authorId: string): Promise<PostDoc[]> {
  const res = await databases.listDocuments({
    databaseId: DB,
    collectionId: COL.posts,
    queries: [Query.equal("authorId", authorId), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.documents as any;
}

export async function createPost(data: {
  authorId: string; authorName: string; authorLocality?: string; authorVerified?: boolean;
  category: string; content: string; city: string; locality?: string; imageFileId?: string | null;
}) {
  return await databases.createDocument({
    databaseId: DB, collectionId: COL.posts, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.authorId)),
      Permission.delete(Role.user(data.authorId)),
    ],
  });
}

// ---------- Likes ----------
export async function fetchLikeMap(postIds: string[], myUserId: string) {
  if (postIds.length === 0) return { counts: {}, mine: {} } as any;
  const res = await databases.listDocuments({
    databaseId: DB, collectionId: COL.likes,
    queries: [Query.equal("postId", postIds), Query.limit(1000)],
  });
  const counts: Record<string, number> = {};
  const mine: Record<string, string> = {};
  for (const d of res.documents as any[]) {
    counts[d.postId] = (counts[d.postId] || 0) + 1;
    if (d.userId === myUserId) mine[d.postId] = d.$id;
  }
  return { counts, mine };
}

export async function likePost(postId: string, userId: string) {
  return await databases.createDocument({
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
  const res = await databases.listDocuments({
    databaseId: DB, collectionId: COL.events,
    queries: [Query.equal("city", city), Query.orderAsc("date"), Query.limit(50)],
  });
  return res.documents as any;
}

export async function createEvent(data: Omit<EventDoc, "$id" | "$createdAt">) {
  return await databases.createDocument({
    databaseId: DB, collectionId: COL.events, documentId: ID.unique(), data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.hostId)),
      Permission.delete(Role.user(data.hostId)),
    ],
  });
}

export async function fetchRsvpMap(eventIds: string[], myUserId: string) {
  if (eventIds.length === 0) return { counts: {}, mine: {} } as any;
  const res = await databases.listDocuments({
    databaseId: DB, collectionId: COL.rsvps,
    queries: [Query.equal("eventId", eventIds), Query.limit(1000)],
  });
  const counts: Record<string, number> = {};
  const mine: Record<string, string> = {};
  for (const d of res.documents as any[]) {
    counts[d.eventId] = (counts[d.eventId] || 0) + 1;
    if (d.userId === myUserId) mine[d.eventId] = d.$id;
  }
  return { counts, mine };
}

export async function rsvpEvent(eventId: string, userId: string) {
  return await databases.createDocument({
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
  const res = await databases.listDocuments({
    databaseId: DB, collectionId: COL.market,
    queries: [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.documents as any;
}

export async function createMarket(data: Omit<MarketDoc, "$id" | "$createdAt">) {
  return await databases.createDocument({
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

export async function isFollowing(followerId: string, followedId: string): Promise<string | null> {
  const res = await databases.listDocuments({
    databaseId: DB, collectionId: FOLLOWS,
    queries: [Query.equal("followerId", followerId), Query.equal("followedId", followedId), Query.limit(1)],
  });
  return (res.documents[0] as any)?.$id || null;
}

export async function follow(followerId: string, followedId: string, followerProfileId: string, followedProfileId: string) {
  const doc = await databases.createDocument({
    databaseId: DB, collectionId: FOLLOWS, documentId: ID.unique(),
    data: { followerId, followedId },
    permissions: [Permission.read(Role.users()), Permission.delete(Role.user(followerId))],
  });
  // Increment counts (best-effort)
  try {
    const me = await databases.getDocument({ databaseId: DB, collectionId: COL.profiles, documentId: followerProfileId }) as any;
    await databases.updateDocument({
      databaseId: DB, collectionId: COL.profiles, documentId: followerProfileId,
      data: { followingCount: (me.followingCount || 0) + 1 },
    });
  } catch {}
  return doc;
}

export async function unfollow(followDocId: string, followerProfileId: string) {
  await databases.deleteDocument({ databaseId: DB, collectionId: FOLLOWS, documentId: followDocId });
  try {
    const me = await databases.getDocument({ databaseId: DB, collectionId: COL.profiles, documentId: followerProfileId }) as any;
    await databases.updateDocument({
      databaseId: DB, collectionId: COL.profiles, documentId: followerProfileId,
      data: { followingCount: Math.max(0, (me.followingCount || 0) - 1) },
    });
  } catch {}
}

// ---------- Storage ----------
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
