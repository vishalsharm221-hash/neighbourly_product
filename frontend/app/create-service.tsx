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
import { createService, uploadImage } from "@/src/db";
import { getErrorMessage } from "@/src/errors";
import { CITIES, LOCALITIES, City } from "@/src/data";
import { colors, spacing, radius } from "@/src/theme";

const SERVICE_TYPES = ["Plumber", "Electrician", "Cleaner", "Tutor", "Other"] as const;

const serviceSchema = z.object({
  serviceType: z.string().min(1, "Please select a service type"),
  description: z.string().max(2000, "Description too long (max 2000 chars)").optional().or(z.literal("")),
  hourlyRate: z.coerce.number().positive("Hourly rate must be greater than 0"),
  city: z.string().min(1, "Please select a city"),
  locality: z.string().optional(),
  phone: z.string().max(20, "Phone too long").optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export default function CreateService() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [serviceType, setServiceType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [city, setCity] = useState<City | null>(null);
  const [locality, setLocality] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showLocalityModal, setShowLocalityModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const localities = city ? LOCALITIES[city] : [];

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
    const parsed = serviceSchema.safeParse({
      serviceType, description, hourlyRate,
      city: city || "", locality, phone, email,
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
          image.fileName || "service.jpg",
          image.mimeType || "image/jpeg",
          image.fileSize || 0,
          user.$id
        );
      }
      const doc = await createService({
        providerId: user.$id,
        providerName: profile.name,
        serviceType,
        description: description.trim() || undefined,
        hourlyRate: parseFloat(hourlyRate),
        city: city!,
        locality: locality || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        imageFileId: fileId,
        rating: 0,
        reviewCount: 0,
        verified: false,
      });
      router.replace("/services" as any);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to offer service"));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = serviceType && hourlyRate && city;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="create-cancel" onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>New Service 🔧</Text>
        <Pressable
          testID="create-submit"
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
            <Text style={styles.label}>Service Type *</Text>
            <Pressable
              testID="service-type-picker"
              onPress={() => setShowServiceModal(true)}
              style={styles.picker}
            >
              <Feather name="tool" size={16} color={serviceType ? colors.onSurface : colors.muted} />
              <Text style={[styles.pickerText, !serviceType && { color: colors.muted }]}>
                {serviceType || "Select service type"}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.muted} />
            </Pressable>
          </View>

          <View>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              testID="service-desc-input"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the services you offer"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{description.length}/2000</Text>
          </View>

          <View>
            <Text style={styles.label}>Hourly Rate (₹) *</Text>
            <TextInput
              testID="service-rate-input"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              placeholder="500"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>City *</Text>
            <Pressable
              testID="service-city-picker"
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
              <Text style={styles.label}>Locality (optional)</Text>
              <Pressable
                testID="service-locality-picker"
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
            <Text style={styles.label}>Phone (optional)</Text>
            <TextInput
              testID="service-phone-input"
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              style={styles.input}
              maxLength={20}
            />
          </View>

          <View>
            <Text style={styles.label}>Email (optional)</Text>
            <TextInput
              testID="service-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Service Photo (optional)</Text>
            {image ? (
              <View>
                <Image source={image.uri} style={styles.preview} contentFit="cover" />
                <Pressable
                  testID="service-remove-image"
                  onPress={() => setImage(null)}
                  style={styles.removeImg}
                >
                  <Feather name="x" size={16} color={colors.onBrand} />
                </Pressable>
              </View>
            ) : (
              <Pressable testID="service-pick-image" onPress={pickImage} style={styles.imgPicker}>
                <Feather name="image" size={20} color={colors.brand} />
                <Text style={styles.imgPickerText}>Add a service photo</Text>
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
        visible={showServiceModal}
        categories={SERVICE_TYPES}
        selected={serviceType}
        onSelect={(c) => { setServiceType(c); setShowServiceModal(false); }}
        onClose={() => setShowServiceModal(false)}
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
            <Text style={styles.modalTitle}>Select Service Type</Text>
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
    borderBottomWidth: 3, borderBottomColor: "#000",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 18, fontWeight: "900", color: colors.onSurface, textAlign: "center", letterSpacing: -0.3 },
  postBtn: {
    backgroundColor: "#3366FF",
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  postBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  label: { fontSize: 12, fontWeight: "800", color: colors.onSurfaceTertiary, letterSpacing: 0.5, marginBottom: spacing.sm },
  input: {
    backgroundColor: "#F3F3F5", borderRadius: radius.md,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 4,
    paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 15, color: colors.onSurface,
  },
  picker: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: "#F3F3F5", borderRadius: radius.md,
    borderWidth: 2, borderColor: "#000", paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  pickerText: { flex: 1, fontSize: 15, color: colors.onSurface },
  charCount: { fontSize: 12, color: colors.muted, marginTop: spacing.xs, textAlign: "right" },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingBottom: spacing.md, borderBottomWidth: 2, borderBottomColor: "#000",
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: colors.onSurface },
  modalRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing.md, borderBottomWidth: 2, borderBottomColor: "#000", gap: spacing.sm,
  },
  modalRowActive: { backgroundColor: colors.brandTertiary },
  modalRowText: { flex: 1, fontSize: 15, color: colors.onSurface },
  modalRowTextActive: { color: colors.brand, fontWeight: "900" },
});
