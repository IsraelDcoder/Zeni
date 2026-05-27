import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface SpendingDonutProps {
  segments: Segment[];
  size?: number;
  total: number;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  ir: number,
  start: number,
  end: number
): string {
  const os = polar(cx, cy, r, start);
  const oe = polar(cx, cy, r, end);
  const is_ = polar(cx, cy, ir, end);
  const ie = polar(cx, cy, ir, start);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${os.x.toFixed(2)} ${os.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${large} 1 ${oe.x.toFixed(2)} ${oe.y.toFixed(2)}`,
    `L ${is_.x.toFixed(2)} ${is_.y.toFixed(2)}`,
    `A ${ir} ${ir} 0 ${large} 0 ${ie.x.toFixed(2)} ${ie.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function SpendingDonut({ segments, size = 180, total }: SpendingDonutProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const ir = r - 36;

  let current = 0;
  const paths = segments
    .filter((s) => s.value > 0 && total > 0)
    .map((s) => {
      const sweep = (s.value / total) * 354;
      const start = current;
      const end = current + sweep;
      current = end + 2;
      return { ...s, d: arcPath(cx, cy, r, ir, start, end) };
    });

  return (
    <View>
      <Svg width={size} height={size}>
        {paths.map((p, i) => (
          <Path key={i} d={p.d} fill={p.color} />
        ))}
      </Svg>
    </View>
  );
}
