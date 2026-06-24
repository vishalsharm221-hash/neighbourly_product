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
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, CATEGORIES } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

export default function CreatePost() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!content.trim()) {
      setErr("Write something first");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.createPost(content.trim(), category);
      router.back();
    } catch (e: any) {
      setErr(e?.message || "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="create-cancel" onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>New Post</Text>
        <Pressable
          testID="create-submit"
          onPress={submit}
          disabled={busy || !content.trim()}
          style={[styles.postBtn, (busy || !content.trim()) && { opacity: 0.4 }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
                    active && { backgroundColor: c.color, borderColor: c.color },
                  ]}
                >
                  <Text style={[styles.catChipText, active && { color: colors.onBrand }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>What's on your mind?</Text>
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
          {err ? <Text style={styles.err}>{err}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  postBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  postBtnText: { color: colors.onBrand, fontSize: 14, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 1, marginBottom: spacing.sm },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  catChipText: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  input: {
    minHeight: 180,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.onSurface,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  err: { color: colors.error, marginTop: spacing.md, fontSize: 13 },
});
