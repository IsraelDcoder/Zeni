import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BudgetRing } from "@/components/BudgetRing";
import { GlassCard } from "@/components/GlassCard";
import { SpendingDonut } from "@/components/SpendingDonut";
import { useApp } from "@/context/AppContext";
import type { TransactionCategory } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const CAT_COLORS: Record<TransactionCategory, string> = {
  food: "#F5A623",
  transport: "#3B82F6",
  entertainment: "#EC4899",
  utilities: "#10B981",
  shopping: "#F43F5E",
  health: "#8B5CF6",
  income: "#00D9C0",
  education: "#06B6D4",
  rent: "#EF4444",
  betting: "#F97316",
  subscriptions: "#A855F7",
  transfers: "#6B7280",
  other: "#6B7280",
};

const CAT_LABELS: Record<TransactionCategory, string> = {
  food: "Food & Drinks",
  transport: "Transport",
  entertainment: "Entertainment",
  utilities: "Utilities",
  shopping: "Shopping",
  health: "Health",
  income: "Income",
  education: "Education",
  rent: "Rent",
  betting: "Betting",
  subscriptions: "Subscriptions",
  transfers: "Transfers",
  other: "Other",
};

const BUDGETABLE: TransactionCategory[] = [
  "food", "transport", "entertainment", "shopping",
  "utilities", "subscriptions", "health", "education", "betting",
];

function fmt(n: number): string {
  if (n >= 1000) return "₦" + (n / 1000).toFixed(1) + "k";
  return "₦" + n;
}

