import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import type { MascotMood } from "@/context/AppContext";

const MOOD_COLORS: Record<MascotMood, [string, string]> = {
  happy: ["#00D9C0", "#00A896"],
  excited: ["#7B5CF7", "#4F46E5"],
  concerned: ["#F5A623", "#FF6B35"],
  calm: ["#3B82F6", "#1E40AF"],
  playful: ["#EC4899", "#8B5CF6"],
};

interface MascotWidgetProps {
  mood?: MascotMood;
  size?: number;
}

export function MascotWidget({ mood = "happy", size = 64 }: MascotWidgetProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.07,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.55,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.25,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [pulse, glowOpacity]);

  const [color1, color2] = MOOD_COLORS[mood];

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          width: size + 20,
          height: size + 20,
          transform: [{ scale: pulse }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 28,
            height: size + 28,
            borderRadius: (size + 28) / 2,
            backgroundColor: color1,
            opacity: glowOpacity,
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <LinearGradient
          colors={[color1, color2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
        />
        <Image
          source={require("@/assets/images/mascot.png")}
          style={{ width: size * 0.72, height: size * 0.72 }}
          contentFit="contain"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
  },
  orb: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
