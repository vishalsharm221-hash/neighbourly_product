import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/src/auth-context";
import { uploadImage, imagePreviewUrl } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

export default function EditProfile() {
  const router = useRouter();
  const { profile, user, updateMe } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [handle, setHandle] = useState(profile?.handle || "");
  const [avatarFileId, setAvatarFileId] = useState<string | null>(profile?.avatarFileId || null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setErr("Photo permission needed"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7, allowsEditing: true, aspect: [1, 1],
    });
    if (res.canceled || !res.assets[0] || !user) return;
    const a = res.assets[0];
    setLocalUri(a.uri);
    setBusy(true);
    try {
      const fid = await uploadImage(a.uri, a.fileName || "avatar.jpg", a.mimeType || "image/jpeg", a.fileSize || 0, user.$id);
      setAvatarFileId(fid);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setErr(null);
    if (!name.trim()) { setErr("Name required"); return; }
    if (handle && !/^[a-z0-9_.]{3,32}$/.test(handle.trim())) {
      setErr("Handle: 3-32 chars, lowercase letters, numbers, _ or . only");
      return;
    }
    setBusy(true);
    try {
      await updateMe({
        name: name.trim(),
        bio: bio.trim() || null,
        handle: handle.trim() || null,
        avatarFileId,
      } as any);
      router.back();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const avatarSrc = localUri || (avatarFileId ? imagePreviewUrl(avatarFileId) : null);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="edit-cancel">
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Edit profile</Text>
        <Pressable
          testID="edit-save"
          onPress={submit}
          disabled={busy}
          style={[styles.saveBtn, busy && { opacity: 0.4 }]}
        >
          {busy ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Text style={styles.saveBtnText}>Save</Text>}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center" }}>
            <Pressable onPress={pickAvatar} style={styles.avatarWrap} testID="edit-pick-avatar">
              {avatarSrc ? (
                <Image source={avatarSrc} style={StyleSheet.absoluteFillObject} contentFit="cover" />
              ) : (
                <Feather name="camera" size={28} color={colors.brand} />
              )}
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={14} color={colors.onBrand} />
              </View>
            </Pressable>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          <Field label="Name">
            <TextInput
              testID="edit-name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>

          <Field label="@handle (optional)">
            <TextInput
              testID="edit-handle"
              value={handle}
              onChangeText={(t) => setHandle(t.toLowerCase())}
              placeholder="e.g. priya.dlf"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={styles.input}
            />
          </Field>

          <Field label="Bio">
            <TextInput
              testID="edit-bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell your neighbours about you. Up to 500 characters."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={500}
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
            />
            <Text style={styles.counter}>{bio.length}/500</Text>
          </Field>

          {err ? <Text style={styles.err}>{err}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  saveBtn: { backgroundColor: colors.brand, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  saveBtnText: { color: colors.onBrand, fontSize: 14, fontWeight: "700" },
  avatarWrap: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center",
    overflow: "hidden", position: "relative",
  },
  cameraBadge: {
    position: "absolute", bottom: 6, right: 6, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.surface,
  },
  avatarHint: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 1, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, fontSize: 15, color: colors.onSurface,
  },
  counter: { fontSize: 11, color: colors.muted, marginTop: 4, textAlign: "right" },
  err: { color: colors.error, fontSize: 13 },
});
