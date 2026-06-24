import { Client, Account, Databases, Storage, ID, Permission, Role, Query } from "appwrite";

function init() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!endpoint || !projectId) {
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_ENDPOINT / PROJECT_ID in env");
  }
  const client = new Client().setEndpoint(endpoint).setProject(projectId);
  return {
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
  };
}

let _api: ReturnType<typeof init> | undefined;
function lazy() {
  if (!_api) _api = init();
  return _api;
}

export const account = new Proxy({} as Account, { get(_, p) { return (lazy().account as any)[p]; } });
export const databases = new Proxy({} as Databases, { get(_, p) { return (lazy().databases as any)[p]; } });
export const storage = new Proxy({} as Storage, { get(_, p) { return (lazy().storage as any)[p]; } });
export { ID, Permission, Role, Query };
