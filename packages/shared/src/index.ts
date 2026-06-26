// Shared cross-platform data + Appwrite resource ids.
// Both mobile (Expo) and web (Next.js) import from this package.

export const APPWRITE_DB = "localy";

export const APPWRITE_COL = {
  profiles: "profiles",
  posts: "posts",
  events: "events",
  market: "market",
  likes: "likes",
  rsvps: "rsvps",
  follows: "follows",
  comments: "comments",
  groups: "groups",
  group_posts: "group_posts",
  businesses: "businesses",
  reviews: "reviews",
  recommendations: "recommendations",
  listings: "listings",
  saved_items: "saved_items",
  reports: "reports",
  notifications: "notifications",
  polls: "polls",
  poll_votes: "poll_votes",
  news: "news",
  safety_alerts: "safety_alerts",
  services: "services",
} as const;

export const APPWRITE_BUCKET = "media";

export const CITIES = ["Delhi", "Gurugram", "Noida", "Ghaziabad", "Faridabad"] as const;
export type City = (typeof CITIES)[number];

export const CATEGORIES = [
  { key: "general", label: "General", color: "#4A4A48" },
  { key: "recommendations", label: "Recos", color: "#437A53" },
  { key: "safety", label: "Safety", color: "#B83A3A" },
  { key: "events", label: "Events", color: "#B58500" },
  { key: "forsale", label: "For Sale", color: "#2E5C3B" },
] as const;

export type Profile = {
  $id: string;
  userId: string;
  name: string;
  email: string;
  handle?: string | null;
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

export type Post = {
  $id: string;
  authorId: string;
  authorName: string;
  authorLocality?: string;
  category: string;
  content: string;
  city: string;
  locality?: string;
  imageFileId?: string | null;
  $createdAt: string;
};

export type Comment = {
  $id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  $createdAt: string;
};

export type Group = {
  $id: string;
  name: string;
  description?: string | null;
  imageFileId?: string | null;
  city: string;
  locality: string;
  memberIds: string[];
  adminIds: string[];
  creatorId: string;
  isPublic: boolean;
  category?: string | null;
  $createdAt: string;
};

export type GroupPost = {
  $id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  content: string;
  imageFileId?: string | null;
  $createdAt: string;
};

export type Business = {
  $id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  category: string;
  address?: string | null;
  city: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  imageFileId?: string | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  $createdAt: string;
};

export type Review = {
  $id: string;
  businessId: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment?: string | null;
  $createdAt: string;
};

export type Recommendation = {
  $id: string;
  authorId: string;
  authorName: string;
  type: string;
  title: string;
  description?: string | null;
  city: string;
  locality?: string | null;
  likeCount: number;
  commentCount: number;
  $createdAt: string;
};

export type Listing = {
  $id: string;
  authorId: string;
  authorName: string;
  title: string;
  description?: string | null;
  price: number;
  currency?: string;
  category: string;
  city: string;
  locality?: string | null;
  condition?: string | null;
  imageFileId?: string | null;
  status: "active" | "sold" | "expired";
  $createdAt: string;
};

export type SavedItem = {
  $id: string;
  userId: string;
  itemType: "post" | "recommendation" | "listing" | "business";
  itemId: string;
  $createdAt: string;
};

export type Report = {
  $id: string;
  reporterId: string;
  targetType: "post" | "user" | "business" | "group";
  targetId: string;
  reason: string;
  description?: string | null;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  $createdAt: string;
};

export type Notification = {
  $id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown> | null;
  $createdAt: string;
};

export type Poll = {
  $id: string;
  authorId: string;
  authorName: string;
  question: string;
  options: string[];
  city: string;
  locality?: string | null;
  totalVotes: number;
  expiresAt?: string | null;
  $createdAt: string;
};

export type PollVote = {
  $id: string;
  pollId: string;
  userId: string;
  optionIndex: number;
  $createdAt: string;
};

export type News = {
  $id: string;
  title: string;
  content: string;
  summary?: string | null;
  authorId: string;
  authorName: string;
  category: string;
  city: string;
  imageFileId?: string | null;
  publishedAt: string;
  $createdAt: string;
};

export type SafetyAlert = {
  $id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  city: string;
  locality?: string | null;
  issuedBy: string;
  expiresAt?: string | null;
  active: boolean;
  $createdAt: string;
};

export type Service = {
  $id: string;
  providerId: string;
  providerName: string;
  title: string;
  description?: string | null;
  category: string;
  city: string;
  locality?: string | null;
  priceRange?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  imageFileId?: string | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  $createdAt: string;
};

export type ChatDoc = {
  $id: string;
  participants: string[];
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  $createdAt: string;
};

export type MessageDoc = {
  $id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text?: string | null;
  type: "text" | "image" | "location";
  imageFileId?: string | null;
  $createdAt: string;
};

// Full locality list lives in mobile/web duplicates to keep package framework-free.
// See `apps/web/lib/localities.ts` and `frontend/src/data.ts` (mobile).
