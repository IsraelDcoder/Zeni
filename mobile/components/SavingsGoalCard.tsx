import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SavingsGoal } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "./GlassCard";

function fmt(n: number): string {
  if (n >= 1000000) return "₦" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "₦" + (n / 1000).toFixed(0) + "k";
  return "₦" + n;
}

export function SavingsGoalCard({ goal }: { goal: SavingsGoal }) {
  const colors = useColors();
  const pct = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.emojiWrap, { backgroundColor: goal.color + "22" }]}>
          <Text style={styles.emoji}>{goal.emoji}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{goal.name}</Text>
          <Text style={[styles.amounts, { color: colors.mutedForeground }]}>
            {fmt(goal.currentAmount)} of {fmt(goal.targetAmount)}
          </Text>
        </View>
        <Text style={[styles.pct, { color: goal.color }]}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: goal.color }]} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  emojiWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 20 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: "600" },
  amounts: { fontSize: 12 },
  pct: { fontSize: 18, fontWeight: "700" },
  track: { height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)" },
  fill: { height: "100%", borderRadius: 3 },
});
