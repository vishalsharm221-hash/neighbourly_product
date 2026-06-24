import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { account, ID } from "@/src/appwrite";
import { getProfileByUserId, createProfile, updateProfile, Profile } from "@/src/db";

type AuthUser = { $id: string; email: string; name: string };

type AuthCtx = {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  // OTP flow
  sendOtp: (email: string) => Promise<string>; // returns userId
  verifyOtp: (userId: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Profile mgmt
  saveProfileSetup: (data: { name: string; gender?: string; dob?: string }) => Promise<void>;
  saveLocation: (city: string, locality: string, opts?: { userType?: "resident" | "student"; college?: string | null }) => Promise<void>;
  updateMe: (patch: Partial<Profile>) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: AuthUser) => {
    let p = await getProfileByUserId(u.$id);
    if (!p) {
      p = await createProfile(u.$id, u.email, u.name || "");
    }
    setProfile(p);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const u = await account.get();
      const auth = { $id: u.$id, email: u.email, name: u.name };
      setUser(auth);
      await loadProfile(auth);
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

  const sendOtp = async (email: string) => {
    const tok = await account.createEmailToken({ userId: ID.unique(), email });
    return tok.userId;
  };

  const verifyOtp = async (userId: string, otp: string) => {
    await account.createSession({ userId, secret: otp });
    await refresh();
  };

  const signOut = async () => {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {}
    setUser(null);
    setProfile(null);
  };

  const saveProfileSetup = async (data: { name: string; gender?: string; dob?: string }) => {
    if (!profile || !user) return;
    // Also update auth account name
    try {
      await account.updateName({ name: data.name });
    } catch {}
    const updated = await updateProfile(profile.$id, data);
    setProfile(updated);
  };

  const saveLocation = async (city: string, locality: string, opts?: { userType?: "resident" | "student"; college?: string | null }) => {
    if (!profile) return;
    const patch: any = { city, locality };
    if (opts?.userType) patch.userType = opts.userType;
    if (opts && "college" in opts) patch.college = opts.college;
    const updated = await updateProfile(profile.$id, patch);
    setProfile(updated);
  };

  const updateMe = async (patch: Partial<Profile>) => {
    if (!profile) return;
    const updated = await updateProfile(profile.$id, patch);
    setProfile(updated);
  };

  return (
    <Ctx.Provider
      value={{ user, profile, loading, sendOtp, verifyOtp, signOut, saveProfileSetup, saveLocation, updateMe, refresh }}
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
