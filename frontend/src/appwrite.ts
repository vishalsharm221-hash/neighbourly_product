import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import {
  Client,
  Account,
  Databases,
  Storage,
  ID,
  Permission,
  Role,
  Query,
} from "react-native-appwrite";

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT as string;
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID as string;
const PLATFORM = process.env.EXPO_PUBLIC_APPWRITE_PLATFORM as string;

export const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

if (Platform.OS !== "web" && PLATFORM) {
  client.setPlatform(PLATFORM);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Permission, Role, Query };

export const DB = "neighbourly";
export const COL = {
  profiles: "profiles",
  posts: "posts",
  events: "events",
  market: "market",
  likes: "likes",
  rsvps: "rsvps",
  chats: "chats",
  messages: "messages",
} as const;
export const BUCKET = "media";
