import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { GlassCard } from "./GlassCard";

interface AIInsightCardProps {
  title: string;
  message: string;
  type?: "info" | "warning" | "success" | "tip";
}

const TYPE_CONFIG = {
  info: { color: "#3B82F6", icon: "info" as const },
  warning: { color: "#F5A623", icon: "alert-triangle" as const },
  success: { color: "#00D9C0", icon: "trending-up" as const },
  tip: { color: "#7B5CF7", icon: "zap" as const },
};

export function AIInsightCard({ title, message, type = "info" }: AIInsightCardProps) {
  const colors = useColors();
  const cfg = TYPE_CONFIG[type];

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: cfg.color + "22" }]}>
          <Feather name={cfg.icon} size={17} color={cfg.color} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.msg, { color: colors.mutedForeground }]}>{message}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2 },
  content: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: "600" },
  msg: { fontSize: 13, lineHeight: 19 },
});
