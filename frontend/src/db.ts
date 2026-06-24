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

// ---------- Profiles ----------
export async function getOrCreateProfile(userId: string, name: string, email: string) {
  // Find existing
  const res = await databases.listDocuments({
    databaseId: DB,
    collectionId: COL.profiles,
    queries: [Query.equal("userId", userId), Query.limit(1)],
  });
  if (res.documents.length > 0) return res.documents[0] as any;

  // Create
  return await databases.createDocument({
    databaseId: DB,
    collectionId: COL.profiles,
    documentId: ID.unique(),
    data: { userId, name, email, city: null, locality: null, verified: false },
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ],
  });
}

export async function updateProfile(
  docId: string,
  patch: { name?: string; city?: string; locality?: string }
) {
  return await databases.updateDocument({
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
  const res = await databases.listDocuments({
    databaseId: DB,
    collectionId: COL.posts,
    queries,
  });
  return res.documents as any;
}

export async function createPost(
  data: {
    authorId: string;
    authorName: string;
    authorLocality?: string;
    authorVerified?: boolean;
    category: string;
    content: string;
    city: string;
    locality?: string;
    imageFileId?: string | null;
  }
) {
  return await databases.createDocument({
    databaseId: DB,
    collectionId: COL.posts,
    documentId: ID.unique(),
    data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.authorId)),
      Permission.delete(Role.user(data.authorId)),
    ],
  });
}

// ---------- Likes ----------
export async function fetchLikeMap(
  postIds: string[],
  myUserId: string
): Promise<{ counts: Record<string, number>; mine: Record<string, string> }> {
  if (postIds.length === 0) return { counts: {}, mine: {} };
  const res = await databases.listDocuments({
    databaseId: DB,
    collectionId: COL.likes,
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
    databaseId: DB,
    collectionId: COL.likes,
    documentId: ID.unique(),
    data: { postId, userId },
    permissions: [
      Permission.read(Role.users()),
      Permission.delete(Role.user(userId)),
    ],
  });
}

export async function unlikePost(likeDocId: string) {
  await databases.deleteDocument({
    databaseId: DB,
    collectionId: COL.likes,
    documentId: likeDocId,
  });
}

// ---------- Events ----------
export type EventDoc = {
  $id: string;
  hostId: string;
  hostName: string;
  title: string;
  description: string;
  date: string;
  location: string;
  city: string;
  locality?: string;
  imageFileId?: string | null;
  $createdAt: string;
};

export async function listEvents(city: string): Promise<EventDoc[]> {
  const res = await databases.listDocuments({
    databaseId: DB,
    collectionId: COL.events,
    queries: [Query.equal("city", city), Query.orderAsc("date"), Query.limit(50)],
  });
  return res.documents as any;
}

export async function createEvent(data: Omit<EventDoc, "$id" | "$createdAt">) {
  return await databases.createDocument({
    databaseId: DB,
    collectionId: COL.events,
    documentId: ID.unique(),
    data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.hostId)),
      Permission.delete(Role.user(data.hostId)),
    ],
  });
}

export async function fetchRsvpMap(eventIds: string[], myUserId: string) {
  if (eventIds.length === 0) return { counts: {}, mine: {} };
  const res = await databases.listDocuments({
    databaseId: DB,
    collectionId: COL.rsvps,
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
    databaseId: DB,
    collectionId: COL.rsvps,
    documentId: ID.unique(),
    data: { eventId, userId },
    permissions: [
      Permission.read(Role.users()),
      Permission.delete(Role.user(userId)),
    ],
  });
}

export async function unrsvpEvent(rsvpDocId: string) {
  await databases.deleteDocument({
    databaseId: DB,
    collectionId: COL.rsvps,
    documentId: rsvpDocId,
  });
}

// ---------- Marketplace ----------
export type MarketDoc = {
  $id: string;
  sellerId: string;
  sellerName: string;
  sellerLocality?: string;
  title: string;
  description: string;
  price: number;
  city: string;
  locality?: string;
  imageFileId?: string | null;
  $createdAt: string;
};

export async function listMarket(city: string): Promise<MarketDoc[]> {
  const res = await databases.listDocuments({
    databaseId: DB,
    collectionId: COL.market,
    queries: [Query.equal("city", city), Query.orderDesc("$createdAt"), Query.limit(50)],
  });
  return res.documents as any;
}

export async function createMarket(data: Omit<MarketDoc, "$id" | "$createdAt">) {
  return await databases.createDocument({
    databaseId: DB,
    collectionId: COL.market,
    documentId: ID.unique(),
    data,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.user(data.sellerId)),
      Permission.delete(Role.user(data.sellerId)),
    ],
  });
}

// ---------- Storage ----------
export async function uploadImage(uri: string, name: string, mime: string, size: number, userId: string) {
  const file = await storage.createFile({
    bucketId: BUCKET,
    fileId: ID.unique(),
    file: { uri, name, type: mime, size },
    permissions: [
      Permission.read(Role.users()),
      Permission.delete(Role.user(userId)),
    ],
  });
  return file.$id;
}

export function imagePreviewUrl(fileId: string, width = 800, height = 600): string {
  const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
  return `${endpoint}/storage/buckets/${BUCKET}/files/${fileId}/view?project=${project}`;
}
