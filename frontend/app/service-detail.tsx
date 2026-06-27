import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { databases, DB, COL, Query } from "@/src/appwrite";
import { listReviews, createReview, ServiceDoc, ReviewDoc, imagePreviewUrl } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [service, setService] = useState<ServiceDoc | null>(null);
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadService = useCallback(async () => {
    if (!id) return;
    try {
      const doc = await databases.getDocument({
        databaseId: DB,
        collectionId: COL.services,
        documentId: id,
      });
      setService(doc as unknown as ServiceDoc);
    } catch (e) {
      console.warn("Failed to load service detail:", e);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    if (!id) return;
    try {
      const data = await listReviews(id);
      setReviews(data);
    } catch (e) {
      console.warn(e);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      await Promise.all([loadService(), loadReviews()]);
      setLoading(false);
    })();
  }, [loadService]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadService(), loadReviews()]);
    setRefreshing(false);
  };

  const submitReview = async () => {
    if (!profile || !service || !comment.trim()) return;
    setSubmitting(true);
    try {
      const review = await createReview({
        businessId: service.$id,
        userId: profile.userId,
        userName: profile.name,
        rating,
        comment: comment.trim(),
        city: profile.city!,
      });
      setReviews((prev) => [review, ...prev]);
      setShowReviewModal(false);
      setComment("");
      setRating(5);
    } catch (e) {
      console.warn(e);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (r: number, interactive = false) => {
    return (
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable
            key={i}
            disabled={!interactive}
            onPress={() => interactive && setRating(i)}
          >
            <Feather
              name="star"
              size={interactive ? 24 : 16}
              color={i <= r ? colors.warning : colors.border}
            />
          </Pressable>
        ))}
      </View>
    );
  };

  const renderReview = ({ item }: { item: ReviewDoc }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>{item.userName[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewName}>{item.userName}</Text>
          <View style={{ flexDirection: "row", gap: 2 }}>
            {renderStars(item.rating)}
          </View>
        </View>
        <Text style={styles.reviewTime}>{timeAgo(item.$createdAt)}</Text>
      </View>
      {item.comment ? (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Service Detail</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Service Detail</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Service not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const hasImage = !!service.imageFileId;
  const previewUrl = hasImage
    ? imagePreviewUrl(service.imageFileId!)
    : null;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Service Detail</Text>
        <Pressable onPress={() => setShowReviewModal(true)} style={styles.reviewBtn}>
          <Feather name="star" size={18} color={colors.brand} />
          <Text style={styles.reviewBtnText}>Review</Text>
        </Pressable>
      </View>

      <FlatList
        testID="service-detail-scroll"
        data={reviews}
        keyExtractor={(r) => r.$id}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        ListHeaderComponent={
          <View>
            {hasImage && previewUrl ? (
              <Image source={{ uri: previewUrl }} style={styles.heroImage} contentFit="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Feather name="tool" size={48} color={colors.muted} />
              </View>
            )}

            <View style={styles.body}>
              <View style={styles.nameRow}>
                <Text style={styles.providerName}>{service.providerName}</Text>
                {service.verified && (
                  <Feather name="check-circle" size={20} color={colors.brand} />
                )}
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{service.serviceType}</Text>
                </View>
              </View>

              {service.description ? (
                <Text style={styles.description}>{service.description}</Text>
              ) : null}

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {renderStars(service.rating)}
                  </View>
                  <Text style={styles.statNum}>{service.rating.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>
                    {service.reviewCount} {service.reviewCount === 1 ? "review" : "reviews"}
                  </Text>
                </View>
                {service.hourlyRate != null && (
                  <View style={styles.statBox}>
                    <Text style={styles.statPrice}>₹{service.hourlyRate}</Text>
                    <Text style={styles.statLabel}>per hour</Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionDivider} />

              <Text style={styles.sectionTitle}>Contact</Text>
              <View style={styles.contactRow}>
                {service.phone ? (
                  <View style={styles.contactItem}>
                    <Feather name="phone" size={16} color={colors.brand} />
                    <Text style={styles.contactText}>{service.phone}</Text>
                  </View>
                ) : null}
                {service.email ? (
                  <View style={styles.contactItem}>
                    <Feather name="mail" size={16} color={colors.brand} />
                    <Text style={styles.contactText}>{service.email}</Text>
                  </View>
                ) : null}
                {service.locality ? (
                  <View style={styles.contactItem}>
                    <Feather name="map-pin" size={16} color={colors.brand} />
                    <Text style={styles.contactText}>{service.locality}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.sectionDivider} />

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
                <Pressable onPress={() => setShowReviewModal(true)}>
                  <Text style={styles.writeReview}>Write a review</Text>
                </Pressable>
              </View>
            </View>
          </View>
        }
        renderItem={renderReview}
        ListEmptyComponent={
          <View style={styles.emptyRow}>
            <Feather name="message-circle" size={32} color={colors.muted} />
            <Text style={styles.emptyText}>No reviews yet. Be the first to review!</Text>
            <Pressable style={styles.writeBtn} onPress={() => setShowReviewModal(true)}>
              <Text style={styles.writeBtnText}>Write a Review</Text>
            </Pressable>
          </View>
        }
      />

      <Modal visible={showReviewModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalRoot} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowReviewModal(false)} hitSlop={10}>
              <Feather name="x" size={24} color={colors.onSurface} />
            </Pressable>
            <Text style={styles.modalTitle}>Write a Review</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <Text style={styles.modalLabel}>Rating</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {renderStars(rating, true)}
            </View>
            <Text style={styles.modalLabel}>Your review</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Share your experience…"
              placeholderTextColor={colors.muted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
            />
            <Pressable
              style={[styles.submitBtn, (!comment.trim() || submitting) && { opacity: 0.5 }]}
              onPress={submitReview}
              disabled={!comment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review</Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  reviewBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  reviewBtnText: { fontSize: 14, fontWeight: "600", color: colors.brand },
  heroImage: { width: "100%", height: 240, backgroundColor: colors.surfaceTertiary },
  heroPlaceholder: {
    width: "100%", height: 160, backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
  },
  body: { padding: spacing.lg, gap: spacing.sm },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  providerName: { fontSize: 20, fontWeight: "800", color: colors.onSurface, flex: 1 },
  badgeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  typeBadge: {
    backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.md,
    paddingVertical: 4, borderRadius: radius.pill,
  },
  typeBadgeText: { fontSize: 13, fontWeight: "600", color: colors.brand },
  description: { fontSize: 14, color: colors.onSurfaceTertiary, lineHeight: 20, marginTop: spacing.xs },
  statsRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
  statBox: { gap: 2 },
  statNum: { fontSize: 16, fontWeight: "700", color: colors.onSurface, marginTop: 4 },
  statLabel: { fontSize: 12, color: colors.muted },
  statPrice: { fontSize: 20, fontWeight: "800", color: colors.brand },
  sectionDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: spacing.sm },
  contactRow: { gap: spacing.md },
  contactItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  contactText: { fontSize: 14, color: colors.onSurface },
  errorTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  backBtn: {
    backgroundColor: colors.brand, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: radius.pill,
  },
  backBtnText: { color: colors.onBrand, fontSize: 14, fontWeight: "600" },
  reviewCard: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm,
  },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  reviewAvatarText: { fontSize: 16, fontWeight: "700", color: colors.brand },
  reviewName: { fontSize: 14, fontWeight: "600", color: colors.onSurface },
  reviewTime: { fontSize: 12, color: colors.muted },
  writeReview: { fontSize: 14, fontWeight: "600", color: colors.brand },
  starsText: { fontSize: 12, color: colors.warning, letterSpacing: -1 },
  reviewComment: { fontSize: 14, color: colors.onSurfaceTertiary, lineHeight: 20, marginTop: 4 },
  emptyRow: { alignItems: "center", padding: spacing.xxxl, gap: spacing.md },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: "center" },
  writeBtn: {
    backgroundColor: colors.brand, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: radius.pill,
  },
  writeBtnText: { color: colors.onBrand, fontSize: 14, fontWeight: "700" },
  modalRoot: { flex: 1, backgroundColor: colors.surface },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  modalLabel: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary },
  textArea: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    fontSize: 15, color: colors.onSurface, textAlignVertical: "top",
    minHeight: 100,
  },
  submitBtn: {
    backgroundColor: colors.brand, paddingVertical: spacing.md,
    borderRadius: radius.pill, alignItems: "center",
  },
  submitBtnText: { color: colors.onBrand, fontSize: 15, fontWeight: "700" },
});
