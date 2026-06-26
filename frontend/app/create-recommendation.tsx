import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { z } from "zod";

import { useAuth } from "@/src/auth-context";
import { createRecommendation, uploadImage } from "@/src/db";
import { getErrorMessage } from "@/src/errors";
import { CITIES, LOCALITIES, City } from "@/src/data";
import { colors, spacing, radius } from "@/src/theme";

const REC_CATEGORIES = ["Food", "Parks", "Services", "Shopping", "Other"] as const;

const recoSchema = z.object({
  category: z.string().min(1, "Please select a category"),
  title: z.string().min(1, "Title is required").max(200, "Title too long (max 200 chars)"),
  content: z.string().min(1, "Content is required").max(2000, "Content too long (max 2000 chars)"),
  city: z.string().min(1, "Please select a city"),
  locality: z.string().optional().or(z.literal("")),
});

export default function CreateRecommendation() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [category, setCategory] = useState<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [city, setCity] = useState<City | null>(null);
  const [locality, setLocality] = useState<string | null>(null);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showLocalityModal, setShowLocalityModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const localities = city ? LOCALITIES[city] : [];

  useEffect(() => {
    if (profile?.city && !city) {
      setCity(profile.city as City);
    }
  }, [profile?.city]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr("Photo library permission needed.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets.length > 0) setImage(res.assets[0]);
  };

  const submit = async () => {
    const parsed = recoSchema.safeParse({
      category,
      title,
      content,
      city: city || "",
      locality,
    });
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
          image.fileName || "recommendation.jpg",
          image.mimeType || "image/jpeg",
          image.fileSize || 0,
          user.$id
        );
      }
      const categoryKey = category.toLowerCase() as "food" | "parks" | "services" | "shopping" | "other";
      await createRecommendation({
        authorId: user.$id,
        authorName: profile.name,
        category: categoryKey,
        title: title.trim(),
        content: content.trim(),
        city: city!,
        locality: locality || undefined,
        imageFileId: fileId,
        likeCount: 0,
        commentCount: 0,
      });
      router.replace("/recommendations");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to create recommendation"));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = category && title.trim() && content.trim() && city;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="reco-cancel" onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Recommend Something</Text>
        <Pressable
          testID="reco-submit"
          onPress={submit}
          disabled={busy || !canSubmit}
          style={[styles.postBtn, (!canSubmit || busy) && { opacity: 0.4 }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <Text style={styles.postBtnText}>Submit</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.label}>Category *</Text>
            <Pressable
              testID="reco-category-picker"
              onPress={() => setShowCategoryModal(true)}
              style={styles.picker}
            >
              <Feather name="tag" size={16} color={category ? colors.onSurface : colors.muted} />
              <Text style={[styles.pickerText, !category && { color: colors.muted }]}>
                {category || "Select category"}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.muted} />
            </Pressable>
          </View>

          <View>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              testID="reco-title-input"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Best momos in Khan Market"
              placeholderTextColor={colors.muted}
              style={styles.input}
              maxLength={200}
            />
            <Text style={styles.charCount}>{title.length}/200</Text>
          </View>

          <View>
            <Text style={styles.label}>Content *</Text>
            <TextInput
              testID="reco-content-input"
              value={content}
              onChangeText={setContent}
              placeholder="Share your recommendation with the neighbourhood"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{content.length}/2000</Text>
          </View>

          <View>
            <Text style={styles.label}>City *</Text>
            <Pressable
              testID="reco-city-picker"
              onPress={() => setShowCityModal(true)}
              style={styles.picker}
            >
              <Feather name="map-pin" size={16} color={city ? colors.onSurface : colors.muted} />
              <Text style={[styles.pickerText, !city && { color: colors.muted }]}>
                {city || "Select city"}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.muted} />
            </Pressable>
          </View>

          {city && (
            <View>
              <Text style={styles.label}>Locality</Text>
              <Pressable
                testID="reco-locality-picker"
                onPress={() => setShowLocalityModal(true)}
                style={styles.picker}
              >
                <Feather name="navigation" size={16} color={locality ? colors.onSurface : colors.muted} />
                <Text style={[styles.pickerText, !locality && { color: colors.muted }]}>
                  {locality || "Select locality"}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.muted} />
              </Pressable>
            </View>
          )}

          <View>
            <Text style={styles.label}>Photo (optional)</Text>
            {image ? (
              <View>
                <Image source={image.uri} style={styles.preview} contentFit="cover" />
                <Pressable
                  testID="reco-remove-image"
                  onPress={() => setImage(null)}
                  style={styles.removeImg}
                >
                  <Feather name="x" size={16} color={colors.onBrand} />
                </Pressable>
              </View>
            ) : (
              <Pressable testID="reco-pick-image" onPress={pickImage} style={styles.imgPicker}>
                <Feather name="image" size={20} color={colors.brand} />
                <Text style={styles.imgPickerText}>Add a photo</Text>
              </Pressable>
            )}
          </View>

          {err ? <Text style={styles.err}>{err}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <CityModal visible={showCityModal} cities={CITIES} selected={city} onSelect={(c) => { setCity(c); setLocality(null); }} onClose={() => setShowCityModal(false)} />
      <PickModal
        visible={showLocalityModal}
        items={localities}
        selected={locality}
        onSelect={(p) => { setLocality(p); setShowLocalityModal(false); }}
        onClose={() => setShowLocalityModal(false)}
        title="Locality"
      />
      <CategoryModal
        visible={showCategoryModal}
        categories={REC_CATEGORIES}
        selected={category}
        onSelect={(c) => { setCategory(c); setShowCategoryModal(false); }}
        onClose={() => setShowCategoryModal(false)}
      />
    </SafeAreaView>
  );
}