type Tab = "insights" | "budget";

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { transactions, totalExpenses, setBudget, budgetStatus, recurringPayments } = useApp();
  const spending = useApp().categorySpending();
  const [activeTab, setActiveTab] = useState<Tab>("insights");
  const [editCategory, setEditCategory] = useState<TransactionCategory | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const categories = (Object.keys(spending) as TransactionCategory[])
    .filter((k) => k !== "income" && spending[k] > 0)
    .sort((a, b) => spending[b] - spending[a]);

  const segments = categories.map((k) => ({
    label: CAT_LABELS[k],
    value: spending[k],
    color: CAT_COLORS[k],
  }));

  const impulseTransactions = transactions.filter((t) => t.isImpulse && t.type === "expense");
  const impulseTotal = impulseTransactions.reduce((s, t) => s + t.amount, 0);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekSpend = [8000, 5000, 12000, 7000, 25000, 38000, 18000];
  const weekMax = Math.max(...weekSpend);

  const budgets = budgetStatus();
  const recurring = recurringPayments();
  const recurringTotal = recurring.reduce((s, r) => s + r.amount, 0);

  const handleSaveBudget = async () => {
    if (!editCategory || !editAmount.trim()) return;
    await setBudget(editCategory, parseInt(editAmount.replace(/\D/g, ""), 10) || 0);
    setEditCategory(null);
    setEditAmount("");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#070D1A", "#091220", "#070D1A"]} style={StyleSheet.absoluteFill} />

      {/* Sticky header + tabs */}
      <View style={[styles.stickyHeader, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Money Intelligence</Text>
        <View style={[styles.segControl, { backgroundColor: colors.muted }]}>
          {(["insights", "budget"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.segTab, activeTab === t && styles.segTabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.segLabel, { color: activeTab === t ? colors.foreground : colors.mutedForeground }]}>
                {t === "insights" ? "Insights" : "Budget"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "insights" ? (
          <>
            {/* Total Spent */}
            <GlassCard style={styles.totalCard} noPadding>
              <LinearGradient colors={["rgba(255,71,87,0.1)", "transparent"]} style={StyleSheet.absoluteFill} />
              <View style={styles.totalPad}>
                <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Spent</Text>
                <Text style={[styles.totalNum, { color: colors.foreground }]}>
                  ₦{totalExpenses.toLocaleString("en-NG")}
                </Text>
                {impulseTotal > 0 && (
                  <View style={styles.impulseLine}>
                    <Feather name="alert-triangle" size={12} color="#F5A623" />
                    <Text style={styles.impulseText}>
                      ₦{impulseTotal.toLocaleString("en-NG")} impulse ({Math.round((impulseTotal / totalExpenses) * 100)}%)
                    </Text>
                  </View>
                )}
              </View>
            </GlassCard>

            {/* Donut */}
            {segments.length > 0 && (
              <GlassCard style={styles.donutCard}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category Breakdown</Text>
                <View style={styles.donutRow}>
                  <SpendingDonut segments={segments} total={totalExpenses} size={170} />
                  <View style={styles.legend}>
                    {segments.slice(0, 5).map((s) => (
                      <View key={s.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.legendLabel, { color: colors.foreground }]}>{s.label}</Text>
                          <Text style={[styles.legendAmt, { color: colors.mutedForeground }]}>{fmt(s.value)}</Text>
                        </View>
                        <Text style={[styles.legendPct, { color: s.color }]}>
                          {Math.round((s.value / totalExpenses) * 100)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </GlassCard>
            )}

            {/* Weekly bar chart */}
            <GlassCard style={styles.weekCard}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Daily Spending Pattern</Text>
              <Text style={[styles.weekSub, { color: colors.mutedForeground }]}>Fri–Sat are your highest spend days</Text>
              <View style={styles.bars}>
                {weekDays.map((day, i) => {
                  const pct = weekMax > 0 ? weekSpend[i] / weekMax : 0;
                  const isHigh = pct > 0.7;
                  return (
                    <View key={day} style={styles.barCol}>
                      <View style={styles.barWrap}>
                        <View
                          style={[
                            styles.barFill,
                            { height: `${Math.max(pct * 100, 5)}%` as any, backgroundColor: isHigh ? "#F5A623" : "#00D9C0", opacity: isHigh ? 1 : 0.6 },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{day}</Text>
                    </View>
                  );
                })}
              </View>
            </GlassCard>

            {/* Recurring Payments */}
            {recurring.length > 0 && (
              <GlassCard style={styles.recurCard} noPadding>
                <LinearGradient colors={["rgba(123,92,247,0.1)", "transparent"]} style={StyleSheet.absoluteFill} />
                <View style={{ padding: 18 }}>
                  <View style={styles.recurHeader}>
                    <View style={styles.recurIcon}>
                      <Feather name="repeat" size={16} color="#7B5CF7" />
                    </View>
                    <View>
                      <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                        Recurring Payments
                      </Text>
                      <Text style={[styles.weekSub, { color: colors.mutedForeground }]}>
                        {recurring.length} detected · ₦{recurringTotal.toLocaleString("en-NG")}/mo autopilot
                      </Text>
                    </View>
                  </View>
                  {recurring.map((r) => (
                    <View key={r.description} style={styles.recurRow}>
                      <View style={[styles.recurDot, { backgroundColor: CAT_COLORS[r.category] }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recurDesc, { color: colors.foreground }]}>{r.description}</Text>
                        <Text style={[styles.recurFreq, { color: colors.mutedForeground }]}>
                          {r.frequency} · {CAT_LABELS[r.category]}
                        </Text>
                      </View>
                      <Text style={[styles.recurAmt, { color: "#7B5CF7" }]}>
                        ₦{r.amount.toLocaleString("en-NG")}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.recurSummary}>
                    <Text style={[styles.recurSummaryText, { color: colors.mutedForeground }]}>
                      Cutting 1 unused subscription saves ₦{recurring[0]?.amount.toLocaleString("en-NG") ?? "11,000"}/year
                    </Text>
                  </View>
                </View>
              </GlassCard>
            )}

            {/* Impulse Section */}
            {impulseTransactions.length > 0 && (
              <GlassCard style={styles.impulseCard} noPadding>
                <LinearGradient colors={["rgba(245,166,35,0.1)", "transparent"]} style={StyleSheet.absoluteFill} />
                <View style={{ padding: 18 }}>
                  <View style={styles.impulseHeader}>
                    <View style={styles.impulseIconWrap}>
                      <Feather name="zap" size={16} color="#F5A623" />
                    </View>
                    <View>
                      <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                        Impulse Purchases
                      </Text>
                      <Text style={[styles.weekSub, { color: colors.mutedForeground }]}>
                        {impulseTransactions.length} flagged this month
                      </Text>
                    </View>
                  </View>
                  {impulseTransactions.map((t) => (
                    <View key={t.id} style={styles.impulseRow}>
                      <Text style={[styles.impulseDesc, { color: colors.foreground }]}>{t.description}</Text>
                      <Text style={styles.impulseAmt}>-₦{t.amount.toLocaleString("en-NG")}</Text>
                    </View>
                  ))}
                  <View style={styles.impulseSummary}>
                    <Text style={[styles.impulseSummaryText, { color: colors.mutedForeground }]}>
                      Redirecting this to savings would add ₦{impulseTotal.toLocaleString("en-NG")} to your goals
                    </Text>
                  </View>
                </View>
              </GlassCard>
            )}

            {/* Category Bars */}
            <GlassCard style={{ marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Categories</Text>
              {categories.map((k) => {
                const pct = totalExpenses > 0 ? (spending[k] / totalExpenses) * 100 : 0;
                return (
                  <View key={k} style={styles.catRow}>
                    <View style={[styles.catDot, { backgroundColor: CAT_COLORS[k] }]} />
                    <View style={styles.catInfo}>
                      <View style={styles.catLabelRow}>
                        <Text style={[styles.catLabel, { color: colors.foreground }]}>{CAT_LABELS[k]}</Text>
                        <Text style={[styles.catAmt, { color: colors.foreground }]}>{fmt(spending[k])}</Text>
                      </View>
                      <View style={styles.catTrack}>
                        <View
                          style={[styles.catFill, { width: `${pct.toFixed(0)}%` as any, backgroundColor: CAT_COLORS[k] }]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </GlassCard>
          </>
        ) : (
          <>
            {/* Budget Overview */}
            <GlassCard style={styles.budgetOverview} noPadding>
              <LinearGradient colors={["rgba(0,217,192,0.08)", "transparent"]} style={StyleSheet.absoluteFill} />
              <View style={{ padding: 18 }}>
                <View style={styles.budgetOverviewHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 2 }]}>
                      Smart Budget
                    </Text>
                    <Text style={[styles.weekSub, { color: colors.mutedForeground }]}>
                      AI-generated · tap any ring to edit
                    </Text>
                  </View>
                  <View style={styles.aiBadge}>
                    <Feather name="cpu" size={12} color="#00D9C0" />
                    <Text style={styles.aiBadgeText}>AI</Text>
                  </View>
                </View>
                <View style={styles.ringsGrid}>
                  {budgets.map((b) => (
                    <Pressable key={b.category} onPress={() => {
                      setEditCategory(b.category);
                      setEditAmount(b.limit.toString());
                    }}>
                      <BudgetRing
                        label={CAT_LABELS[b.category]}
                        spent={b.spent}
                        limit={b.limit}
                        size={82}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            </GlassCard>

            {/* Budget Status List */}
            <GlassCard style={{ marginBottom: 14 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Budget Status</Text>
              {budgets
                .sort((a, b) => b.pct - a.pct)
                .map((b) => {
                  const over = b.pct >= 100;
                  const warn = b.pct >= 80 && !over;
                  const statusColor = over ? "#FF4757" : warn ? "#F5A623" : "#00D9C0";
                  const remaining = Math.max(b.limit - b.spent, 0);
                  const excess = Math.max(b.spent - b.limit, 0);
                  return (
                    <Pressable
                      key={b.category}
                      style={styles.budgetRow}
                      onPress={() => {
                        setEditCategory(b.category);
                        setEditAmount(b.limit.toString());
                      }}
                    >
                      <View style={[styles.budgetDot, { backgroundColor: CAT_COLORS[b.category] }]} />
                      <View style={styles.budgetInfo}>
                        <View style={styles.budgetLabelRow}>
                          <Text style={[styles.budgetLabel, { color: colors.foreground }]}>
                            {CAT_LABELS[b.category]}
                          </Text>
                          <Text style={[styles.budgetPct, { color: statusColor }]}>
                            {over ? `+₦${fmt(excess)} over` : `₦${fmt(remaining)} left`}
                          </Text>
                        </View>
                        <View style={styles.budgetTrack}>
                          <View
                            style={[
                              styles.budgetFill,
                              { width: `${b.pct.toFixed(0)}%` as any, backgroundColor: statusColor },
                            ]}
                          />
                        </View>
                        <Text style={[styles.budgetSub, { color: colors.mutedForeground }]}>
                          ₦{b.spent.toLocaleString("en-NG")} / ₦{b.limit.toLocaleString("en-NG")}
                        </Text>
                      </View>
                      <Feather name="edit-3" size={14} color="rgba(255,255,255,0.2)" />
                    </Pressable>
                  );
                })}
            </GlassCard>

            {/* Add untracked category */}
            <GlassCard style={{ marginBottom: 14 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Set New Budget</Text>
              <View style={styles.catChips}>
                {BUDGETABLE.filter((c) => !budgets.find((b) => b.category === c)).map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.catChip, { borderColor: CAT_COLORS[c] + "50" }]}
                    onPress={() => { setEditCategory(c); setEditAmount(""); }}
                  >
                    <View style={[styles.catChipDot, { backgroundColor: CAT_COLORS[c] }]} />
                    <Text style={[styles.catChipLabel, { color: colors.foreground }]}>{CAT_LABELS[c]}</Text>
                    <Feather name="plus" size={12} color={CAT_COLORS[c]} />
                  </Pressable>
                ))}
                {BUDGETABLE.filter((c) => !budgets.find((b) => b.category === c)).length === 0 && (
                  <Text style={[styles.weekSub, { color: colors.mutedForeground }]}>
                    All categories have budgets set.
                  </Text>
                )}
              </View>
            </GlassCard>

            {/* AI Budget insight */}
            <GlassCard noPadding style={{ marginBottom: 14 }}>
              <LinearGradient colors={["rgba(123,92,247,0.1)", "transparent"]} style={StyleSheet.absoluteFill} />
              <View style={{ padding: 16 }}>
                <View style={styles.aiBudgetRow}>
                  <View style={[styles.aiBudgetIcon, { backgroundColor: "#7B5CF722" }]}>
                    <Feather name="cpu" size={16} color="#7B5CF7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.budgetLabel, { color: colors.foreground }]}>Zara's Budget Analysis</Text>
                    <Text style={[styles.budgetSub, { color: colors.mutedForeground, marginTop: 4, lineHeight: 18 }]}>
                      Based on your ₦280,000 income, your ideal budget allocates 40% to needs (₦112k), 30% to wants (₦84k), and 30% to savings (₦84k). You're currently spending {Math.round((totalExpenses / 280000) * 100)}% on expenses.
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </>
        )}
      </ScrollView>

      {/* Edit Budget Modal */}
      <Modal visible={editCategory !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: botPad + 16 }]}>
            <LinearGradient colors={["#0D1525", "#070D1A"]} style={StyleSheet.absoluteFill} />
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Set {editCategory ? CAT_LABELS[editCategory] : ""} Budget
            </Text>
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
              Monthly limit (₦)
            </Text>
            {editCategory && spending[editCategory] > 0 && (
              <Text style={[styles.modalHint, { color: colors.primary }]}>
                You've spent ₦{spending[editCategory].toLocaleString("en-NG")} this month in this category
              </Text>
            )}
            <TextInput
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="e.g. 25000"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => { setEditCategory(null); setEditAmount(""); }}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveBudget}>
                <LinearGradient colors={["#00D9C0", "#00A896"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalSaveGrad}>
                  <Text style={{ color: "#070D1A", fontWeight: "700", fontSize: 15 }}>Save Budget</Text>
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
  stickyHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  pageTitle: { fontSize: 24, fontWeight: "800", marginBottom: 12 },
  segControl: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    marginBottom: 2,
  },
  segTab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: "center",
  },
  segTabActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  segLabel: { fontSize: 14, fontWeight: "600" },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  totalCard: { marginBottom: 16 },
  totalPad: { padding: 22 },
  totalLabel: { fontSize: 13, marginBottom: 6 },
  totalNum: { fontSize: 34, fontWeight: "800" },
  impulseLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  impulseText: { fontSize: 12, color: "#F5A623" },
  donutCard: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  legend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendLabel: { fontSize: 12, fontWeight: "500" },
  legendAmt: { fontSize: 11 },
  legendPct: { fontSize: 12, fontWeight: "700" },
  weekCard: { marginBottom: 16 },
  weekSub: { fontSize: 12, marginBottom: 16, marginTop: -8 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 80 },
  barCol: { flex: 1, alignItems: "center", gap: 4, height: "100%" },
  barWrap: {
    flex: 1, width: "100%", justifyContent: "flex-end",
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 6 },
  barLabel: { fontSize: 10 },
  recurCard: { marginBottom: 16 },
  recurHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  recurIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#7B5CF722", alignItems: "center", justifyContent: "center",
  },
  recurRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)",
  },
  recurDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  recurDesc: { fontSize: 13, fontWeight: "500" },
  recurFreq: { fontSize: 11, marginTop: 1 },
  recurAmt: { fontSize: 13, fontWeight: "700" },
  recurSummary: {
    marginTop: 12, padding: 12,
    backgroundColor: "rgba(123,92,247,0.1)", borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(123,92,247,0.2)",
  },
  recurSummaryText: { fontSize: 12, lineHeight: 18 },
  impulseCard: { marginBottom: 16 },
  impulseHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  impulseIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#F5A62322", alignItems: "center", justifyContent: "center",
  },
  impulseRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)",
  },
  impulseDesc: { fontSize: 13 },
  impulseAmt: { fontSize: 13, color: "#FF4757", fontWeight: "600" },
  impulseSummary: {
    marginTop: 12, padding: 12,
    backgroundColor: "rgba(0,217,192,0.08)", borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(0,217,192,0.2)",
  },
  impulseSummaryText: { fontSize: 12, lineHeight: 18 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  catDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  catInfo: { flex: 1, gap: 5 },
  catLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  catLabel: { fontSize: 13, fontWeight: "500" },
  catAmt: { fontSize: 13, fontWeight: "600" },
  catTrack: {
    height: 5, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden",
  },
  catFill: { height: "100%", borderRadius: 3 },
  // Budget tab
  budgetOverview: { marginBottom: 14 },
  budgetOverviewHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,217,192,0.12)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(0,217,192,0.25)",
  },
  aiBadgeText: { fontSize: 11, color: "#00D9C0", fontWeight: "700" },
  ringsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 12, justifyContent: "space-between",
  },
  budgetRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  budgetDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  budgetInfo: { flex: 1, gap: 5 },
  budgetLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budgetLabel: { fontSize: 13, fontWeight: "600" },
  budgetPct: { fontSize: 12, fontWeight: "700" },
  budgetTrack: {
    height: 5, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden",
  },
  budgetFill: { height: "100%", borderRadius: 3 },
  budgetSub: { fontSize: 11 },
  catChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  catChipDot: { width: 7, height: 7, borderRadius: 4 },
  catChipLabel: { fontSize: 12, fontWeight: "500" },
  aiBudgetRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  aiBudgetIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
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
  modalLabel: { fontSize: 13, marginBottom: 6 },
  modalHint: { fontSize: 12, marginBottom: 8 },
  modalInput: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 6,
  },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalCancel: {
    flex: 1, height: 50, borderRadius: 14,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  modalSave: { flex: 2, height: 50, borderRadius: 14, overflow: "hidden" },
  modalSaveGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
});
