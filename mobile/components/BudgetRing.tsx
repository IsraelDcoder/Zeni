import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

interface BudgetRingProps {
  label: string;
  spent: number;
  limit: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
}

function ringColor(pct: number): string {
  if (pct >= 100) return "#FF4757";
  if (pct >= 80) return "#F5A623";
  return "#00D9C0";
}

function fmt(n: number): string {
  if (n >= 1000) return "₦" + (n / 1000).toFixed(0) + "k";
  return "₦" + n;
}

export function BudgetRing({
  label,
  spent,
  limit,
  color,
  size = 80,
  strokeWidth = 7,
}: BudgetRingProps) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const activeColor = color ?? ringColor(pct);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - strokeWidth - 2;
  const circumference = 2 * Math.PI * r;
  const strokeDash = (pct / 100) * circumference;

  return (
    <View style={styles.wrap}>
      <View style={styles.ringWrap}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${cx},${cy}`}>
            <Circle
              cx={cx} cy={cy} r={r}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={cx} cy={cy} r={r}
              stroke={activeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${strokeDash.toFixed(2)} ${circumference.toFixed(2)}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.pctText, { color: activeColor }]}>
            {Math.round(pct)}%
          </Text>
        </View>
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={styles.sub}>{fmt(spent)} / {fmt(limit)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 5 },
  ringWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  pctText: { fontSize: 13, fontWeight: "700" },
  label: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "600", textAlign: "center", width: 80 },
  sub: { fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", width: 80 },
});
