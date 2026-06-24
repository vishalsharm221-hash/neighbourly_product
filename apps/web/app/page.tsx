"use client";
import { useState } from "react";
import { account, ID } from "../lib/appwrite";
import { APPWRITE_DB, APPWRITE_COL, Profile } from "@neighbourly/shared";
import { databases, Query } from "../lib/appwrite";

export const dynamic = "force-dynamic";

export default function Home() {
  const [step, setStep] = useState<"email" | "otp" | "feed">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState("");

  const sendOtp = async () => {
    setErr("");
    try {
      const t = await account.createEmailToken(ID.unique(), email);
      setUserId(t.userId);
      setStep("otp");
    } catch (e: any) { setErr(e?.message || "Failed"); }
  };

  const verify = async () => {
    setErr("");
    try {
      await account.createSession(userId, otp);
      const me = await account.get();
      const res = await databases.listDocuments(APPWRITE_DB, APPWRITE_COL.profiles, [Query.equal("userId", me.$id), Query.limit(1)]);
      setProfile(res.documents[0] as any);
      setStep("feed");
    } catch (e: any) { setErr(e?.message || "Bad code"); }
  };

  return (
    <main style={{ maxWidth: 480, margin: "60px auto", fontFamily: "system-ui", padding: 24 }}>
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>Neighbourly Web</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Hyperlocal feed for Delhi NCR. Same data as the mobile app.</p>

      {step === "email" && (
        <>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 12, fontSize: 16, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}
          />
          <button onClick={sendOtp} style={{ width: "100%", padding: 14, fontSize: 16, background: "#2E5C3B", color: "#fff", border: 0, borderRadius: 999 }}>
            Send code
          </button>
        </>
      )}

      {step === "otp" && (
        <>
          <p>Code sent to {email}</p>
          <input
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={{ width: "100%", padding: 12, fontSize: 24, textAlign: "center", letterSpacing: 8, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}
          />
          <button onClick={verify} style={{ width: "100%", padding: 14, fontSize: 16, background: "#2E5C3B", color: "#fff", border: 0, borderRadius: 999 }}>
            Verify
          </button>
        </>
      )}

      {step === "feed" && profile && (
        <div style={{ padding: 24, border: "1px solid #eee", borderRadius: 16 }}>
          <h2>{profile.name}</h2>
          <p>📍 {profile.locality} · {profile.city}</p>
          {profile.bio && <p style={{ marginTop: 12 }}>{profile.bio}</p>}
          <p style={{ marginTop: 16, color: "#888" }}>
            {profile.followerCount} followers · {profile.followingCount} following · {profile.postCount} posts
          </p>
          <p style={{ marginTop: 24, color: "#666" }}>
            Full Instagram-style feed UI to be built. Same Appwrite data, accessible from any web browser.
          </p>
        </div>
      )}

      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}
    </main>
  );
}
