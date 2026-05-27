import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AIInsightCard } from "@/components/AIInsightCard";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { CategoryModal } from "@/components/CategoryModal";
import { FinancialScoreRing } from "@/components/FinancialScoreRing";
import { GlassCard } from "@/components/GlassCard";
import { MascotWidget } from "@/components/MascotWidget";
import { SurvivalCard } from "@/components/SurvivalCard";
import { TransactionCard } from "@/components/TransactionCard";
import { useApp } from "@/context/AppContext";
import { generateAINote, getCategoryMeta } from "@/lib/categorization";
import { getAmbientInsights, getSpendingVelocity } from "@/lib/insights";
import { useColors } from "@/hooks/useColors";

function fmt(n: number): string {
  if (Math.abs(n) >= 1000000) return "₦" + (n / 1000000).toFixed(2) + "M";
  if (Math.abs(n) >= 1000) return "₦" + (n / 1000).toFixed(1) + "k";
  return "₦" + n.toLocaleString("en-NG");
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Spending Pulse Chip ─────────────────────────────────────────────────────

function SpendingPulse({ transactions }: { transactions: any[] }) {
  const velocity = getSpendingVelocity(transactions);
  const trendIcon = velocity.trend === "up" ? "trending-up" : velocity.trend === "down" ? "trending-down" : "minus";
  return (
    <View style={[styles.pulsePill, { backgroundColor: velocity.color + "18", borderColor: velocity.color + "40" }]}>
      <Feather name="activity" size={10} color={velocity.color} />
      <Text style={[styles.pulseText, { color: velocity.color }]}>{velocity.label}</Text>
      <Feather name={trendIcon} size={10} color={velocity.color} />
    </View>
  );
}

// ─── AI Insight Banner (post-transaction) ─────────────────────────────────────

function InsightBanner({ message, color, icon, onDismiss }: {
  message: string; color: string; icon: string; onDismiss: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 250 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -80, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 3500);
    return () => clearTimeout(t);
  }, [message, onDismiss, opacityAnim, slideAnim]);

  return (
    <Animated.View style={[styles.insightBanner, { backgroundColor: color + "18", borderColor: color + "40", transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>
      <Feather name={icon as any} size={14} color={color} />
      <Text style={[styles.insightBannerText, { color }]} numberOfLines={2}>{message}</Text>
      <Pressable onPress={onDismiss}>
        <Feather name="x" size={14} color={color} />
      </Pressable>
    </Animated.View>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────

function FAB({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, damping: 15, stiffness: 400 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 300 }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={[styles.fab, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <LinearGradient colors={["#00D9C0", "#00A896"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGrad}>
          <Feather name="plus" size={22} color="#070D1A" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    profile, transactions, balance, totalIncome, totalExpenses,
    financialScore, savingsRate, mascotMood, survivalReport,
    recurringPayments, budgetStatus, pendingCategorization,
    confirmCategory, clearPendingCategorization, merchantMemory,
    addTransaction, categoryAverage, budgets,
  } = useApp();

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [banner, setBanner] = useState<{ message: string; color: string; icon: string } | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const impulseCount   = transactions.filter((t) => t.isImpulse && t.type === "expense").length;
  const recentTxs      = transactions.slice(0, 7);
  const survival       = survivalReport();
  const recurring      = recurringPayments();
  const recurringTotal = recurring.reduce((s, r) => s + r.amount, 0);
  const bStatuses      = budgetStatus();
  const overBudget     = bStatuses.filter((b) => b.pct >= 100);
  const nearBudget     = bStatuses.filter((b) => b.pct >= 80 && b.pct < 100);
  const lateNightTxs   = transactions.filter((t) => t.type === "expense" && (t.hour ?? 0) >= 21).length;

  const ambientInsights = getAmbientInsights(transactions, budgets, balance, profile?.monthlyIncome ?? 280000);

  const handleAddTransaction = async (data: {
    amount: number; description: string; category: import("@/context/AppContext").TransactionCategory;
    type: "income" | "expense"; date: string; isImpulse?: boolean; hour?: number;
  }) => {
    const result = await addTransaction(data);
    if (!result.pending) {
      setBanner({
        message: `₦${data.amount.toLocaleString("en-NG")} categorized as ${data.category}`,
        color: "#00D9C0",
        icon: "check-circle",
      });
    }
  };

  const handleConfirmCategory = async (txId: string, category: import("@/context/AppContext").TransactionCategory) => {
    const tx = pendingCategorization?.tx;
    await confirmCategory(txId, category);
    if (tx) {
      setBanner({
        message: `₦${tx.amount.toLocaleString("en-NG")} saved as ${category}. Zara learned this!`,
        color: "#7B5CF7",
        icon: "cpu",
      });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#070D1A", "#091220", "#070D1A"]} style={StyleSheet.absoluteFill} />
      <View style={styles.tealOrb} />
      <View style={styles.violetOrb} />

      {/* Insight Banner */}
      {banner && (
        <View style={[styles.bannerWrap, { top: topPad + (Platform.OS === "web" ? 0 : 8) }]}>
          <InsightBanner
            message={banner.message}
            color={banner.color}
            icon={banner.icon}
            onDismiss={() => setBanner(null)}
          />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {getGreeting()}
            </Text>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {profile?.name ?? "Friend"}
              </Text>
              <SpendingPulse transactions={transactions} />
            </View>
          </View>
          <MascotWidget mood={mascotMood} size={48} />
        </View>

        {/* Balance Card */}
        <GlassCard style={styles.balanceCard} noPadding>
          <LinearGradient
            colors={["rgba(0,217,192,0.12)", "rgba(123,92,247,0.08)", "transparent"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.balancePad}>
            <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Total Balance</Text>
            <Text style={[styles.balanceNum, { color: colors.foreground }]}>{fmt(balance)}</Text>
            <View style={styles.balanceRow}>
              <View style={styles.statPill}>
                <Feather name="trending-up" size={12} color="#00D9C0" />
                <Text style={styles.statPillText}>{savingsRate}% saved</Text>
              </View>
              <View style={[styles.statPill, impulseCount > 0 ? { backgroundColor: "#F5A62315" } : {}]}>
                {impulseCount > 0 ? (
                  <>
                    <Feather name="zap" size={12} color="#F5A623" />
                    <Text style={[styles.statPillText, { color: "#F5A623" }]}>{impulseCount} impulse</Text>
                  </>
                ) : (
                  <>
                    <Feather name="shield" size={12} color="#00D9C0" />
                    <Text style={styles.statPillText}>No impulse</Text>
                  </>
                )}
              </View>
              {recurring.length > 0 && (
                <View style={[styles.statPill, { backgroundColor: "#7B5CF715" }]}>
                  <Feather name="repeat" size={12} color="#7B5CF7" />
                  <Text style={[styles.statPillText, { color: "#7B5CF7" }]}>{recurring.length} recurring</Text>
                </View>
              )}
            </View>
          </View>
        </GlassCard>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Feather name="arrow-down-circle" size={18} color="#00D9C0" />
            <Text style={[styles.statNum, { color: colors.foreground }]}>{fmt(totalIncome)}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Income</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Feather name="arrow-up-circle" size={18} color="#FF6B81" />
            <Text style={[styles.statNum, { color: colors.foreground }]}>{fmt(totalExpenses)}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Spent</Text>
          </GlassCard>
          <Pressable onPress={() => router.push("/(tabs)/profile")}>
            <GlassCard style={styles.statCard}>
              <FinancialScoreRing score={financialScore} size={62} strokeWidth={6} />
            </GlassCard>
          </Pressable>
        </View>

        {/* Survival */}
        <SurvivalCard report={survival} />

        {/* Budget alerts */}
        {overBudget.length > 0 && (
          <Pressable onPress={() => router.push("/(tabs)/analytics")}>
            <GlassCard style={styles.alertCard} noPadding>
              <LinearGradient colors={["rgba(255,71,87,0.12)", "transparent"]} style={StyleSheet.absoluteFill} />
              <View style={styles.alertPad}>
                <View style={styles.alertIcon}>
                  <Feather name="alert-triangle" size={16} color="#FF4757" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: "#FF4757" }]}>
                    {overBudget.length} Budget{overBudget.length > 1 ? "s" : ""} Exceeded
                  </Text>
                  <Text style={[styles.alertMsg, { color: colors.mutedForeground }]}>
                    {overBudget.map((b) => b.category).join(", ")} — tap to manage
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
              </View>
            </GlassCard>
          </Pressable>
        )}
        {nearBudget.length > 0 && overBudget.length === 0 && (
          <Pressable onPress={() => router.push("/(tabs)/analytics")}>
            <GlassCard style={styles.alertCard} noPadding>
              <LinearGradient colors={["rgba(245,166,35,0.1)", "transparent"]} style={StyleSheet.absoluteFill} />
              <View style={styles.alertPad}>
                <View style={[styles.alertIcon, { backgroundColor: "#F5A62322" }]}>
                  <Feather name="activity" size={16} color="#F5A623" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: "#F5A623" }]}>
                    {nearBudget.length} Budget{nearBudget.length > 1 ? "s" : ""} Near Limit
                  </Text>
                  <Text style={[styles.alertMsg, { color: colors.mutedForeground }]}>
                    {nearBudget.map((b) => b.category).join(", ")} — slow down
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
              </View>
            </GlassCard>
          </Pressable>
        )}

        {/* Recurring bills */}
        {recurringTotal > 0 && (
          <GlassCard style={styles.recurCard} noPadding>
            <LinearGradient colors={["rgba(123,92,247,0.1)", "transparent"]} style={StyleSheet.absoluteFill} />
            <View style={styles.alertPad}>
              <View style={[styles.alertIcon, { backgroundColor: "#7B5CF722" }]}>
                <Feather name="repeat" size={16} color="#7B5CF7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: "#7B5CF7" }]}>
                  ₦{recurringTotal.toLocaleString("en-NG")}/mo in Recurring Bills
                </Text>
                <Text style={[styles.alertMsg, { color: colors.mutedForeground }]}>
                  {recurring.length} detected — {recurring[0]?.description}
                  {recurring.length > 1 ? ` +${recurring.length - 1} more` : ""}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Ambient AI Insights */}
        {ambientInsights.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Zara's Insights</Text>
            {ambientInsights.map((insight) => (
              <AIInsightCard
                key={insight.id}
                type={insight.severity === "positive" ? "success" : insight.severity === "critical" ? "warning" : "tip"}
                title={insight.title}
                message={insight.message}
              />
            ))}
            {/* Fallback static insights when AI insights are sparse */}
            {ambientInsights.length < 2 && (
              <>
                {impulseCount >= 2 && (
                  <AIInsightCard
                    type="warning"
                    title="Impulse Spending Detected"
                    message={`${impulseCount} impulse purchases this month. The 24-hour rule: if you still want it tomorrow, it's intentional spending.`}
                  />
                )}
                {lateNightTxs >= 2 && (
                  <AIInsightCard
                    type="warning"
                    title="Late-Night Spending Pattern"
                    message={`${lateNightTxs} transactions after 9PM detected. Set a 9PM financial curfew to save up to ₦12,000/month.`}
                  />
                )}
                <AIInsightCard
                  type="tip"
                  title="Weekend Spending Pattern"
                  message="Spending spikes Fri–Sat evenings. A ₦5,000 weekend cap could free up ₦20,000/month without cutting real joy."
                />
              </>
            )}
          </>
        )}

        {/* Transaction Feed */}
        <View style={styles.txHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
          <Pressable onPress={() => router.push("/(tabs)/analytics")} style={styles.seeAllBtn}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            <Feather name="chevron-right" size={14} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.txList}>
          {recentTxs.map((tx) => {
            const avg = categoryAverage(tx.category);
            const bStatus = bStatuses.find((b) => b.category === tx.category);
            const aiNote = generateAINote(tx.category, tx.amount, avg, bStatus?.pct ?? 0);
            return (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                aiNote={aiNote}
              />
            );
          })}
        </View>

        {transactions.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <Feather name="inbox" size={32} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyDesc}>Tap the + button to add your first transaction</Text>
          </GlassCard>
        )}
      </ScrollView>

      {/* FAB */}
      <View style={[styles.fabWrap, { bottom: botPad + 80 }]}>
        <FAB onPress={() => setShowAddSheet(true)} />
      </View>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        visible={showAddSheet}
        merchantMemory={merchantMemory}
        onAdd={handleAddTransaction}
        onClose={() => setShowAddSheet(false)}
      />

      {/* Category Confirmation Modal */}
      <CategoryModal
        visible={!!pendingCategorization}
        transaction={pendingCategorization?.tx ?? null}
        classification={pendingCategorization?.classification ?? null}
        onConfirm={handleConfirmCategory}
        onDismiss={clearPendingCategorization}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tealOrb: {
    position: "absolute", width: 280, height: 280, borderRadius: 140,
    backgroundColor: "#00D9C00A", top: -80, right: -80,
  },
  violetOrb: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "#7B5CF708", bottom: 200, left: -60,
  },
  bannerWrap: { position: "absolute", left: 20, right: 20, zIndex: 100 },
  insightBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  insightBannerText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 22, gap: 12,
  },
  greeting: { fontSize: 13, marginBottom: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  name: { fontSize: 22, fontWeight: "700" },
  pulsePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, borderWidth: 1,
  },
  pulseText: { fontSize: 11, fontWeight: "700" },
  balanceCard: { marginBottom: 16 },
  balancePad: { padding: 22 },
  balanceLabel: { fontSize: 13, marginBottom: 6 },
  balanceNum: { fontSize: 38, fontWeight: "800", letterSpacing: -1, marginBottom: 14 },
  balanceRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#00D9C015", borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  statPillText: { fontSize: 12, color: "#00D9C0", fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 10 },
  statNum: { fontSize: 14, fontWeight: "700" },
  statLabel: { fontSize: 11 },
  alertCard: { marginBottom: 12 },
  recurCard: { marginBottom: 16 },
  alertPad: { padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  alertIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#FF475722",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  alertTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  alertMsg: { fontSize: 12, lineHeight: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  txHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 12, marginTop: 8,
  },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAll: { fontSize: 13, fontWeight: "600" },
  txList: { gap: 0, marginBottom: 16 },
  emptyCard: { alignItems: "center", gap: 10, paddingVertical: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.4)" },
  emptyDesc: { fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center" },
  fabWrap: { position: "absolute", right: 20, zIndex: 50 },
  fab: {
    width: 56, height: 56, borderRadius: 28, overflow: "hidden",
    shadowColor: "#00D9C0", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
});
