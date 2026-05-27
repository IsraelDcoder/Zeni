import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  noPadding?: boolean;
  radius?: number;
}

export function GlassCard({
  children,
  style,
  intensity = 18,
  noPadding = false,
  radius = 20,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.wrapper,
        { borderRadius: radius, borderColor: "rgba(255,255,255,0.1)" },
        style,
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={intensity}
          tint="dark"
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(16, 24, 42, 0.88)", borderRadius: radius },
          ]}
        />
      )}
      <View style={noPadding ? styles.noPad : styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    borderWidth: 1,
  },
  content: {
    padding: 18,
  },
  noPad: {},
});
