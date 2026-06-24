// Shared cross-platform data + Appwrite resource ids.
// Both mobile (Expo) and web (Next.js) import from this package.

export const APPWRITE_DB = "neighbourly";

export const APPWRITE_COL = {
  profiles: "profiles",
  posts: "posts",
  events: "events",
  market: "market",
  likes: "likes",
  rsvps: "rsvps",
  follows: "follows",
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

// Full locality list lives in mobile/web duplicates to keep package framework-free.
// See `apps/web/lib/localities.ts` and `frontend/src/data.ts` (mobile).
