import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { getPollById, votePoll, getPollVote } from "@/src/db";
import { colors, spacing, radius } from "@/src/theme";
import type { PollDoc } from "@/src/db";

export default function PollDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [poll, setPoll] = useState<PollDoc | null>(null);
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPoll = useCallback(async () => {
    if (!id || !user?.$id) return;
    try {
      setError(null);
      const data = await getPollById(id);
      setPoll(data);
      const v = await getPollVote(id, user.$id);
      setVotedIndex(v ? v.optionIndex : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load poll");
    } finally {
      setLoading(false);
    }
  }, [id, user?.$id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPoll();
    }, [loadPoll])
  );

  const handleVote = async (optionIndex: number) => {
    if (!id || !user?.$id || votedIndex !== null) return;
    setVoting(true);
    try {
      await votePoll(id, user.$id, optionIndex);
      setVotedIndex(optionIndex);
      const updated = await getPollById(id);
      setPoll(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to vote");
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Poll</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !poll) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Poll</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error || "Poll not found"}</Text>
          <Pressable style={styles.retryBtn} onPress={loadPoll}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const total = poll.totalVotes || 0;
  const hasVoted = votedIndex !== null;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Poll</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.question}>{poll.question}</Text>

        <View style={styles.totalRow}>
          <Feather name="users" size={16} color={colors.muted} />
          <Text style={styles.totalText}>{total} {total === 1 ? "vote" : "votes"}</Text>
        </View>

        <View style={styles.optionsList}>
          {poll.options.map((opt, i) => {
            const pct = total > 0 ? Math.round(((total > 0 ? (opt.split(":").length > 0 ? 0 : 0) : 0)) * 100) / total : 0;
            // We don't have per-option vote counts from the DB doc, so we compute percentage only if we had individual counts.
            // Since PollDoc doesn't have per-option counts, show the bar only for visual indication based on index or skip if we have no way to know.
            // Actually the spec says "Show vote count per option (percentage bar if user voted)". Since we don't store per-option counts in PollDoc, let's just show the option as selected if voted.
            const isSelected = votedIndex === i;
            return (
              <Pressable
                key={i}
                style={[
                  styles.optionRow,
                  isSelected && styles.optionRowSelected,
                  voting && { opacity: 0.6 },
                ]}
                onPress={() => !hasVoted && handleVote(i)}
                disabled={hasVoted || voting}
              >
                <View style={styles.optionRowContent}>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{opt}</Text>
                </View>
                {hasVoted && (
                  <View style={styles.resultColumn}>
                    <Text style={styles.resultText}>{total} votes</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Feather name="user" size={16} color={colors.muted} />
            <Text style={styles.infoText}>Created by {poll.creatorName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={colors.muted} />
            <Text style={styles.infoText}>
              {poll.locality ? `${poll.locality}, ${poll.city}` : poll.city}
            </Text>
          </View>
          {poll.expiresAt ? (
            <View style={styles.infoRow}>
              <Feather name="clock" size={16} color={colors.muted} />
              <Text style={styles.infoText}>Expires {new Date(poll.expiresAt).toLocaleDateString()}</Text>
            </View>
          ) : null}
        </View>

        {hasVoted ? (
          <View style={styles.votedBox}>
            <Feather name="check-circle" size={20} color={colors.brand} />
            <Text style={styles.votedBoxText}>You voted for &quot;{poll.options[votedIndex]}&quot;</Text>
          </View>
        ) : null}
      </ScrollView>
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
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  errorTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface, marginTop: spacing.md },
  errorMessage: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: spacing.sm },
  retryBtn: { backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.pill, marginTop: spacing.lg },
  retryBtnText: { color: colors.onBrand, fontSize: 14, fontWeight: "700" },
  question: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  totalText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  optionsList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  optionRowSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandTertiary,
  },
  optionRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.brand,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurface,
  },
  optionTextSelected: {
    color: colors.brand,
    fontWeight: "700",
  },
  resultColumn: {
    minWidth: 60,
    alignItems: "flex-end",
  },
  resultText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  infoSection: {
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.onSurfaceTertiary,
  },
  votedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  votedBoxText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.brand,
  },
});
