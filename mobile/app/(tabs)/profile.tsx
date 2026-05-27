import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FinancialScoreRing, scoreColor, scoreLabel } from "@/components/FinancialScoreRing";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface SubScore {
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={{ flex: 1, height: 5, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${value}%` as any, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

const ACHIEVEMENTS = [
  { title: "First Save", desc: "Made your first saving", icon: "star" as const, color: "#F5A623", unlocked: true },
  { title: "7-Day Streak", desc: "7 days of tracking", icon: "zap" as const, color: "#00D9C0", unlocked: true },
  { title: "Goal Setter", desc: "Created 3 saving goals", icon: "target" as const, color: "#7B5CF7", unlocked: true },
  { title: "Impulse Buster", desc: "Avoided 5 impulse buys", icon: "shield" as const, color: "#EC4899", unlocked: false },
  { title: "₦500k Saved", desc: "Reached half a million", icon: "award" as const, color: "#F5A623", unlocked: false },
  { title: "Budget Master", desc: "Under budget 3 months", icon: "trending-up" as const, color: "#10B981", unlocked: false },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { profile, financialScore, totalIncome, totalExpenses, savingsGoals } = useApp();
  const { user, signOut, isConfigured } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const subScores: SubScore[] = [
    { label: "Spending Discipline", value: Math.max(20, financialScore - 7), icon: "shield" },
    { label: "Saving Consistency", value: Math.max(20, financialScore - 13), icon: "trending-up" },
    { label: "Income Health", value: Math.min(100, financialScore + 14), icon: "dollar-sign" },
    { label: "Money Stability", value: Math.max(20, financialScore + 6), icon: "anchor" },
    { label: "Financial Momentum", value: financialScore, icon: "activity" },
  ];

  const initials = profile?.name
    ? profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "ZN";

  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#070D1A", "#091220", "#070D1A"]} style={StyleSheet.absoluteFill} />
      <View style={styles.violetOrb} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profile</Text>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => router.push("/settings")}
          >
            <Feather name="settings" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Profile Card */}
        <GlassCard style={styles.profileCard} noPadding>
          <LinearGradient
            colors={["rgba(123,92,247,0.15)", "rgba(0,217,192,0.08)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.profilePad}>
            <TouchableOpacity onPress={() => router.push("/settings")} style={styles.avatarWrap}>
              <LinearGradient
                colors={["#00D9C0", "#7B5CF7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
              <View style={styles.editBadge}>
                <Feather name="edit-2" size={10} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {profile?.name ?? "Zeni User"}
            </Text>
            {user?.email && (
              <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
                {user.email}
              </Text>
            )}
            <View style={styles.personalityBadge}>
              <Text style={styles.personalityText}>
                {profile?.financialPersonality ?? "Financial Explorer"}
              </Text>
            </View>
            <View style={styles.statsStrip}>
              {[
                { label: "Income", value: "₦" + (totalIncome / 1000).toFixed(0) + "k" },
                { label: "Saved", value: "₦" + (totalSaved / 1000).toFixed(0) + "k" },
                { label: "Goals", value: savingsGoals.length.toString() },
              ].map((s) => (
                <View key={s.label} style={styles.stripItem}>
                  <Text style={[styles.stripNum, { color: colors.foreground }]}>{s.value}</Text>
                  <Text style={[styles.stripLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Bank / Auth status */}
            <View style={styles.statusRow}>
              {isConfigured && user ? (
                <View style={styles.statusPill}>
                  <View style={[styles.statusDot, { backgroundColor: "#00D9C0" }]} />
                  <Text style={styles.statusText}>Cloud synced</Text>
                </View>
              ) : (
                <Pressable style={[styles.statusPill, { backgroundColor: "#F5A62315", borderColor: "#F5A62330" }]}
                  onPress={() => router.push("/auth")}>
                  <Feather name="cloud-off" size={11} color="#F5A623" />
                  <Text style={[styles.statusText, { color: "#F5A623" }]}>Sign in to sync</Text>
                </Pressable>
              )}
              <Pressable style={[styles.statusPill, { backgroundColor: "#7B5CF715", borderColor: "#7B5CF730" }]}
                onPress={() => router.push("/bank-connect")}>
                <Feather name="link" size={11} color="#7B5CF7" />
                <Text style={[styles.statusText, { color: "#7B5CF7" }]}>Connect bank</Text>
              </Pressable>
            </View>
          </View>
        </GlassCard>

        {/* Financial Score */}
        <GlassCard style={styles.scoreCard}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Financial Score</Text>
          <View style={styles.scoreRow}>
            <FinancialScoreRing score={financialScore} size={130} />
            <View style={styles.scoreRight}>
              <Text style={[styles.scoreLevel, { color: scoreColor(financialScore) }]}>
                {scoreLabel(financialScore)}
              </Text>
              <Text style={[styles.scoreDesc, { color: colors.mutedForeground }]}>
                Your score measures spending discipline, saving consistency, income health, and financial momentum.
              </Text>
            </View>
          </View>

          <View style={{ gap: 12, marginTop: 16 }}>
            {subScores.map((s) => (
              <View key={s.label} style={styles.subScoreRow}>
                <Feather name={s.icon} size={14} color={scoreColor(s.value)} style={{ width: 18 }} />
                <Text style={[styles.subScoreLabel, { color: colors.foreground }]}>{s.label}</Text>
                <MiniBar value={s.value} color={scoreColor(s.value)} />
                <Text style={[styles.subScoreNum, { color: scoreColor(s.value) }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Achievements */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Text>
        <View style={styles.achievementsGrid}>
          {ACHIEVEMENTS.map((a) => (
            <GlassCard
              key={a.title}
              style={[styles.achieveCard, !a.unlocked ? styles.achieveCardLocked : undefined]}
              noPadding
            >
              <View style={styles.achievePad}>
                <View
                  style={[
                    styles.achieveIcon,
                    { backgroundColor: a.unlocked ? a.color + "22" : "rgba(255,255,255,0.05)" },
                  ]}
                >
                  <Feather
                    name={a.unlocked ? a.icon : "lock"}
                    size={20}
                    color={a.unlocked ? a.color : "rgba(255,255,255,0.2)"}
                  />
                </View>
                <Text
                  style={[
                    styles.achieveTitle,
                    { color: a.unlocked ? colors.foreground : "rgba(255,255,255,0.3)" },
                  ]}
                  numberOfLines={1}
                >
                  {a.title}
                </Text>
                <Text
                  style={[styles.achieveDesc, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {a.desc}
                </Text>
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Quick Actions</Text>
        <GlassCard noPadding style={{ marginBottom: 16 }}>
          {[
            { label: "Settings", icon: "settings" as const, value: "", onPress: () => router.push("/settings") },
            { label: "Connect Bank", icon: "link" as const, value: "", onPress: () => router.push("/bank-connect") },
            { label: "Premium Plan", icon: "star" as const, value: "Upgrade", accent: true, onPress: () => {} },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.settingRow,
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
              ]}
              onPress={item.onPress}
            >
              <View style={[styles.settingIcon, { backgroundColor: item.accent ? "#F5A62322" : "rgba(255,255,255,0.06)" }]}>
                <Feather name={item.icon} size={16} color={item.accent ? "#F5A623" : "rgba(255,255,255,0.6)"} />
              </View>
              <Text style={[styles.settingLabel, { color: item.accent ? "#F5A623" : colors.foreground }]}>
                {item.label}
              </Text>
              <View style={{ flex: 1 }} />
              {item.value ? (
                <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{item.value}</Text>
              ) : null}
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          ))}
        </GlassCard>

        {/* Sign Out */}
        {(user || !isConfigured) && (
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={user ? handleSignOut : () => router.push("/auth")}
          >
            <Feather name={user ? "log-out" : "log-in"} size={16} color="#FF4757" />
            <Text style={styles.signOutText}>
              {user ? "Sign Out" : "Sign In"}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.version, { color: colors.mutedForeground }]}>Zeni v1.0 · AI Financial OS</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  violetOrb: {
    position: "absolute", width: 260, height: 260, borderRadius: 130,
    backgroundColor: "#7B5CF70A", top: -60, right: -80,
  },
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20,
  },
  pageTitle: { fontSize: 28, fontWeight: "800" },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  scroll: { paddingHorizontal: 20 },
  profileCard: { marginBottom: 16 },
  profilePad: { padding: 24, alignItems: "center" },
  avatarWrap: { marginBottom: 14, position: "relative" },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 26, fontWeight: "800", color: "#FFFFFF" },
  editBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#7B5CF7", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#070D1A",
  },
  profileName: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  profileEmail: { fontSize: 13, marginBottom: 8 },
  personalityBadge: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 100,
    backgroundColor: "rgba(0,217,192,0.12)", borderWidth: 1, borderColor: "rgba(0,217,192,0.3)",
    marginBottom: 20,
  },
  personalityText: { fontSize: 12, color: "#00D9C0", fontWeight: "600" },
  statsStrip: { flexDirection: "row", gap: 24, marginBottom: 16 },
  stripItem: { alignItems: "center", gap: 3 },
  stripNum: { fontSize: 18, fontWeight: "700" },
  stripLabel: { fontSize: 11 },
  statusRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,217,192,0.1)", borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(0,217,192,0.25)",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, color: "#00D9C0", fontWeight: "500" },
  scoreCard: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 4 },
  scoreRight: { flex: 1, gap: 6 },
  scoreLevel: { fontSize: 20, fontWeight: "700" },
  scoreDesc: { fontSize: 12, lineHeight: 18 },
  subScoreRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  subScoreLabel: { fontSize: 12, fontWeight: "500", width: 130 },
  subScoreNum: { fontSize: 13, fontWeight: "700", width: 28, textAlign: "right" },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  achieveCard: { width: "47%" },
  achieveCardLocked: { opacity: 0.5 },
  achievePad: { padding: 14, gap: 8, alignItems: "flex-start" },
  achieveIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  achieveTitle: { fontSize: 13, fontWeight: "600" },
  achieveDesc: { fontSize: 11, lineHeight: 15 },
  settingRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  settingIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  settingLabel: { fontSize: 15, fontWeight: "500" },
  settingValue: { fontSize: 13, marginRight: 6 },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, marginBottom: 8,
    backgroundColor: "rgba(255,71,87,0.08)",
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,71,87,0.2)",
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: "#FF4757" },
  version: { fontSize: 11, textAlign: "center", marginTop: 8, marginBottom: 8, letterSpacing: 1 },
});
