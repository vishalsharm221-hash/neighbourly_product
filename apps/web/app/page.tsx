"use client";
import { useState } from "react";
import { account, ID, databases, Query } from "../lib/appwrite";
import { APPWRITE_DB, APPWRITE_COL, Profile } from "@neighbourly/shared";

export const dynamic = "force-dynamic";

export default function Home() {
  const [step, setStep] = useState<"start" | "email" | "otp" | "feed">("start");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const BRUTAL = {
    pink: "#FF3366",
    blue: "#3366FF",
    lime: "#66FF33",
    black: "#000000",
    offWhite: "#FBFBF9",
    white: "#FFFFFF",
    gray: "#F3F3F5",
    muted: "#8E8E88",
    error: "#FF3366",
  };

  const sendOtp = async () => {
    setErr("");
    setBusy(true);
    try {
      const t = await account.createEmailToken(ID.unique(), email);
      setUserId(t.userId);
      setStep("otp");
    } catch (e: any) { setErr(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setErr("");
    setBusy(true);
    try {
      await account.createSession(userId, otp.join(""));
      const me = await account.get();
      const res = await databases.listDocuments(APPWRITE_DB, APPWRITE_COL.profiles, [Query.equal("userId", me.$id), Query.limit(1)]);
      setProfile(res.documents[0] as any);
      setStep("feed");
    } catch (e: any) { setErr(e?.message || "Bad code"); }
    finally { setBusy(false); }
  };

  if (step === "feed" && profile) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: BRUTAL.offWhite, padding: "40px 20px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 4px", letterSpacing: -1 }}>{profile.name}</h1>
          <p style={{ margin: "0 0 16px", color: BRUTAL.muted, fontWeight: 700 }}>📍 {profile.locality} · {profile.city}</p>
          <p style={{ margin: "0 0 24px", color: "#4A4A48", fontWeight: 600, lineHeight: 1.6 }}>
            {profile.bio || "Your bio goes here — make it fun bestie ✨"}
          </p>
          <p style={{ margin: "0 0 32px", color: BRUTAL.muted, fontWeight: 700 }}>
            {profile.followerCount} followers · {profile.followingCount} following · {profile.postCount} posts
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Businesses", color: "#FF6B35", bg: "#FFE8D9" },
              { label: "Events", color: "#FF3366", bg: "#FFE0EC" },
              { label: "Marketplace", color: "#22C55E", bg: "#D4F5E2" },
              { label: "Services", color: "#3366FF", bg: "#D9E5FF" },
              { label: "Safety", color: "#EF4444", bg: "#FFE0D9" },
              { label: "Polls", color: "#7C3AED", bg: "#EDE5FF" },
            ].map((s) => (
              <button key={s.label} style={{
                flex: "1 1 30%", padding: 16, borderRadius: 16,
                backgroundColor: s.bg, border: `3px solid ${BRUTAL.black}`,
                boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
                color: s.color, fontWeight: 900, fontSize: 14, cursor: "pointer",
                textAlign: "center",
              }}>{s.label}</button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: BRUTAL.offWhite, padding: "40px 20px", position: "relative", overflow: "hidden" }}>
      {/* Blobs */}
      <div style={{ position: "absolute", top: "-80px", left: "-60px", width: 240, height: 240, borderRadius: 999, background: BRUTAL.pink, opacity: 0.35, filter: "blur(60px)" }} />
      <div style={{ position: "absolute", top: "30%", right: "-80px", width: 260, height: 260, borderRadius: 999, background: BRUTAL.blue, opacity: 0.35, filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: "-60px", left: "20%", width: 200, height: 200, borderRadius: 999, background: BRUTAL.lime, opacity: 0.3, filter: "blur(60px)" }} />

      <div style={{ maxWidth: 400, margin: "0 auto", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Logo */}
        <div style={{
          width: 96, height: 96, borderRadius: 28,
          background: BRUTAL.white, border: `4px solid ${BRUTAL.black}`,
          boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16, transform: "rotate(3deg)",
        }}><span style={{ fontSize: 44 }}>🔥</span></div>

        <h1 style={{ fontSize: 56, fontWeight: 900, margin: "0 0 4px", letterSpacing: -2, color: BRUTAL.white, textShadow: "2px 2px 0px rgba(0,0,0,0.15)" }}>Localy</h1>
        <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 32px", color: "rgba(255,255,255,0.9)" }}>Your hood, your vibe.</p>

        {step === "start" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
            <button onClick={() => setStep("email")} style={{
              width: "100%", padding: 16, borderRadius: 16, fontWeight: 900, fontSize: 16,
              background: BRUTAL.blue, color: BRUTAL.white, border: `3px solid ${BRUTAL.black}`,
              boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", cursor: "pointer",
            }}>Get Started →</button>
            <button onClick={() => setStep("email")} style={{
              width: "100%", padding: 16, borderRadius: 16, fontWeight: 900, fontSize: 16,
              background: BRUTAL.white, color: BRUTAL.black, border: `3px solid ${BRUTAL.black}`,
              boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", cursor: "pointer",
            }}>Sign in with Email ✉️</button>
          </div>
        )}

        {step === "email" && (
          <div style={{
            width: "100%", padding: 24, borderRadius: 20, gap: 16,
            background: "rgba(255,255,255,0.95)", border: `3px solid ${BRUTAL.black}`,
            boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)",
            display: "flex", flexDirection: "column",
          }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", letterSpacing: -0.5 }}>What's your email? bestie 💌</h2>
              <p style={{ margin: "4px 0 0", color: BRUTAL.muted, fontWeight: 600, fontSize: 14 }}>We'll send a code to your inbox 🔥</p>
            </div>
            <div>
              <label style={{
                position: "relative", top: -6, left: 14,
                background: "rgba(255,255,255,0.95)", padding: "2px 8px",
                fontSize: 11, fontWeight: 800, color: BRUTAL.blue,
                borderRadius: 999, border: `2px solid ${BRUTAL.black}`, zIndex: 1,
              }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%", padding: "16px 20px", fontSize: 15, fontWeight: 700,
                  background: BRUTAL.gray, border: `2px solid ${BRUTAL.black}`, borderRadius: 16,
                  boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", color: BRUTAL.black, outline: "none",
                }}
              />
            </div>
            {err && <p style={{ margin: 0, color: BRUTAL.error, fontWeight: 800, fontSize: 13 }}>{err}</p>}
            <button onClick={sendOtp} disabled={busy} style={{
              width: "100%", padding: 16, borderRadius: 16, fontWeight: 900, fontSize: 16,
              background: busy ? BRUTAL.muted : BRUTAL.blue, color: BRUTAL.white, border: `3px solid ${BRUTAL.black}`,
              boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", cursor: busy ? "not-allowed" : "pointer",
            }}>
              {busy ? "Sending..." : "Send OTP →"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div style={{
            width: "100%", padding: 24, borderRadius: 20, gap: 16,
            background: "rgba(255,255,255,0.95)", border: `3px solid ${BRUTAL.black}`,
            boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)",
            display: "flex", flexDirection: "column",
          }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px" }}>Check your mail 👀</h2>
              <p style={{ margin: "4px 0 0", color: BRUTAL.muted, fontWeight: 600, fontSize: 14 }}>We sent a code to <strong style={{ color: BRUTAL.black }}>{email}</strong></p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  value={d}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "").slice(-1);
                    const next = [...otp]; next[i] = v; setOtp(next);
                  }}
                  maxLength={1}
                  style={{
                    flex: 1, height: 56, textAlign: "center", fontSize: 24, fontWeight: 900,
                    background: BRUTAL.gray, border: `2px solid ${BRUTAL.black}`, borderRadius: 16,
                    boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", color: BRUTAL.black, outline: "none",
                  }}
                />
              ))}
            </div>
            {err && <p style={{ margin: 0, color: BRUTAL.error, fontWeight: 800, fontSize: 13 }}>{err}</p>}
            <button onClick={verify} disabled={busy} style={{
              width: "100%", padding: 16, borderRadius: 16, fontWeight: 900, fontSize: 16,
              background: busy ? BRUTAL.muted : BRUTAL.blue, color: BRUTAL.white, border: `3px solid ${BRUTAL.black}`,
              boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", cursor: busy ? "not-allowed" : "pointer",
            }}>
              {busy ? "Verifying..." : "Verify & Slay ✨"}
            </button>
          </div>
        )}

        {err && step !== "email" && step !== "otp" && <p style={{ marginTop: 16, color: BRUTAL.error, fontWeight: 800, textAlign: "center" }}>{err}</p>}
      </div>
    </main>
  );
}
