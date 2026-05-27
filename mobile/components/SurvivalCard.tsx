import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SurvivalReport } from "@/context/AppContext";

interface Props {
  report: SurvivalReport;
}

const STATUS_CONFIG = {
  safe: {
    bg: ["rgba(0,217,192,0.12)", "rgba(0,217,192,0.04)"] as [string, string],
    border: "rgba(0,217,192,0.25)",
    icon: "shield" as const,
    iconColor: "#00D9C0",
    label: "Financially Safe",
    labelColor: "#00D9C0",
  },
  warning: {
    bg: ["rgba(245,166,35,0.14)", "rgba(245,166,35,0.04)"] as [string, string],
    border: "rgba(245,166,35,0.3)",
    icon: "alert-triangle" as const,
    iconColor: "#F5A623",
    label: "Approaching Limit",
    labelColor: "#F5A623",
  },
  critical: {
    bg: ["rgba(255,71,87,0.14)", "rgba(255,71,87,0.04)"] as [string, string],
    border: "rgba(255,71,87,0.3)",
    icon: "alert-octagon" as const,
    iconColor: "#FF4757",
    label: "Critical — Act Now",
    labelColor: "#FF4757",
  },
};

export function SurvivalCard({ report }: Props) {
  const cfg = STATUS_CONFIG[report.status];

  return (
    <View style={[styles.card, { borderColor: cfg.border }]}>
      <LinearGradient
        colors={cfg.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.iconColor + "22" }]}>
          <Feather name={cfg.icon} size={18} color={cfg.iconColor} />
        </View>
        <View style={styles.info}>
          <View style={styles.labelRow}>
            <Text style={[styles.status, { color: cfg.labelColor }]}>{cfg.label}</Text>
            <View style={[styles.dot, { backgroundColor: cfg.iconColor }]} />
          </View>
          <Text style={styles.message}>{report.message}</Text>
        </View>
        <View style={styles.daysBox}>
          <Text style={[styles.daysNum, { color: cfg.iconColor }]}>
            {report.daysLeft}
          </Text>
          <Text style={styles.daysSub}>days</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.meta}>
          <Feather name="activity" size={11} color="rgba(255,255,255,0.4)" />
          <Text style={styles.metaText}>
            ₦{report.dailyBurnRate.toLocaleString("en-NG")}/day burn rate
          </Text>
        </View>
        {report.projectedShortfall > 0 && (
          <View style={styles.meta}>
            <Feather name="trending-down" size={11} color="#FF4757" />
            <Text style={[styles.metaText, { color: "#FF4757" }]}>
              ₦{report.projectedShortfall.toLocaleString("en-NG")} shortfall risk
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    marginBottom: 14,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginTop: 2,
  },
  info: { flex: 1, gap: 4 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  status: { fontSize: 13, fontWeight: "700" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  message: { fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 17 },
  daysBox: { alignItems: "center", minWidth: 44 },
  daysNum: { fontSize: 26, fontWeight: "800", lineHeight: 30 },
  daysSub: { fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  metaRow: { flexDirection: "row", gap: 16 },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
});
