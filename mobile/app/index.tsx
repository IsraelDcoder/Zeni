import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 11,
          stiffness: 90,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        delay: 100,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        delay: 100,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: connections } = await supabase
              .from("bank_connections")
              .select("id")
              .eq("user_id", session.user.id)
              .limit(1);
            if (!connections || connections.length === 0) {
              router.replace("/bank-connect");
            } else {
              router.replace("/(tabs)");
            }
            return;
          }
          const onboarded = await AsyncStorage.getItem("onboardingComplete");
          if (onboarded) {
            router.replace("/auth");
          } else {
            router.replace("/onboarding");
          }
        } else {
          const profileData = await AsyncStorage.getItem("profile");
          if (profileData) {
            router.replace("/(tabs)");
          } else {
            router.replace("/onboarding");
          }
        }
      } catch {
        router.replace("/onboarding");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [logoScale, logoOpacity, taglineOpacity, subtitleOpacity]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Platform.OS === "web" ? 67 : insets.top },
      ]}
    >
      <LinearGradient
        colors={["#070D1A", "#0A1528", "#050A14"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoBox}>
            <LinearGradient
              colors={["#00D9C0", "#7B5CF7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGrad}
            >
              <Text style={styles.logoLetter}>Z</Text>
            </LinearGradient>
          </View>
          <Text style={styles.appName}>ZENI</Text>
        </Animated.View>

        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Control your money before{"\n"}it controls you.
        </Animated.Text>
      </View>

      <Animated.Text
        style={[
          styles.footer,
          {
            opacity: subtitleOpacity,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 28,
          },
        ]}
      >
        AI FINANCIAL OPERATING SYSTEM
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070D1A",
    alignItems: "center",
    justifyContent: "center",
  },
  orb1: {
    position: "absolute", width: 320, height: 320, borderRadius: 160,
    backgroundColor: "#00D9C012", top: -100, left: -120,
  },
  orb2: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    backgroundColor: "#7B5CF712", bottom: 80, right: -70,
  },
  orb3: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    backgroundColor: "#F5A62308", bottom: -40, left: 10,
  },
  center: {
    alignItems: "center", gap: 28,
    flex: 1, justifyContent: "center",
  },
  logoWrap: { alignItems: "center", gap: 14 },
  logoBox: {
    width: 76, height: 76, borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#00D9C0", shadowRadius: 28, shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
  },
  logoGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoLetter: { fontSize: 38, fontWeight: "800", color: "#FFFFFF" },
  appName: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", letterSpacing: 10 },
  tagline: {
    fontSize: 17, color: "rgba(255,255,255,0.5)",
    textAlign: "center", lineHeight: 26, paddingHorizontal: 40,
  },
  footer: { fontSize: 10, letterSpacing: 4, color: "rgba(255,255,255,0.2)" },
});
