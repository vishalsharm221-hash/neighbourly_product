import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { account, ID } from "@/src/appwrite";
import { getOrCreateProfile, updateProfile } from "@/src/db";

export type Profile = {
  $id: string;
  userId: string;
  name: string;
  email: string;
  city: string | null;
  locality: string | null;
  verified: boolean;
};

type AuthCtx = {
  user: { $id: string; email: string; name: string } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveLocation: (city: string, locality: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthCtx["user"]>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: { $id: string; name: string; email: string }) => {
    const p = (await getOrCreateProfile(u.$id, u.name, u.email)) as any;
    setProfile(p);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const u = await account.get();
      setUser({ $id: u.$id, email: u.email, name: u.name });
      await loadProfile({ $id: u.$id, name: u.name, email: u.email });
    } catch {
      setUser(null);
      setProfile(null);
    }
  }, [loadProfile]);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const signIn = async (email: string, password: string) => {
    await account.createEmailPasswordSession({ email, password });
    await refresh();
  };

  const signUp = async (name: string, email: string, password: string) => {
    await account.create({ userId: ID.unique(), email, password, name });
    await account.createEmailPasswordSession({ email, password });
    await refresh();
  };

  const signOut = async () => {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {}
    setUser(null);
    setProfile(null);
  };

  const saveLocation = async (city: string, locality: string) => {
    if (!profile) return;
    const updated = (await updateProfile(profile.$id, { city, locality })) as any;
    setProfile(updated);
  };

  return (
    <Ctx.Provider
      value={{ user, profile, loading, signIn, signUp, signOut, saveLocation, refresh }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
