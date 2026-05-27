import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Transaction, TransactionCategory } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ICONS: Record<TransactionCategory, keyof typeof Feather.glyphMap> = {
  food: "coffee",
  transport: "navigation",
  entertainment: "music",
  utilities: "zap",
  shopping: "shopping-bag",
  health: "heart",
  income: "trending-up",
  education: "book",
  rent: "home",
  betting: "target",
  subscriptions: "repeat",
  transfers: "send",
  other: "circle",
};

const CAT_COLORS: Record<TransactionCategory, string> = {
  food: "#F5A623",
  transport: "#3B82F6",
  entertainment: "#EC4899",
  utilities: "#10B981",
  shopping: "#F43F5E",
  health: "#8B5CF6",
  income: "#00D9C0",
  education: "#3B82F6",
  rent: "#059669",
  betting: "#DC2626",
  subscriptions: "#8B5CF6",
  transfers: "#0EA5E9",
  other: "#6B7280",
};

function fmt(n: number): string {
  return "₦" + n.toLocaleString("en-NG");
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function TransactionItem({ transaction }: { transaction: Transaction }) {
  const colors = useColors();
  const catColor = CAT_COLORS[transaction.category];

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: catColor + "22" }]}>
        <Feather name={ICONS[transaction.category]} size={17} color={catColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.desc, { color: colors.foreground }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {fmtDate(transaction.date)}
          </Text>
          {transaction.isImpulse && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>impulse</Text>
            </View>
          )}
        </View>
      </View>
      <Text
        style={[
          styles.amount,
          { color: transaction.type === "income" ? "#00D9C0" : "#FF6B81" },
        ]}
      >
        {transaction.type === "income" ? "+" : "-"}
        {fmt(transaction.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 3 },
  desc: { fontSize: 14, fontWeight: "500" },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  date: { fontSize: 12 },
  badge: {
    backgroundColor: "#FF475722",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 10, color: "#FF4757", fontWeight: "600" },
  amount: { fontSize: 14, fontWeight: "600" },
});
