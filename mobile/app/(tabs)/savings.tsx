import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/GlassCard";
import { SavingsGoalCard } from "@/components/SavingsGoalCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const GOAL_EMOJIS = ["🛡", "💻", "✈", "🏠", "📱", "🎓", "💰", "🚗", "💎", "🌍"];
const GOAL_COLORS = ["#00D9C0", "#7B5CF7", "#F5A623", "#EC4899", "#3B82F6", "#10B981"];

const MISSION_ICONS: Record<string, keyof typeof import("@expo/vector-icons").Feather.glyphMap> = {
  shield: "shield",
  "trending-up": "trending-up",
  target: "target",
  award: "award",
};

function fmt(n: number): string {
  if (n >= 1000000) return "₦" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "₦" + (n / 1000).toFixed(0) + "k";
  return "₦" + n;
}

function MissionCard({
  mission,
  onProgress,
}: {
  mission: ReturnType<typeof useApp>["savingsMissions"][number];
  onProgress: () => void;
}) {
  const colors = useColors();
  const pct = Math.round((mission.currentDays / mission.targetDays) * 100);
  const missionColor =
    mission.type === "streak" ? "#00D9C0"
    : mission.type === "discipline" ? "#F5A623"
    : "#7B5CF7";
  const iconName = MISSION_ICONS[mission.icon] ?? "star";

  return (
    <GlassCard style={styles.missionCard} noPadding>
      {mission.completed && (
        <LinearGradient
          colors={["rgba(0,217,192,0.12)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.missionPad}>
        <View style={styles.missionHeader}>
          <View style={[styles.missionIcon, { backgroundColor: missionColor + "22" }]}>
            <Feather name={iconName} size={18} color={missionColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.missionTitle, { color: colors.foreground }]}>
              {mission.title}
            </Text>
            <Text style={[styles.missionDesc, { color: colors.mutedForeground }]}>
              {mission.description}
            </Text>
          </View>
          {mission.completed ? (
            <View style={styles.completedBadge}>
              <Feather name="check-circle" size={16} color="#00D9C0" />
            </View>
          ) : (
            <Pressable style={styles.progressBtn} onPress={onProgress}>
              <Text style={styles.progressBtnText}>+1</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.missionProgress}>
          <View style={styles.missionTrack}>
            <View
              style={[
                styles.missionFill,
                { width: `${pct}%` as any, backgroundColor: missionColor },
              ]}
            />
          </View>
          <Text style={[styles.missionProgressLabel, { color: missionColor }]}>
            {mission.currentDays}/{mission.targetDays} days
          </Text>
        </View>

        <View style={styles.missionFooter}>
          <View style={[styles.rewardBadge, { borderColor: missionColor + "40" }]}>
            <Feather name="gift" size={11} color={missionColor} />
            <Text style={[styles.rewardText, { color: missionColor }]}>{mission.reward}</Text>
          </View>
          <Text style={[styles.missionType, { color: colors.mutedForeground }]}>
            {mission.type}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

export default function SavingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    profile,
    savingsMissions,
    progressMission,
    toggleRoundUp,
    transactions,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("💰");
  const [selectedColor, setSelectedColor] = useState("#00D9C0");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [activeSection, setActiveSection] = useState<"goals" | "missions">("goals");

  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const roundUpEnabled = profile?.roundUpEnabled ?? false;
  const roundUpEstimate = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => {
      const rounded = Math.ceil(t.amount / 500) * 500;
      return s + (rounded - t.amount);
    }, 0);

  const handleAddGoal = async () => {
    if (!goalName.trim() || !goalTarget.trim()) return;
    await addSavingsGoal({
      name: goalName.trim(),
      emoji: selectedEmoji,
      targetAmount: parseInt(goalTarget.replace(/\D/g, ""), 10) || 100000,
      currentAmount: 0,
      deadline: "2026-12-31",
      color: selectedColor,
    });
    setGoalName("");
    setGoalTarget("");
    setShowModal(false);
  };

  const handleAddToGoal = async () => {
    if (!selectedGoalId || !addAmount.trim()) return;
    await updateSavingsGoal(
      selectedGoalId,
      parseInt(addAmount.replace(/\D/g, ""), 10) || 0
    );
    setAddAmount("");
    setSelectedGoalId(null);
    setShowAddModal(false);
  };

  const completedMissions = savingsMissions.filter((m) => m.completed).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#070D1A", "#091220", "#070D1A"]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Your Vault</Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
              {savingsGoals.length} goals · {completedMissions}/{savingsMissions.length} missions done
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <LinearGradient colors={["#00D9C0", "#00A896"]} style={styles.addGrad}>
              <Feather name="plus" size={20} color="#070D1A" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Total Saved */}
        <GlassCard style={styles.totalCard} noPadding>
          <LinearGradient
            colors={["rgba(0,217,192,0.12)", "rgba(123,92,247,0.06)", "transparent"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.totalPad}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Saved</Text>
            <Text style={[styles.totalNum, { color: colors.foreground }]}>{fmt(totalSaved)}</Text>
            <Text style={[styles.totalOf, { color: colors.mutedForeground }]}>
              of {fmt(totalTarget)} goal total · {overallPct}% complete
            </Text>
            <View style={styles.masterTrack}>
              <LinearGradient
                colors={["#00D9C0", "#7B5CF7"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.masterFill, { width: `${overallPct}%` as any }]}
              />
            </View>
            <View style={styles.streakRow}>
              <Feather name="zap" size={14} color="#F5A623" />
              <Text style={styles.streakText}>
                {(profile?.savingsStreak ?? 0) + 7} day saving streak
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* ── Round-Up Savings ── */}
        <GlassCard style={styles.roundUpCard} noPadding>
          <LinearGradient
            colors={["rgba(0,217,192,0.08)", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.roundUpPad}>
            <View style={styles.roundUpLeft}>
              <View style={styles.roundUpIcon}>
                <Feather name="refresh-cw" size={16} color="#00D9C0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roundUpTitle, { color: colors.foreground }]}>
                  Round-Up Savings
                </Text>
                <Text style={[styles.roundUpDesc, { color: colors.mutedForeground }]}>
                  Auto-saves the ₦ difference to nearest ₦500 on every spend
                </Text>
                {roundUpEstimate > 0 && (
                  <Text style={styles.roundUpEstimate}>
                    ~₦{roundUpEstimate.toLocaleString("en-NG")} estimated/mo
                  </Text>
                )}
              </View>
            </View>
            <Switch
              value={roundUpEnabled}
              onValueChange={() => {
                const firstGoal = savingsGoals[0]?.id;
                toggleRoundUp(firstGoal);
              }}
              trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(0,217,192,0.4)" }}
              thumbColor={roundUpEnabled ? "#00D9C0" : "rgba(255,255,255,0.5)"}
            />
          </View>
        </GlassCard>

        {/* ── AI Tip ── */}
        <GlassCard style={styles.tipCard}>
          <View style={styles.tipRow}>
            <View style={styles.tipIcon}>
              <Feather name="cpu" size={16} color="#7B5CF7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>Zara's Saving Tip</Text>
              <Text style={[styles.tipMsg, { color: colors.mutedForeground }]}>
                Round up your daily purchases to the nearest ₦500. You'd save an extra ₦12,000 this month without feeling it.
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* ── Section Switcher ── */}
        <View style={[styles.sectionSwitch, { backgroundColor: colors.muted }]}>
          {(["goals", "missions"] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.switchTab, activeSection === s && styles.switchTabActive]}
              onPress={() => setActiveSection(s)}
            >
              <Text style={[styles.switchLabel, { color: activeSection === s ? colors.foreground : colors.mutedForeground }]}>
                {s === "goals" ? `Goals (${savingsGoals.length})` : `Missions (${completedMissions}/${savingsMissions.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeSection === "goals" ? (
          <>
            {savingsGoals.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="target" size={40} color="rgba(255,255,255,0.2)" />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No goals yet. Create one to start saving.
                </Text>
              </View>
            ) : (
              savingsGoals.map((goal) => (
                <Pressable
                  key={goal.id}
                  onPress={() => {
                    setSelectedGoalId(goal.id);
                    setShowAddModal(true);
                  }}
                >
                  <SavingsGoalCard goal={goal} />
                  {goal.locked && (
                    <View style={styles.lockedBadge}>
                      <Feather name="lock" size={11} color="#F5A623" />
                      <Text style={styles.lockedText}>
                        Locked until {goal.unlockDate}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={[styles.missionIntro, { color: colors.mutedForeground }]}>
              Complete missions to boost your financial score and build lasting money habits.
            </Text>
            {savingsMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onProgress={() => progressMission(mission.id)}
              />
            ))}
            {completedMissions > 0 && (
              <GlassCard style={styles.celebCard} noPadding>
                <LinearGradient
                  colors={["rgba(0,217,192,0.1)", "transparent"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.celebPad}>
                  <Text style={styles.celebEmoji}>🏆</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.celebTitle, { color: colors.foreground }]}>
                      {completedMissions} Mission{completedMissions > 1 ? "s" : ""} Completed
                    </Text>
                    <Text style={[styles.celebDesc, { color: colors.mutedForeground }]}>
                      Your financial discipline is growing. Keep pushing.
                    </Text>
                  </View>
                </View>
              </GlassCard>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: botPad + 20 }]}>
            <LinearGradient colors={["#0D1525", "#070D1A"]} style={StyleSheet.absoluteFill} />
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Savings Goal</Text>
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Goal Name</Text>
            <TextInput
              value={goalName}
              onChangeText={setGoalName}
              placeholder="e.g. Emergency Fund"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]}
            />
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Target Amount (₦)</Text>
            <TextInput
              value={goalTarget}
              onChangeText={setGoalTarget}
              placeholder="e.g. 500,000"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]}
            />
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Pick an Emoji</Text>
            <View style={styles.emojiRow}>
              {GOAL_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnActive]}
                  onPress={() => setSelectedEmoji(e)}
                >
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Color</Text>
            <View style={styles.colorRow}>
              {GOAL_COLORS.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.colorBtn, { backgroundColor: c }, selectedColor === c && styles.colorBtnActive]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreate} onPress={handleAddGoal}>
                <LinearGradient
                  colors={["#00D9C0", "#00A896"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.modalCreateGrad}
                >
                  <Text style={{ color: "#070D1A", fontWeight: "700", fontSize: 15 }}>Create Goal</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add to Goal Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: botPad + 20 }]}>
            <LinearGradient colors={["#0D1525", "#070D1A"]} style={StyleSheet.absoluteFill} />
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add to Goal</Text>
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Amount to add (₦)</Text>
            <TextInput
              value={addAmount}
              onChangeText={setAddAmount}
              placeholder="e.g. 10,000"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreate} onPress={handleAddToGoal}>
                <LinearGradient
                  colors={["#00D9C0", "#00A896"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.modalCreateGrad}
                >
                  <Text style={{ color: "#070D1A", fontWeight: "700", fontSize: 15 }}>Add Savings</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 20,
  },
  pageTitle: { fontSize: 28, fontWeight: "800" },
  pageSub: { fontSize: 13, marginTop: 2 },
  addBtn: { width: 46, height: 46, borderRadius: 23, overflow: "hidden" },
  addGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  totalCard: { marginBottom: 14 },
  totalPad: { padding: 22 },
  totalLabel: { fontSize: 13, marginBottom: 6 },
  totalNum: { fontSize: 36, fontWeight: "800" },
  totalOf: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  masterTrack: {
    height: 6, backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3, overflow: "hidden", marginBottom: 14,
  },
  masterFill: { height: "100%", borderRadius: 3 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakText: { fontSize: 13, color: "#F5A623", fontWeight: "600" },
  roundUpCard: { marginBottom: 14 },
  roundUpPad: {
    flexDirection: "row", alignItems: "center",
    padding: 16, gap: 12,
  },
  roundUpLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  roundUpIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(0,217,192,0.15)",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  roundUpTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  roundUpDesc: { fontSize: 12, lineHeight: 17 },
  roundUpEstimate: { fontSize: 12, color: "#00D9C0", fontWeight: "600", marginTop: 4 },
  tipCard: { marginBottom: 18 },
  tipRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  tipIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#7B5CF722", alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  tipTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  tipMsg: { fontSize: 13, lineHeight: 19 },
  sectionSwitch: {
    flexDirection: "row", borderRadius: 12, padding: 3,
    marginBottom: 16,
  },
  switchTab: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center",
  },
  switchTabActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  switchLabel: { fontSize: 13, fontWeight: "600" },
  empty: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyText: { fontSize: 14, textAlign: "center" },
  lockedBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: -8, marginBottom: 12, paddingHorizontal: 4,
  },
  lockedText: { fontSize: 11, color: "#F5A623" },
  missionIntro: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  missionCard: { marginBottom: 12 },
  missionPad: { padding: 16 },
  missionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  missionIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  missionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  missionDesc: { fontSize: 12, lineHeight: 17 },
  completedBadge: { padding: 4 },
  progressBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "rgba(0,217,192,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  progressBtnText: { fontSize: 12, fontWeight: "700", color: "#00D9C0" },
  missionProgress: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  missionTrack: {
    flex: 1, height: 5,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 3, overflow: "hidden",
  },
  missionFill: { height: "100%", borderRadius: 3 },
  missionProgressLabel: { fontSize: 12, fontWeight: "600", width: 60, textAlign: "right" },
  missionFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rewardBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 100, borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  rewardText: { fontSize: 11, fontWeight: "600" },
  missionType: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  celebCard: { marginTop: 4, marginBottom: 12 },
  celebPad: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  celebEmoji: { fontSize: 28 },
  celebTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  celebDesc: { fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, overflow: "hidden", gap: 4,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)",
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  modalLabel: { fontSize: 13, marginBottom: 8, marginTop: 4 },
  modalInput: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 6,
  },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  emojiBtnActive: {
    backgroundColor: "rgba(0,217,192,0.2)",
    borderWidth: 1, borderColor: "#00D9C0",
  },
  colorRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  colorBtn: { width: 32, height: 32, borderRadius: 16 },
  colorBtnActive: { borderWidth: 3, borderColor: "white" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalCancel: {
    flex: 1, height: 50, borderRadius: 14,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  modalCreate: { flex: 2, height: 50, borderRadius: 14, overflow: "hidden" },
  modalCreateGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
});
