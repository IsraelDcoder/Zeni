import React from "react";
import { View } from "react-native";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";

export function scoreColor(score: number): string {
  if (score >= 80) return "#00D9C0";
  if (score >= 60) return "#7B5CF7";
  if (score >= 40) return "#F5A623";
  return "#FF4757";
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Developing";
  return "Building";
}

interface FinancialScoreRingProps {
  score: number;
  size?: number;
  label?: string;
  strokeWidth?: number;
}

export function FinancialScoreRing({
  score,
  size = 140,
  label,
  strokeWidth = 10,
}: FinancialScoreRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - strokeWidth - 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(score / 100, 1);
  const strokeDash = progress * circumference;
  const color = scoreColor(score);

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${cx},${cy}`}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${strokeDash.toFixed(2)} ${circumference.toFixed(2)}`}
            strokeLinecap="round"
          />
        </G>
        <SvgText
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="white"
          fontSize={size < 100 ? "20" : "28"}
          fontWeight="700"
        >
          {score}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize="11"
          fontWeight="500"
        >
          {label ?? scoreLabel(score)}
        </SvgText>
      </Svg>
    </View>
  );
}
