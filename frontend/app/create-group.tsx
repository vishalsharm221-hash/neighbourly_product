import { useState } from "react";
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
import { createGroup, uploadImage } from "@/src/db";
import { CITIES, LOCALITIES, City } from "@/src/data";
import { COLLEGES } from "@/src/colleges";
import { getErrorMessage } from "@/src/errors";
import { colors, spacing, radius } from "@/src/theme";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(128, "Group name too long (max 128 chars)"),
  description: z.string().max(2000, "Description too long (max 2000 chars)").optional().or(z.literal("")),
});

type Mode = "resident" | "student";

export default function CreateGroup() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState<City | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showPickModal, setShowPickModal] = useState(false);

  const localities = !city ? [] : mode === "student" ? COLLEGES[city] : LOCALITIES[city];

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
    const parsed = groupSchema.safeParse({ name, description });
    if (!parsed.success) {
      setErr(parsed.error.issues[0].message);
      return;
    }
    if (!city) {
      setErr("Please select a city");
      return;
    }
    if (!mode || !pick) {
      setErr("Please select locality or college");
      return;
    }
    if (!user) { setErr("Not signed in"); return; }
    if (!profile) { setErr("Profile not loaded"); return; }
    setBusy(true);
    setErr(null);
    try {
      let fileId: string | undefined;
      if (image) {
        fileId = await uploadImage(
          image.uri,
          image.fileName || "group.jpg",
          image.mimeType || "image/jpeg",
          image.fileSize || 0,
          user.$id
        );
      }
      await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        city,
        locality: mode === "resident" ? pick : undefined,
        college: mode === "student" ? pick : undefined,
        creatorId: user.$id,
        creatorName: profile.name,
        memberCount: 1,
        isPublic,
        imageFileId: fileId,
      });
      router.back();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to create group"));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = name.trim().length > 0 && city && mode && pick;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="create-cancel" onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>New Squad 👥</Text>
        <Pressable
          testID="create-submit"
          onPress={submit}
          disabled={busy || !canSubmit}
          style={[styles.postBtn, (!canSubmit || busy) && { opacity: 0.4 }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <Text style={styles.postBtnText}>Create</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.label}>Group Name *</Text>
            <TextInput
              testID="group-name-input"
              value={name}
              onChangeText={setName}
              placeholder="Enter group name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              maxLength={128}
            />
          </View>

          <View>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              testID="group-desc-input"
              value={description}
              onChangeText={setDescription}
              placeholder="What is this group about?"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{description.length}/2000</Text>
          </View>

          <View>
            <Text style={styles.label}>City *</Text>
            <Pressable
              testID="group-city-picker"
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

          <View>
            <Text style={styles.label}>Mode *</Text>
            <View style={styles.modeRow}>
              <Pressable
                testID="group-mode-resident"
                onPress={() => { setMode("resident"); setPick(null); }}
                style={[styles.modeChip, mode === "resident" && styles.modeChipActive]}
              >
                <Feather name="home" size={14} color={mode === "resident" ? colors.onBrand : colors.onSurfaceTertiary} />
                <Text style={[styles.modeChipText, mode === "resident" && styles.modeChipTextActive]}>Resident</Text>
              </Pressable>
              <Pressable
                testID="group-mode-student"
                onPress={() => { setMode("student"); setPick(null); }}
                style={[styles.modeChip, mode === "student" && styles.modeChipActive]}
              >
                <Feather name="book-open" size={14} color={mode === "student" ? colors.onBrand : colors.onSurfaceTertiary} />
                <Text style={[styles.modeChipText, mode === "student" && styles.modeChipTextActive]}>Student</Text>
              </Pressable>
            </View>
          </View>

          {city && mode && (
            <View>
              <Text style={styles.label}>{mode === "student" ? "College *" : "Locality *"} ({localities.length})</Text>
              <Pressable
                testID="group-pick-picker"
                onPress={() => setShowPickModal(true)}
                style={styles.picker}
              >
                <Feather name={mode === "student" ? "book-open" : "map-pin"} size={16} color={pick ? colors.onSurface : colors.muted} />
                <Text style={[styles.pickerText, !pick && { color: colors.muted }]}>
                  {pick || `Select ${mode === "student" ? "college" : "locality"}`}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.muted} />
              </Pressable>
            </View>
          )}

          <View>
            <Text style={styles.label}>Visibility</Text>
            <View style={styles.modeRow}>
              <Pressable
                testID="group-public"
                onPress={() => setIsPublic(true)}
                style={[styles.modeChip, isPublic && styles.modeChipActive]}
              >
                <Feather name="globe" size={14} color={isPublic ? colors.onBrand : colors.onSurfaceTertiary} />
                <Text style={[styles.modeChipText, isPublic && styles.modeChipTextActive]}>Public</Text>
              </Pressable>
              <Pressable
                testID="group-private"
                onPress={() => setIsPublic(false)}
                style={[styles.modeChip, !isPublic && styles.modeChipActive]}
              >
                <Feather name="lock" size={14} color={!isPublic ? colors.onBrand : colors.onSurfaceTertiary} />
                <Text style={[styles.modeChipText, !isPublic && styles.modeChipTextActive]}>Private</Text>
              </Pressable>
            </View>
          </View>

          <View>
            <Text style={styles.label}>Group Photo (optional)</Text>
            {image ? (
              <View>
                <Image source={image.uri} style={styles.preview} contentFit="cover" />
                <Pressable
                  testID="group-remove-image"
                  onPress={() => setImage(null)}
                  style={styles.removeImg}
                >
                  <Feather name="x" size={16} color={colors.onBrand} />
                </Pressable>
              </View>
            ) : (
              <Pressable testID="group-pick-image" onPress={pickImage} style={styles.imgPicker}>
                <Feather name="image" size={20} color={colors.brand} />
                <Text style={styles.imgPickerText}>Add a group photo</Text>
              </Pressable>
            )}
          </View>

          {err ? <Text style={styles.err}>{err}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <CityModal visible={showCityModal} cities={CITIES} selected={city} onSelect={(c) => { setCity(c); setPick(null); }} onClose={() => setShowCityModal(false)} />
      <PickModal
        visible={showPickModal}
        items={localities}
        selected={pick}
        onSelect={(p) => { setPick(p); setShowPickModal(false); }}
        onClose={() => setShowPickModal(false)}
        title={mode === "student" ? "College" : "Locality"}
      />
    </SafeAreaView>
  );
}

function CityModal({ visible, cities, selected, onSelect, onClose }: {
  visible: boolean; cities: readonly string[]; selected: string | null; onSelect: (c: City) => void; onClose: () => void;
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
              onPress={() => { onSelect(c as City); onClose(); }}
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
            {items.map((l, idx) => (
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
  modeRow: { flexDirection: "row", gap: spacing.sm },
  modeChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border,
  },
  modeChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  modeChipText: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceTertiary },
  modeChipTextActive: { color: colors.onBrand },
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
