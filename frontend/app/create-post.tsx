import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { z } from "zod";

import { useAuth } from "@/src/auth-context";
import { createPost, uploadImage } from "@/src/db";
import { CATEGORIES } from "@/src/data";
import { colors, spacing, radius } from "@/src/theme";

const postSchema = z.object({
  content: z.string().min(1, "Write something first").max(2000, "Post too long (max 2000 chars)"),
  category: z.string().min(1),
});

export default function CreatePost() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr("Photo library permission needed to attach images.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets.length > 0) {
      setImage(res.assets[0]);
    }
  };

  const submit = async () => {
    const parsed = postSchema.safeParse({ content, category });
    if (!parsed.success) {
      setErr(parsed.error.issues[0].message);
      return;
    }
    if (!profile || !user) {
      setErr("Not signed in");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      let fileId: string | undefined;
      if (image) {
        fileId = await uploadImage(
          image.uri,
          image.fileName || "post.jpg",
          image.mimeType || "image/jpeg",
          image.fileSize || 0,
          user.$id
        );
      }
      await createPost({
        authorId: user.$id,
        authorName: profile.name,
        authorAvatar: profile.avatarFileId || null,
        authorLocality: profile.locality || undefined,
        authorVerified: profile.verified,
        category,
        content: content.trim(),
        city: profile.city!,
        locality: profile.locality || undefined,
        audience: profile.userType === "student" ? "college" : "locality",
        college: profile.userType === "student" ? profile.college : null,
        imageFileId: fileId,
      }, profile.$id);
      router.back();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="create-cancel" onPress={() => router.back()} hitSlop={10} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>New Post ✍️</Text>
        <Pressable
          testID="create-submit"
          onPress={submit}
          disabled={busy || !content.trim()}
          style={[styles.postBtn, (busy || !content.trim()) && { opacity: 0.4 }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Category</Text>
        <View style={styles.cats}>
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <Pressable
                key={c.key}
                testID={`create-cat-${c.key}`}
                onPress={() => setCategory(c.key)}
                style={[
                  styles.catChip,
                  active && { backgroundColor: c.color, borderColor: "#000" },
                ]}
              >
                <Text style={[styles.catChipText, active && { color: "#FFFFFF" }]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Message</Text>
          <TextInput
            testID="create-content-input"
            value={content}
            onChangeText={setContent}
            placeholder="Share an update, a question, or a recommendation with your neighbours…"
            placeholderTextColor={colors.muted}
            multiline
            style={styles.input}
            autoFocus
          />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Photo (optional)</Text>
          {image ? (
            <View>
              <Image source={image.uri} style={styles.preview} contentFit="cover" />
              <Pressable
                testID="create-remove-image"
                onPress={() => setImage(null)}
                style={styles.removeImg}
              >
                <Feather name="x" size={16} color={colors.onBrand} />
              </Pressable>
            </View>
          ) : (
            <Pressable testID="create-pick-image" onPress={pickImage} style={styles.imgPicker}>
              <Feather name="image" size={20} color={colors.brand} />
              <Text style={styles.imgPickerText}>Add a photo from your library</Text>
            </Pressable>
          )}

          {err ? <Text style={styles.err}>{err}</Text> : null}
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 3, borderBottomColor: "#000",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    gap: spacing.sm,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "900", color: colors.onSurface, textAlign: "center", letterSpacing: -0.3 },
  postBtn: {
    backgroundColor: "#3366FF",
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  postBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  label: { fontSize: 12, fontWeight: "800", color: colors.onSurfaceTertiary, letterSpacing: 0.5, marginBottom: spacing.sm },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000", backgroundColor: colors.surfaceTertiary,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  catChipText: { fontSize: 13, fontWeight: "800", color: colors.onSurfaceTertiary },
  input: {
    minHeight: 140, backgroundColor: "#F3F3F5", borderRadius: radius.md,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    padding: spacing.lg, fontSize: 16, color: colors.onSurface, textAlignVertical: "top", lineHeight: 22,
  },
  imgPicker: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: 14, paddingHorizontal: spacing.lg,
    borderWidth: 2, borderColor: "#000", borderStyle: "dashed",
    borderRadius: radius.lg, backgroundColor: colors.brandTertiary,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  imgPickerText: { color: colors.brand, fontSize: 14, fontWeight: "700" },
  preview: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg, borderWidth: 2, borderColor: "#000" },
  removeImg: {
    position: "absolute", top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.8)", borderWidth: 2, borderColor: "#000",
    alignItems: "center", justifyContent: "center",
  },
  err: { color: "#FF3366", marginTop: spacing.md, fontSize: 13, fontWeight: "700" },
});
