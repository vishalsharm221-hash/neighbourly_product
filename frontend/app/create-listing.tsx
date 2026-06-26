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
import { createListing, uploadImage } from "@/src/db";
import { getErrorMessage } from "@/src/errors";
import { CITIES, LOCALITIES, City } from "@/src/data";
import { colors, spacing, radius } from "@/src/theme";

const LISTING_TYPES = ["For Sale", "Rental", "PG"] as const;

const listingSchema = z.object({
  type: z.string().min(1, "Please select a type"),
  title: z.string().min(1, "Title is required").max(200, "Title too long (max 200 chars)"),
  description: z.string().max(2000, "Description too long (max 2000 chars)").optional().or(z.literal("")),
  price: z.coerce.number().positive("Price must be greater than 0"),
  address: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "Please select a city"),
  locality: z.string().optional().or(z.literal("")),
  bedrooms: z.coerce.number().int().nonnegative("Must be 0 or more").optional().or(z.literal("")),
  bathrooms: z.coerce.number().int().nonnegative("Must be 0 or more").optional().or(z.literal("")),
  area: z.coerce.number().positive("Must be greater than 0").optional().or(z.literal("")),
  phone: z.string().max(20, "Phone too long").optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export default function CreateListing() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [listingType, setListingType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState<City | null>(null);
  const [locality, setLocality] = useState<string | null>(null);
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showLocalityModal, setShowLocalityModal] = useState(false);

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
      allowsMultiple: false,
    });
    if (!res.canceled && res.assets.length > 0) setImage(res.assets[0]);
  };

  const submit = async () => {
    const parsed = listingSchema.safeParse({
      type: listingType,
      title,
      description,
      price,
      address,
      city: city || "",
      locality,
      bedrooms,
      bathrooms,
      area,
      phone,
      email,
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
          image.fileName || "listing.jpg",
          image.mimeType || "image/jpeg",
          image.fileSize || 0,
          user.$id
        );
      }
      const typeValue = listingType.toLowerCase() as "sale" | "rental" | "pg";
      await createListing({
        hostId: user.$id,
        hostName: profile.name,
        type: typeValue,
        title: title.trim(),
        description: description.trim() || undefined,
        price: parseFloat(price),
        address: address.trim() || undefined,
        city: city!,
        locality: locality || undefined,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : undefined,
        area_sqft: area ? parseFloat(area) : undefined,
        contactPhone: phone.trim() || undefined,
        contactEmail: email.trim() || undefined,
        imageFileId: fileId,
      });
      router.replace("/listings");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to create listing"));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = listingType && title.trim() && price && city;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="listing-cancel" onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Create Listing</Text>
        <Pressable
          testID="listing-submit"
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
            <Text style={styles.label}>Type *</Text>
            <View style={styles.segRow}>
              {LISTING_TYPES.map((t) => {
                const key = t.toLowerCase();
                const active = listingType === key;
                return (
                  <Pressable
                    key={t}
                    testID={`listing-type-${key}`}
                    onPress={() => setListingType(key)}
                    style={[styles.segBtn, active && styles.segBtnActive]}
                  >
                    <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              testID="listing-title-input"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 3BHK in South Delhi"
              placeholderTextColor={colors.muted}
              style={styles.input}
              maxLength={200}
            />
            <Text style={styles.charCount}>{title.length}/200</Text>
          </View>

          <View>
            <Text style={styles.label}>Description</Text>
            <TextInput
              testID="listing-desc-input"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your property"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{description.length}/2000</Text>
          </View>

          <View>
            <Text style={styles.label}>Price (₹) *</Text>
            <TextInput
              testID="listing-price-input"
              value={price}
              onChangeText={setPrice}
              placeholder="25000000"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Address</Text>
            <TextInput
              testID="listing-address-input"
              value={address}
              onChangeText={setAddress}
              placeholder="Street address"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>City *</Text>
            <Pressable
              testID="listing-city-picker"
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
                testID="listing-locality-picker"
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
            <Text style={styles.label}>Bedrooms</Text>
            <TextInput
              testID="listing-bedrooms-input"
              value={bedrooms}
              onChangeText={setBedrooms}
              placeholder="3"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Bathrooms</Text>
            <TextInput
              testID="listing-bathrooms-input"
              value={bathrooms}
              onChangeText={setBathrooms}
              placeholder="2"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Area (sq ft)</Text>
            <TextInput
              testID="listing-area-input"
              value={area}
              onChangeText={setArea}
              placeholder="1200"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              testID="listing-phone-input"
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
            <Text style={styles.label}>Contact Email</Text>
            <TextInput
              testID="listing-email-input"
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
            <Text style={styles.label}>Listing Photo (optional)</Text>
            {image ? (
              <View>
                <Image source={image.uri} style={styles.preview} contentFit="cover" />
                <Pressable
                  testID="listing-remove-image"
                  onPress={() => setImage(null)}
                  style={styles.removeImg}
                >
                  <Feather name="x" size={16} color={colors.onBrand} />
                </Pressable>
              </View>
            ) : (
              <Pressable testID="listing-pick-image" onPress={pickImage} style={styles.imgPicker}>
                <Feather name="image" size={20} color={colors.brand} />
                <Text style={styles.imgPickerText}>Add a listing photo</Text>
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
  segRow: { flexDirection: "row", gap: spacing.sm },
  segBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: "center",
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  segBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  segBtnText: { fontSize: 14, fontWeight: "600", color: colors.onSurface },
  segBtnTextActive: { color: colors.onBrand },
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