function CityModal({ visible, cities, selected, onSelect, onClose }: {
  visible: boolean; cities: readonly string[]; selected: City | null; onSelect: (c: City) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select City</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={colors.onSurface} />
            </Pressable>
          </View>
          {cities.map((c) => (
            <Pressable
              key={c}
              testID={`modal-city-${c}`}
              onPress={() => { onSelect(c); onClose(); }}
              style={[styles.modalRow, selected === c && styles.modalRowActive]}
            >
              <Text style={[styles.modalRowText, selected === c && styles.modalRowTextActive]}>{c}</Text>
              {selected === c && <Feather name="check" size={18} color={colors.brand} />}
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function PickModal({ visible, items, selected, onSelect, onClose, title }: {
  visible: boolean; items: string[]; selected: string | null; onSelect: (p: string) => void; onClose: () => void; title: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select {title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={colors.onSurface} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 400 }}>
            {items.map((l) => (
              <Pressable
                key={l}
                testID={`modal-pick-${l}`}
                onPress={() => { onSelect(l); onClose(); }}
                style={[styles.modalRow, selected === l && styles.modalRowActive]}
              >
                <Text style={[styles.modalRowText, selected === l && styles.modalRowTextActive]}>{l}</Text>
                {selected === l && <Feather name="check" size={18} color={colors.brand} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CategoryModal({ visible, categories, selected, onSelect, onClose }: {
  visible: boolean; categories: readonly string[]; selected: string; onSelect: (c: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={colors.onSurface} />
            </Pressable>
          </View>
          {categories.map((c) => (
            <Pressable
              key={c}
              testID={`modal-cat-${c}`}
              onPress={() => { onSelect(c); onClose(); }}
              style={[styles.modalRow, selected === c && styles.modalRowActive]}
            >
              <Text style={[styles.modalRowText, selected === c && styles.modalRowTextActive]}>{c}</Text>
              {selected === c && <Feather name="check" size={18} color={colors.brand} />}
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  postBtn: { backgroundColor: colors.brand, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  postBtnText: { color: colors.onBrand, fontSize: 14, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 1, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 14,
    fontSize: 15, color: colors.onSurface,
  },
  picker: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  pickerText: { flex: 1, fontSize: 15, color: colors.onSurface },
  charCount: { fontSize: 12, color: colors.muted, marginTop: spacing.xs, textAlign: "right" },
  imgPicker: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: 14, paddingHorizontal: spacing.lg,
    borderWidth: 1, borderStyle: "dashed", borderColor: colors.brand,
    borderRadius: radius.lg, backgroundColor: colors.brandTertiary,
  },
  imgPickerText: { color: colors.brand, fontSize: 14, fontWeight: "600" },
  preview: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg },
  removeImg: {
    position: "absolute", top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
  },
  err: { color: colors.error, marginTop: spacing.md, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  modalRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  modalRowActive: { backgroundColor: colors.brandTertiary },
  modalRowText: { flex: 1, fontSize: 15, color: colors.onSurface },
  modalRowTextActive: { color: colors.brand, fontWeight: "700" },
});
