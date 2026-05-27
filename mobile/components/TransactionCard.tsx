import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Transaction } from "@/context/AppContext";
import { getCategoryMeta } from "@/lib/categorization";

interface Props {
  transaction: Transaction;
  aiNote?: string | null;
  onPress?: () => void;
  compact?: boolean;
}

function formatAmount(n: number): string {
  if (n >= 1000000) return "₦" + (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return "₦" + (n / 1000).toFixed(1) + "k";
  return "₦" + n.toLocaleString("en-NG");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

export function TransactionCard({ transaction, aiNote, onPress, compact = false }: Props) {
  const meta = getCategoryMeta(transaction.category);
  const isExpense = transaction.type === "expense";

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      {/* Left accent bar */}
      <View style={[styles.accent, { backgroundColor: meta.color }]} />

      {/* Category icon */}
      <View style={[styles.iconWrap, { backgroundColor: meta.bgColor, borderColor: meta.color + "40" }]}>
        <Text style={styles.iconEmoji}>{meta.emoji}</Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.topRow}>
          <Text style={styles.description} numberOfLines={1}>{transaction.description}</Text>
          <Text style={[styles.amount, { color: isExpense ? "#FF6B7A" : "#00D9C0" }]}>
            {isExpense ? "–" : "+"}{formatAmount(transaction.amount)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={[styles.catBadge, { backgroundColor: meta.bgColor, borderColor: meta.color + "30" }]}>
            <Text style={[styles.catBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(transaction.date)}</Text>
        </View>

        {/* AI Note */}
        {aiNote && !compact && (
          <View style={styles.aiNoteRow}>
            <Feather name="cpu" size={10} color="#00D9C0" />
            <Text style={styles.aiNoteText}>{aiNote}</Text>
          </View>
        )}

        {/* Impulse badge */}
        {transaction.isImpulse && !compact && (
          <View style={styles.impulseBadge}>
            <Feather name="zap" size={9} color="#EC4899" />
            <Text style={styles.impulseText}>Impulse</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginBottom: 8,
  },
  cardCompact: { marginBottom: 0 },
  accent: { width: 3, alignSelf: "stretch" },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    marginHorizontal: 12, borderWidth: 1,
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 20 },
  details: { flex: 1, paddingVertical: 12, paddingRight: 14, gap: 4 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  description: { fontSize: 14, fontWeight: "600", color: "#fff", flex: 1 },
  amount: { fontSize: 15, fontWeight: "700", flexShrink: 0 },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  catBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  dateText: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  aiNoteRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 2,
  },
  aiNoteText: { fontSize: 11, color: "#00D9C0", flex: 1 },
  impulseBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    alignSelf: "flex-start", marginTop: 2,
    backgroundColor: "rgba(236,72,153,0.12)", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: "rgba(236,72,153,0.25)",
  },
  impulseText: { fontSize: 9, color: "#EC4899", fontWeight: "700", textTransform: "uppercase" },
});
