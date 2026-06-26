import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { ListingDoc, getListingById, imagePreviewUrl } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

export default function ListingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [listing, setListing] = useState<ListingDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getListingById(id);
      setListing(data);
    } catch (e) {
      console.warn(e);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>Not found</Text>
          <Text style={styles.emptyText}>This listing may have been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeLabel = listing.type === "sale" ? "For Sale" : listing.type === "rental" ? "Rental" : listing.type === "pg" ? "PG" : listing.type;
  const badgeStyle = listing.type === "sale" ? styles.badge_sale : listing.type === "rental" ? styles.badge_rental : styles.badge_pg;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        testID="listing-detail"
        data={[]}
        ListEmptyComponent={
          <View>
            {listing.imageFileId ? (
              <Image source={imagePreviewUrl(listing.imageFileId)} style={styles.heroImage} contentFit="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Feather name="home" size={48} color={colors.brand} />
              </View>
            )}
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
                <View style={[styles.badge, badgeStyle]}>
                  <Text style={styles.badgeText}>{typeLabel}</Text>
                </View>
              </View>

              <Text style={styles.price}>₹{Math.round(listing.price).toLocaleString("en-IN")}</Text>
              <View style={styles.locRow}>
                <Feather name="map-pin" size={13} color={colors.muted} />
                <Text style={styles.locText}>{listing.locality || listing.city}</Text>
              </View>

              {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Property Details</Text>
              </View>
              <View style={styles.detailsGrid}>
                {listing.bedrooms != null && (
                  <View style={styles.detailItem}>
                    <Feather name="bed" size={18} color={colors.brand} />
                    <Text style={styles.detailValue}>{listing.bedrooms}</Text>
                    <Text style={styles.detailLabel}>Bedrooms</Text>
                  </View>
                )}
                {listing.bathrooms != null && (
                  <View style={styles.detailItem}>
                    <Feather name="droplet" size={18} color={colors.brand} />
                    <Text style={styles.detailValue}>{listing.bathrooms}</Text>
                    <Text style={styles.detailLabel}>Bathrooms</Text>
                  </View>
                )}
                {listing.area_sqft != null && (
                  <View style={styles.detailItem}>
                    <Feather name="maximize" size={18} color={colors.brand} />
                    <Text style={styles.detailValue}>{listing.area_sqft}</Text>
                    <Text style={styles.detailLabel}>Sq Ft</Text>
                  </View>
                )}
              </View>

              {listing.address ? (
                <View style={styles.addressBox}>
                  <Feather name="map-pin" size={16} color={colors.muted} />
                  <Text style={styles.addressText}>{listing.address}</Text>
                </View>
              ) : null}

              {(listing.contactPhone || listing.contactEmail) && (
                <View style={styles.contactBox}>
                  <Text style={styles.contactTitle}>Contact Host</Text>
                  <View style={styles.contactRow}>
                    {listing.contactPhone && (
                      <Pressable style={styles.contactBtn}>
                        <Feather name="phone" size={16} color={colors.brand} />
                        <Text style={styles.contactBtnText}>Call</Text>
                      </Pressable>
                    )}
                    {listing.contactEmail && (
                      <Pressable style={styles.contactBtn}>
                        <Feather name="mail" size={16} color={colors.brand} />
                        <Text style={styles.contactBtnText}>Email</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.hostBox}>
                <View style={styles.hostAvatar}>
                  <Text style={styles.hostAvatarText}>{listing.hostName?.[0]?.toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.hostName}>{listing.hostName}</Text>
                  <Text style={styles.hostLabel}>Host</Text>
                </View>
              </View>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", textAlign: "center", marginTop: spacing.md },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  heroImage: { width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.surfaceTertiary },
  heroPlaceholder: { width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.lg },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  title: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.onSurface, lineHeight: 26 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badge_sale: { backgroundColor: colors.brandTertiary },
  badge_rental: { backgroundColor: colors.brandTertiary },
  badge_pg: { backgroundColor: colors.brandTertiary },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.brand, textTransform: "capitalize" },
  price: { fontSize: 22, fontWeight: "800", color: colors.brand, marginTop: spacing.sm },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locText: { fontSize: 13, color: colors.onSurfaceTertiary },
  description: { fontSize: 15, color: colors.onSurface, marginTop: spacing.lg, lineHeight: 22 },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  detailsGrid: { flexDirection: "row", gap: spacing.md },
  detailItem: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  detailValue: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  detailLabel: { fontSize: 11, color: colors.muted },
  addressBox: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.sm,
    marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  addressText: { flex: 1, fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  contactBox: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  contactTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.sm },
  contactRow: { flexDirection: "row", gap: spacing.md },
  contactBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.brandTertiary,
  },
  contactBtnText: { fontSize: 13, fontWeight: "700", color: colors.brand },
  hostBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  hostAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  hostAvatarText: { color: colors.brand, fontWeight: "700", fontSize: 16 },
  hostName: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  hostLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
