import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import {
  getBusinessById,
  listReviews,
  createReview,
  getUserReviewForBusiness,
} from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";
import type { BusinessDoc, ReviewDoc } from "@/src/db";

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile, user } = useAuth();
  const [business, setBusiness] = useState<BusinessDoc | null>(null);
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myReview, setMyReview] = useState<ReviewDoc | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const businessId = id || "";

  const categoryIcon = useMemo(() => {
    if (!business) return "briefcase";
    switch (business.category) {
      case "Restaurant":
        return "coffee";
      case "Cafe":
        return "coffee";
      case "Plumber":
        return "tool";
      case "Electrician":
        return "zap";
      case "Cleaner":
        return "refresh-cw";
      case "Tutor":
        return "book-open";
      default:
        return "briefcase";
    }
  }, [business]);

  const loadData = useCallback(async () => {
    if (!businessId) return;
    try {
      setError(null);
      const [bizData, reviewsData] = await Promise.all([
        getBusinessById(businessId),
        listReviews(businessId),
      ]);
      setBusiness(bizData);
      setReviews(reviewsData);
      if (bizData && user) {
        const mine = await getUserReviewForBusiness(user.$id, businessId);
        setMyReview(mine);
        if (mine) {
          setReviewRating(mine.rating);
          setReviewComment(mine.comment || "");
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load business");
    } finally {
      setLoading(false);
    }
  }, [businessId, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSubmitReview = useCallback(async () => {
    if (!business || !profile || !user) return;
    if (!reviewComment.trim()) {
      Alert.alert("Required", "Please write a comment for your review.");
      return;
    }
    setSubmittingReview(true);
    try {
      if (myReview) {
        await createReview({
          ...myReview,
          rating: reviewRating,
          comment: reviewComment.trim(),
        });
      } else {
        await createReview({
          businessId: business.$id,
          userId: user.$id,
          userName: profile.name,
          rating: reviewRating,
          comment: reviewComment.trim(),
          city: business.city,
        });
      }
      const updatedReviews = await listReviews(business.$id);
      setReviews(updatedReviews);
      const updatedMine = await getUserReviewForBusiness(user.$id, business.$id);
      setMyReview(updatedMine);
      if (!updatedMine) {
        setReviewComment("");
        setReviewRating(5);
      }
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  }, [business, profile, user, reviewRating, reviewComment, myReview]);

  const renderStars = (rating: number, size = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Feather
          key={i}
          name="star"
          size={size}
          color={i <= Math.round(rating) ? "#B58500" : colors.borderStrong}
        />
      );
    }
    return stars;
  };

  const renderReview = ({ item }: { item: ReviewDoc }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Feather name="user" size={14} color={colors.brand} />
        </View>
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewAuthor}>{item.userName}</Text>
          <View style={styles.reviewStarsRow}>{renderStars(item.rating, 12)}</View>
        </View>
        <Text style={styles.reviewDate}>
          {new Date(item.$createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      </View>
      {item.comment ? <Text style={styles.reviewComment}>{item.comment}</Text> : null}
      {item.userId === user?.$id && (
        <Text style={styles.myReviewLabel}>Your review</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !business) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Business</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>{error || "Business not found"}</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{business.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.businessCard}>
          <View style={styles.businessTopRow}>
            <View style={styles.businessIconLarge}>
              <Feather name={categoryIcon as any} size={28} color={colors.brand} />
            </View>
            <View style={styles.businessTitleCol}>
              <View style={styles.businessTitleRow}>
                <Text style={styles.businessNameLarge}>{business.name}</Text>
                {business.verified && (
                  <View style={styles.verifiedBadgeLarge}>
                    <Feather name="check-circle" size={16} color={colors.brand} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{business.category}</Text>
              </View>
            </View>
          </View>

          <View style={styles.ratingBlock}>
            <View style={styles.starsRowLarge}>{renderStars(business.rating, 18)}</View>
            <Text style={styles.ratingValue}>
              {business.rating.toFixed(1)} · {business.reviewCount || 0} reviews
            </Text>
          </View>

          {(business.address || business.locality) && (
            <View style={styles.detailRow}>
              <Feather name="map-pin" size={16} color={colors.muted} />
              <Text style={styles.detailText}>
                {[business.address, business.locality, business.city].filter(Boolean).join(", ")}
              </Text>
            </View>
          )}

          {business.phone && (
            <View style={styles.detailRow}>
              <Feather name="phone" size={16} color={colors.muted} />
              <Text style={styles.detailText}>{business.phone}</Text>
            </View>
          )}

          {business.website && (
            <View style={styles.detailRow}>
              <Feather name="globe" size={16} color={colors.muted} />
              <Text style={[styles.detailText, styles.linkText]}>{business.website}</Text>
            </View>
          )}

          {business.description && (
            <Text style={styles.descriptionText}>{business.description}</Text>
          )}
        </View>

        <View style={styles.reviewsSection}>
          <Text style={styles.reviewsSectionTitle}>
            Reviews ({reviews.length + (myReview && !reviews.find((r) => r.$id === myReview.$id) ? 1 : 0)})
          </Text>

          {profile && user && (
            <View style={styles.writeReviewCard}>
              <Text style={styles.writeReviewLabel}>
                {myReview ? "Edit your review" : "Write a review"}
              </Text>
              <View style={styles.ratingSelector}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setReviewRating(star)}>
                    <Feather
                      name="star"
                      size={24}
                      color={star <= reviewRating ? "#B58500" : colors.borderStrong}
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your experience..."
                placeholderTextColor={colors.muted}
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
              />
              <Pressable
                style={[styles.submitReviewBtn, (!reviewComment.trim() || submittingReview) && { opacity: 0.4 }]}
                onPress={handleSubmitReview}
                disabled={!reviewComment.trim() || submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Text style={styles.submitReviewBtnText}>{myReview ? "Update" : "Submit"}</Text>
                )}
              </Pressable>
            </View>
          )}

          <FlatList
            data={reviews}
            keyExtractor={(item) => item.$id}
            renderItem={renderReview}
            contentContainerStyle={[styles.reviewsList, reviews.length === 0 && styles.emptyReviewsList]}
            ListEmptyComponent={
              <View style={styles.emptyReviewsContainer}>
                <Feather name="message-square" size={32} color={colors.muted} />
                <Text style={styles.emptyReviewsText}>No reviews yet. Be the first!</Text>
              </View>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
            }
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  errorTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface, marginTop: spacing.md },
  backBtn: { backgroundColor: colors.brand, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, marginTop: spacing.md },
  backBtnText: { color: colors.onBrand, fontSize: 14, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  businessCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  businessTopRow: { flexDirection: "row", gap: spacing.md },
  businessIconLarge: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  businessTitleCol: { flex: 1 },
  businessTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  businessNameLarge: { fontSize: 20, fontWeight: "800", color: colors.onSurface, flex: 1 },
  verifiedBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
  },
  verifiedText: { fontSize: 10, fontWeight: "700", color: colors.brand },
  categoryTag: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    marginTop: spacing.xs,
  },
  categoryTagText: { fontSize: 11, fontWeight: "700", color: colors.brand, textTransform: "capitalize" },
  ratingBlock: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  starsRowLarge: { flexDirection: "row", gap: 2 },
  ratingValue: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceTertiary },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detailText: { flex: 1, fontSize: 14, color: colors.onSurfaceTertiary, lineHeight: 20 },
  linkText: { color: colors.brand },
  descriptionText: { fontSize: 14, color: colors.onSurfaceTertiary, lineHeight: 20, marginTop: spacing.sm },
  reviewsSection: { marginTop: spacing.xl },
  reviewsSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  writeReviewCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  writeReviewLabel: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  ratingSelector: { flexDirection: "row", gap: spacing.sm },
  reviewInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 14,
    color: colors.onSurface,
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitReviewBtn: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  submitReviewBtnText: { color: colors.onBrand, fontSize: 14, fontWeight: "700" },
  reviewsList: { gap: spacing.md },
  emptyReviewsList: { flex: 1 },
  reviewCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewMeta: { flex: 1 },
  reviewAuthor: { fontSize: 14, fontWeight: "600", color: colors.onSurface },
  reviewStarsRow: { flexDirection: "row", gap: 1, marginTop: 2 },
  reviewDate: { fontSize: 11, color: colors.muted },
  reviewComment: { fontSize: 14, color: colors.onSurfaceTertiary, lineHeight: 20 },
  myReviewLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  emptyReviewsContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyReviewsText: { fontSize: 14, color: colors.muted },
});
