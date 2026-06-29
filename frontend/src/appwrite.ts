import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import {
  Client,
  Account,
  Databases,
  Storage,
  Realtime,
  ID,
  Permission,
  Role,
  Query,
} from "react-native-appwrite";

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "6a3b7680002e8d01dd74";
const PLATFORM = process.env.EXPO_PUBLIC_APPWRITE_PLATFORM || "in.localy.app";

export const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

if (Platform.OS !== "web" && PLATFORM) {
  client.setPlatform(PLATFORM);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const realtime = new Realtime(client);
export { ID, Permission, Role, Query };

export const DB = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "localy";
export const COL = {
  profiles: "profiles",
  posts: "posts",
  events: "events",
  market: "market",
  likes: "likes",
  rsvps: "rsvps",
  chats: "chats",
  messages: "messages",
  comments: "comments",
  groups: "groups",
  group_members: "group_members",
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
export const BUCKET = "media";
