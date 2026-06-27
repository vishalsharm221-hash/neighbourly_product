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

import { useAuth } from "@/src/auth-context";
import { createMarket, uploadImage } from "@/src/db"
import { getErrorMessage } from "@/src/errors";;
import { colors, spacing, radius } from "@/src/theme"

export default function CreateMarket() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr("Photo library permission needed.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets.length > 0) setImage(res.assets[0]);
  };

  const submit = async () => {
    const priceNum = parseFloat(price);
    if (!title.trim() || !description.trim() || isNaN(priceNum) || priceNum < 0) {
      setErr("Fill all fields and provide a valid price");
      return;
    }
    if (!profile || !user) return;
    setBusy(true);
    setErr(null);
    try {
      let fileId: string | undefined;
      if (image) {
        fileId = await uploadImage(
          image.uri,
          image.fileName || "item.jpg",
          image.mimeType || "image/jpeg",
          image.fileSize || 0,
          user.$id
        );
      }
      await createMarket({
        sellerId: user.$id,
        sellerName: profile.name,
        sellerLocality: profile.locality || undefined,
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        city: profile.city!,
        locality: profile.locality || undefined,
        imageFileId: fileId,
      });
      router.back();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="market-cancel">
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>New Listing 🛒</Text>
        <Pressable
          testID="market-submit"
          onPress={submit}
          disabled={busy}
          style={[styles.postBtn, busy && { opacity: 0.4 }]}
        >
          {busy ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Text style={styles.postBtnText}>List</Text>}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.label}>Photo (optional)</Text>
            {image ? (
              <View>
                <Image source={image.uri} style={styles.preview} contentFit="cover" />
                <Pressable
                  onPress={() => setImage(null)}
                  style={styles.removeImg}
                  testID="market-remove-image"
                >
                  <Feather name="x" size={16} color={colors.onBrand} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={pickImage} style={styles.imgPicker} testID="market-pick-image">
                <Feather name="image" size={20} color={colors.brand} />
                <Text style={styles.imgPickerText}>Add a product photo</Text>
              </Pressable>
            )}
          </View>

          <View>
            <Text style={styles.label}>Item title</Text>
            <TextInput
              testID="market-title-input"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. IKEA study desk"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Price (₹)</Text>
            <TextInput
              testID="market-price-input"
              value={price}
              onChangeText={setPrice}
              placeholder="3500"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Description</Text>
            <TextInput
              testID="market-desc-input"
              value={description}
              onChangeText={setDescription}
              placeholder="Condition, dimensions, pickup details…"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
            />
          </View>

          {err ? <Text style={styles.err}>{err}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: spacing.md, fontSize: 15, color: colors.onSurface,
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
  err: { color: "#FF3366", fontSize: 13, fontWeight: "700" },
});


