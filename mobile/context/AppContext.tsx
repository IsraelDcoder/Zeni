import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { classifyTransaction, type ClassificationResult, CONFIDENCE } from "@/lib/categorization";
import { zeniApi } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionCategory =
  | "food"
  | "transport"
  | "entertainment"
  | "utilities"
  | "shopping"
  | "health"
  | "income"
  | "education"
  | "rent"
  | "betting"
  | "subscriptions"
  | "transfers"
  | "other";

export type MascotMood = "happy" | "concerned" | "excited" | "calm" | "playful";

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: TransactionCategory;
  date: string;
  type: "income" | "expense";
  isImpulse?: boolean;
  hour?: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
  locked?: boolean;
  unlockDate?: string;
}

export interface Budget {
  category: TransactionCategory;
  limit: number;
}

export interface SavingsMission {
  id: string;
  title: string;
  description: string;
  icon: string;
  reward: string;
  targetDays: number;
  currentDays: number;
  completed: boolean;
  type: "streak" | "challenge" | "discipline";
}

export interface RecurringPayment {
  description: string;
  amount: number;
  category: TransactionCategory;
  frequency: "weekly" | "monthly";
  lastDate: string;
}

export interface UserProfile {
  name: string;
  currency: string;
  monthlyIncome: number;
  financialPersonality: string;
  onboardingComplete: boolean;
  savingsStreak: number;
  roundUpEnabled?: boolean;
  roundUpVaultId?: string;
}

export interface CoachMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface SurvivalReport {
  daysLeft: number;
  status: "safe" | "warning" | "critical";
  message: string;
  dailyBurnRate: number;
  projectedShortfall: number;
}

export interface PendingCategorization {
  tx: Transaction;
  classification: ClassificationResult;
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface AppContextType {
  profile: UserProfile | null;
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  coachMessages: CoachMessage[];
  budgets: Budget[];
  savingsMissions: SavingsMission[];
  mascotMood: MascotMood;
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  financialScore: number;
  savingsRate: number;
  isLoading: boolean;
  merchantMemory: Record<string, TransactionCategory>;
  pendingCategorization: PendingCategorization | null;
  setProfile: (p: UserProfile) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, "id">) => Promise<{ pending: boolean }>;
  confirmCategory: (txId: string, category: TransactionCategory) => Promise<void>;
  learnMerchant: (description: string, category: TransactionCategory) => Promise<void>;
  clearPendingCategorization: () => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, "id">) => Promise<void>;
  updateSavingsGoal: (id: string, amount: number) => Promise<void>;
  sendCoachMessage: (text: string) => Promise<void>;
  setBudget: (category: TransactionCategory, limit: number) => Promise<void>;
  progressMission: (id: string) => Promise<void>;
  toggleRoundUp: (vaultId?: string) => Promise<void>;
  categorySpending: () => Record<TransactionCategory, number>;
  survivalReport: () => SurvivalReport;
  recurringPayments: () => RecurringPayment[];
  budgetStatus: () => { category: TransactionCategory; spent: number; limit: number; pct: number }[];
  categoryAverage: (cat: TransactionCategory) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_TRANSACTIONS: Transaction[] = [
  { id: "1",  amount: 250000, description: "Monthly Salary",         category: "income",        date: "2026-05-01", type: "income" },
  { id: "2",  amount: 45000,  description: "Lagos Lekki Shopping",   category: "shopping",      date: "2026-05-03", type: "expense", isImpulse: true, hour: 21 },
  { id: "3",  amount: 8500,   description: "Suya & Drinks",          category: "food",          date: "2026-05-04", type: "expense", hour: 20 },
  { id: "4",  amount: 12000,  description: "Uber rides",             category: "transport",     date: "2026-05-05", type: "expense" },
  { id: "5",  amount: 18000,  description: "DSTV & Internet",        category: "utilities",     date: "2026-05-06", type: "expense" },
  { id: "6",  amount: 25000,  description: "Club Night Out",         category: "entertainment", date: "2026-05-07", type: "expense", isImpulse: true, hour: 22 },
  { id: "7",  amount: 5500,   description: "Jollof Rice & Chicken",  category: "food",          date: "2026-05-08", type: "expense" },
  { id: "8",  amount: 3800,   description: "BRT Bus rides",          category: "transport",     date: "2026-05-09", type: "expense" },
  { id: "9",  amount: 15000,  description: "Sneakers impulse buy",   category: "shopping",      date: "2026-05-10", type: "expense", isImpulse: true, hour: 23 },
  { id: "10", amount: 9000,   description: "Pharmacy & vitamins",    category: "health",        date: "2026-05-11", type: "expense" },
  { id: "11", amount: 7200,   description: "Shawarma + Takeout",     category: "food",          date: "2026-05-12", type: "expense", hour: 21 },
  { id: "12", amount: 30000,  description: "Freelance project",      category: "income",        date: "2026-05-13", type: "income" },
  { id: "13", amount: 11000,  description: "Netflix & Spotify",      category: "subscriptions", date: "2026-05-14", type: "expense" },
  { id: "14", amount: 4200,   description: "Danfo Transport",        category: "transport",     date: "2026-05-15", type: "expense" },
  { id: "15", amount: 8800,   description: "Fried rice + drinks",    category: "food",          date: "2026-05-17", type: "expense", hour: 20 },
  { id: "16", amount: 11000,  description: "Netflix & Spotify",      category: "subscriptions", date: "2026-04-14", type: "expense" },
  { id: "17", amount: 18000,  description: "DSTV & Internet",        category: "utilities",     date: "2026-04-06", type: "expense" },
  { id: "18", amount: 3200,   description: "Bolt ride",              category: "transport",     date: "2026-05-18", type: "expense" },
  { id: "19", amount: 6500,   description: "Chicken Republic",       category: "food",          date: "2026-05-19", type: "expense" },
  { id: "20", amount: 5000,   description: "Betting - SportyBet",    category: "betting",       date: "2026-05-20", type: "expense" },
];

const SEED_GOALS: SavingsGoal[] = [
  { id: "g1", name: "Emergency Fund", emoji: "🛡", targetAmount: 500000, currentAmount: 120000, deadline: "2026-12-31", color: "#00D9C0", locked: true, unlockDate: "2026-12-31" },
  { id: "g2", name: "MacBook Pro",    emoji: "💻", targetAmount: 350000, currentAmount: 85000,  deadline: "2026-09-30", color: "#7B5CF7" },
  { id: "g3", name: "Bali Trip",      emoji: "✈",  targetAmount: 200000, currentAmount: 42000,  deadline: "2026-11-30", color: "#F5A623" },
];

const SEED_BUDGETS: Budget[] = [
  { category: "food",          limit: 30000 },
  { category: "transport",     limit: 15000 },
  { category: "entertainment", limit: 15000 },
  { category: "shopping",      limit: 30000 },
  { category: "subscriptions", limit: 12000 },
  { category: "utilities",     limit: 20000 },
];

const SEED_MISSIONS: SavingsMission[] = [
  { id: "m1", title: "7-Day No Impulse",     description: "Avoid all impulse purchases for 7 days",          icon: "shield",    reward: "+15 score", targetDays: 7,  currentDays: 3, completed: false, type: "discipline" },
  { id: "m2", title: "Daily ₦1k Save",       description: "Save at least ₦1,000 every day for 30 days",      icon: "trending-up",reward: "+20 score",targetDays: 30, currentDays: 7, completed: false, type: "streak" },
  { id: "m3", title: "Weekend Discipline",   description: "Stay within entertainment budget 4 weekends",     icon: "target",    reward: "Badge +10", targetDays: 4,  currentDays: 1, completed: false, type: "challenge" },
  { id: "m4", title: "Budget Warrior",       description: "Stay under budget in ALL categories this month",  icon: "award",     reward: "+25 score", targetDays: 30, currentDays: 0, completed: false, type: "challenge" },
];

// ─── AI Coaching ──────────────────────────────────────────────────────────────

const AI_PAIRS: { keywords: string[]; responses: string[] }[] = [
  {
    keywords: ["hello", "hi", "hey", "start", "begin"],
    responses: [
      "Hey! I've analyzed your spending and found 3 impulse purchases totaling ₦85,000 this month — 49% of your total spend. That's the fastest path to running out before month-end. Want to explore what's driving them?",
      "Hello! I notice a late-night spending pattern — most of your impulse purchases happen after 9PM. That's when financial discipline is lowest. Let's build a guardrail together.",
    ],
  },
  {
    keywords: ["spend", "money", "where", "going", "disappear", "drain"],
    responses: [
      "Your top 3 spending categories: Shopping ₦60,000 (35%), Entertainment ₦36,000 (21%), Food ₦30,200 (17%). You also have 5 detected recurring subscriptions totaling ₦29,000/month. Want to identify any you can cut?",
      "Your money trail shows a clear pattern — weekend spending is 38% higher than weekdays. Friday–Saturday nights are your biggest risk window. I can help you create guardrails that don't feel restrictive.",
    ],
  },
  {
    keywords: ["save", "saving", "savings", "how much"],
    responses: [
      "Based on your ₦280,000 income and ₦173,000 in spending, you could save ₦62,000 this month. Redirecting just ₦15,000 from impulse shopping gets you 22% savings rate — which puts you in the top tier for your age group.",
      "You've saved ₦247,000 across your 3 goals. With round-up savings enabled, you'd add an extra ₦8,000–12,000 monthly without even thinking about it. Should I activate it?",
    ],
  },
  {
    keywords: ["budget", "limit", "overspend", "over"],
    responses: [
      "Your food budget is ₦30,000 — you've spent ₦35,000. You're ₦5,000 over. The fix isn't cutting out food, it's redistributing: cooking 2 more days a week saves ₦4,800 average. Want me to help you adjust the budget?",
      "You've hit 100% of your entertainment budget and you still have 12 days left this month. I recommend a 5-day no-spend challenge on entertainment. That's ₦6,000 saved and a +8 score boost.",
    ],
  },
  {
    keywords: ["survive", "days", "balance", "finish", "run out", "last"],
    responses: [
      "At your current burn rate of ₦5,400/day, your balance would last approximately 20 more days. Your next paycheck is in 8 days, so you're in a safe zone — but only if you avoid another impulse purchase this week.",
      "Your survival window is currently SAFE but fragile. Two more unplanned expenses like last weekend and you'd drop to WARNING status. I recommend setting a daily spending cap of ₦4,500 for the next 6 days.",
    ],
  },
  {
    keywords: ["impulse", "control", "stop", "habit"],
    responses: [
      "I've flagged 3 impulse purchases worth ₦85,000 this month — all happening on Friday–Saturday evenings between 9PM–11PM in Lekki. The 24-hour rule works: if you still want it tomorrow, it's intentional spending, not impulse.",
      "Your impulse spending spikes during social situations after 9PM. Try this: set a ₦10,000 'night out budget' per week. When it's gone, it's gone. You spend with freedom AND limits.",
    ],
  },
  {
    keywords: ["score", "rating", "performance", "progress", "how good"],
    responses: [
      "Your Financial Score is 63/100 — Developing. Breakdown: Spending Discipline 56 | Saving Consistency 50 | Income Health 77 | Stability 69 | Momentum 63. Saving Consistency is your biggest drag. One auto-transfer on payday fixes that.",
      "To reach 80+ (Good), you need 3 things: stop 1 impulse purchase/week, add ₦5k to any goal this week, and complete the 7-Day No Impulse mission. That's a +17 score improvement in 30 days.",
    ],
  },
  {
    keywords: ["stress", "anxiety", "worried", "fear", "scared", "overwhelmed"],
    responses: [
      "Financial anxiety is real and valid. You have ₦247,000 saved across 3 goals — most people your age have nothing. You're not behind. You're building. What one thing would make you feel most financially secure right now?",
      "You're more financially aware than you think. The fact you're tracking, asking, and catching patterns means you're operating at a higher level than 90% of your peers. What's feeling most overwhelming right now?",
    ],
  },
  {
    keywords: ["recurring", "subscription", "netflix", "spotify", "bills"],
    responses: [
      "I've detected 5 recurring payments totaling ₦47,000/month: Netflix+Spotify ₦11,000, DSTV+Internet ₦18,000, and more. That's 17% of your income on autopilot. Want me to audit which ones you actually use?",
    ],
  },
  {
    keywords: ["invest", "grow", "wealth", "stocks", "portfolio"],
    responses: [
      "Before investing, complete your 3-month emergency fund (currently 24% done). Then: Cowrywise for dollar-indexed mutual funds, Risevest for real estate fractional investing, Stanbic IBTC for money market returns. Start with ₦10,000/month — consistency beats timing every time.",
    ],
  },
  {
    keywords: ["round", "roundup", "auto", "automatic"],
    responses: [
      "Round-up savings is a behavior hack that works silently. Every time you spend, we round up to the nearest ₦500 and move the difference to your chosen vault. Based on your transaction frequency, you'd save an extra ₦8,000–14,000 monthly without noticing.",
    ],
  },
];

function generateAIResponse(text: string): string {
  const lower = text.toLowerCase();
  for (const pair of AI_PAIRS) {
    if (pair.keywords.some((k) => lower.includes(k))) {
      return pair.responses[Math.floor(Math.random() * pair.responses.length)];
    }
  }
  return "At your current financial trajectory, the single highest-impact action is reducing weekend entertainment by 20%. That adds ₦7,200/month to savings — ₦86,400 compounded over a year. Want to set a Friday night spending cap?";
}

// ─── Score Engine ─────────────────────────────────────────────────────────────

function computeScore(txs: Transaction[], budgets: Budget[]): number {
  const income  = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const impulseAmt   = txs.filter((t) => t.isImpulse).reduce((s, t) => s + t.amount, 0);
  const impulseCount = txs.filter((t) => t.isImpulse).length;
  const lateNightCount = txs.filter((t) => t.type === "expense" && (t.hour ?? 12) >= 21).length;
  const bettingAmt = txs.filter((t) => t.category === "betting").reduce((s, t) => s + t.amount, 0);
  if (income === 0) return 50;
  let score = 100;
  score -= (expenses / income) * 25;
  score -= impulseCount * 3;
  score -= (impulseAmt / income) * 15;
  score -= lateNightCount * 1.5;
  score -= (bettingAmt / income) * 20;
  const overspent = budgets.filter((b) => {
    const spent = txs.filter((t) => t.type === "expense" && t.category === b.category).reduce((s, t) => s + t.amount, 0);
    return spent > b.limit;
  }).length;
  score -= overspent * 4;
  return Math.max(20, Math.min(100, Math.round(score)));
}

function computeMood(score: number, txs: Transaction[]): MascotMood {
  const impulseCount = txs.filter((t) => t.isImpulse && t.type === "expense").length;
  if (score >= 80) return "excited";
  if (score >= 65) return "happy";
  if (impulseCount >= 3) return "concerned";
  return "calm";
}

// ─── Survival Engine ──────────────────────────────────────────────────────────

function computeSurvival(balance: number, txs: Transaction[]): SurvivalReport {
  const recentExpenses = txs.filter((t) => t.type === "expense").slice(0, 10);
  const dailyBurnRate = recentExpenses.length > 0
    ? recentExpenses.reduce((s, t) => s + t.amount, 0) / Math.max(recentExpenses.length, 5)
    : 4000;
  const effectiveDailyRate = dailyBurnRate * 0.7;
  const daysLeft = effectiveDailyRate > 0 ? Math.floor(balance / effectiveDailyRate) : 30;
  const daysToPayday = 8;
  const projectedShortfall = Math.max(0, effectiveDailyRate * daysToPayday - balance);
  let status: SurvivalReport["status"] = "safe";
  let message = "";
  if (daysLeft > daysToPayday + 5) {
    status = "safe";
    message = `You'll comfortably last ${daysLeft} more days at current pace. Next payday in ${daysToPayday} days.`;
  } else if (daysLeft >= daysToPayday) {
    status = "warning";
    message = `${daysLeft} days of runway left. Cut back by ₦${Math.round(effectiveDailyRate * 0.2).toLocaleString("en-NG")}/day to be safe.`;
  } else {
    status = "critical";
    message = `⚠ You may run short ${daysToPayday - daysLeft} days before payday. Reduce daily spend immediately.`;
  }
  return { daysLeft, status, message, dailyBurnRate: Math.round(effectiveDailyRate), projectedShortfall };
}

function detectRecurring(txs: Transaction[]): RecurringPayment[] {
  const groups: Record<string, Transaction[]> = {};
  txs.filter((t) => t.type === "expense").forEach((t) => {
    const key = t.description.toLowerCase().trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  const result: RecurringPayment[] = [];
  Object.entries(groups).forEach(([, list]) => {
    if (list.length >= 2) {
      const amounts = list.map((t) => t.amount);
      const allSame = amounts.every((a) => Math.abs(a - amounts[0]) < amounts[0] * 0.1);
      if (allSame) {
        result.push({ description: list[0].description, amount: list[0].amount, category: list[0].category, frequency: "monthly", lastDate: list[list.length - 1].date });
      }
    }
  });
  return result;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState]         = useState<UserProfile | null>(null);
  const [transactions, setTransactions]     = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals]     = useState<SavingsGoal[]>([]);
  const [coachMessages, setCoachMessages]   = useState<CoachMessage[]>([]);
  const [budgets, setBudgetsState]          = useState<Budget[]>([]);
  const [savingsMissions, setSavingsMissions] = useState<SavingsMission[]>([]);
  const [merchantMemory, setMerchantMemory] = useState<Record<string, TransactionCategory>>({});
  const [pendingCategorization, setPendingCategorization] = useState<PendingCategorization | null>(null);
  const [isLoading, setIsLoading]           = useState(true);

  // Prevent stale closure in confirmCategory
  const transactionsRef = useRef(transactions);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      // Fetch from backend API
      const [txResponse, goalsResponse, budgetsResponse] = await Promise.all([
        zeniApi.getTransactions().catch(() => null),
        zeniApi.getSavingsGoals().catch(() => null),
        zeniApi.getBudgets().catch(() => null),
      ]);

      // Use backend data if available, otherwise use seed data
      if (txResponse?.data) {
        const backendTxs = txResponse.data.map((tx: any) => ({
          id: tx.id,
          amount: tx.amount,
          description: tx.description,
          category: tx.category,
          date: tx.date,
          type: tx.type,
          isImpulse: tx.impulse,
          hour: new Date(tx.date).getHours(),
        }));
        setTransactions(backendTxs);
      } else {
        setTransactions(SEED_TRANSACTIONS);
      }

      if (goalsResponse) {
        const backendGoals = goalsResponse.map((goal: any) => ({
          id: goal.id,
          name: goal.name,
          emoji: goal.emoji,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          deadline: goal.deadline,
          color: "#7B5CF7",
          locked: false,
        }));
        setSavingsGoals(backendGoals);
      } else {
        setSavingsGoals(SEED_GOALS);
      }

      if (budgetsResponse) {
        const backendBudgets = budgetsResponse.map((budget: any) => ({
          category: budget.category,
          limit: budget.limit,
        }));
        setBudgetsState(backendBudgets);
      } else {
        setBudgetsState(SEED_BUDGETS);
      }

      setSavingsMissions(SEED_MISSIONS);
      
      // Load local data for coach messages
      const m = await AsyncStorage.getItem("coachMessages");
      if (m) {
        setCoachMessages(JSON.parse(m));
      } else {
        setCoachMessages([{
          id: "0", role: "ai",
          text: "Hey! I'm Zara — your AI financial companion. I've been analyzing your spending patterns and I have insights that could genuinely change how you relate to money. I detected 3 impulse purchases this month and 5 recurring subscriptions totaling ₦47,000. Want to start there?",
          timestamp: new Date().toISOString(),
        }]);
      }

      const mm = await AsyncStorage.getItem("merchantMemory");
      if (mm) setMerchantMemory(JSON.parse(mm));
      
    } catch (error) {
      console.log("Error loading data:", error);
      // Use seed data as fallback
      setTransactions(SEED_TRANSACTIONS);
      setSavingsGoals(SEED_GOALS);
      setBudgetsState(SEED_BUDGETS);
      setSavingsMissions(SEED_MISSIONS);
      setCoachMessages([{
        id: "0", role: "ai",
        text: "Hey! I'm Zara — your AI financial companion. I've been analyzing your spending patterns and I have insights that could genuinely change how you relate to money. I detected 3 impulse purchases this month and 5 recurring subscriptions totaling ₦47,000. Want to start there?",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const setProfile = async (p: UserProfile) => {
    setProfileState(p);
    await AsyncStorage.setItem("profile", JSON.stringify(p));
  };

  // ─── Transaction Intelligence ──────────────────────────────────────────────

  const addTransaction = async (tx: Omit<Transaction, "id">): Promise<{ pending: boolean }> => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 6);
    const newTx: Transaction = { ...tx, id };

    // Run AI classification
    const classification = classifyTransaction(tx.description, merchantMemory);
    const needsConfirmation = classification.confidence < CONFIDENCE.HIGH && tx.type === "expense";

    // Determine final category
    const finalCategory = classification.category;
    const finalTx: Transaction = { ...newTx, category: finalCategory };

    // Send to backend
    try {
      await zeniApi.createTransaction({
        amount: finalTx.amount,
        description: finalTx.description,
        category: finalTx.category,
        type: finalTx.type,
        date: finalTx.date,
      });
    } catch (error) {
      console.error("Failed to create transaction on backend:", error);
      // Still add locally for offline support
    }

    // Update local state
    const updated = [finalTx, ...transactionsRef.current];
    setTransactions(updated);
    await AsyncStorage.setItem("transactions", JSON.stringify(updated));

    if (needsConfirmation) {
      setPendingCategorization({ tx: finalTx, classification });
      return { pending: true };
    }

    // Learn the merchant automatically
    if (classification.source === "pattern") {
      await learnMerchant(tx.description, classification.category);
    }

    await applyRoundUp(finalTx);
    return { pending: false };
  };

  const confirmCategory = async (txId: string, category: TransactionCategory) => {
    const current = transactionsRef.current;
    const tx = current.find((t) => t.id === txId);
    const updated = current.map((t) => t.id === txId ? { ...t, category } : t);
    setTransactions(updated);
    await AsyncStorage.setItem("transactions", JSON.stringify(updated));
    setPendingCategorization(null);

    // Update on backend
    try {
      if (tx) {
        await zeniApi.updateTransaction(txId, { category });
      }
    } catch (error) {
      console.error("Failed to update transaction on backend:", error);
    }

    // Learn from user correction
    if (tx) {
      await learnMerchant(tx.description, category);
      await applyRoundUp({ ...tx, category });
    }
  };

  const learnMerchant = async (description: string, category: TransactionCategory) => {
    const key = description.toLowerCase().trim().split(" ")[0]; // Use first word as key
    if (key.length < 3) return;
    const updated = { ...merchantMemory, [key]: category };
    setMerchantMemory(updated);
    await AsyncStorage.setItem("merchantMemory", JSON.stringify(updated));
  };

  const clearPendingCategorization = () => setPendingCategorization(null);

  const applyRoundUp = async (tx: Transaction) => {
    if (profile?.roundUpEnabled && tx.type === "expense" && profile.roundUpVaultId) {
      const rounded = Math.ceil(tx.amount / 500) * 500;
      const diff = rounded - tx.amount;
      if (diff > 0) {
        const updatedGoals = savingsGoals.map((g) =>
          g.id === profile.roundUpVaultId
            ? { ...g, currentAmount: Math.min(g.currentAmount + diff, g.targetAmount) }
            : g
        );
        setSavingsGoals(updatedGoals);
        await AsyncStorage.setItem("savingsGoals", JSON.stringify(updatedGoals));
      }
    }
  };

  // ─── Other Actions ─────────────────────────────────────────────────────────

  const addSavingsGoal = async (goal: Omit<SavingsGoal, "id">) => {
    try {
      const newGoal = await zeniApi.createSavingsGoal({
        name: goal.name,
        emoji: goal.emoji,
        targetAmount: goal.targetAmount,
        deadline: goal.deadline,
      });
      
      const fullGoal: SavingsGoal = {
        id: newGoal.id,
        name: newGoal.name,
        emoji: newGoal.emoji,
        targetAmount: newGoal.targetAmount,
        currentAmount: newGoal.currentAmount || 0,
        deadline: newGoal.deadline,
        color: "#7B5CF7",
        locked: false,
      };
      
      const updated = [...savingsGoals, fullGoal];
      setSavingsGoals(updated);
      await AsyncStorage.setItem("savingsGoals", JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to create savings goal:", error);
      // Fallback to local creation
      const fallbackGoal: SavingsGoal = {
        ...goal,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        color: "#7B5CF7",
        locked: false,
      };
      const updated = [...savingsGoals, fallbackGoal];
      setSavingsGoals(updated);
      await AsyncStorage.setItem("savingsGoals", JSON.stringify(updated));
    }
  };

  const updateSavingsGoal = async (id: string, amount: number) => {
    try {
      await zeniApi.updateSavingsGoalProgress(id, amount);
    } catch (error) {
      console.error("Failed to update savings goal on backend:", error);
    }
    
    const updated = savingsGoals.map((g) =>
      g.id === id ? { ...g, currentAmount: Math.min(g.currentAmount + amount, g.targetAmount) } : g
    );
    setSavingsGoals(updated);
    await AsyncStorage.setItem("savingsGoals", JSON.stringify(updated));
  };

  const setBudget = async (category: TransactionCategory, limit: number) => {
    try {
      const existing = budgets.find((b) => b.category === category);
      if (existing) {
        await zeniApi.updateBudget(category, { limit });
      } else {
        await zeniApi.createBudget({ category, limit });
      }
    } catch (error) {
      console.error("Failed to update budget on backend:", error);
    }

    const existing = budgets.find((b) => b.category === category);
    const updated = existing
      ? budgets.map((b) => (b.category === category ? { ...b, limit } : b))
      : [...budgets, { category, limit }];
    setBudgetsState(updated);
    await AsyncStorage.setItem("budgets", JSON.stringify(updated));
  };

  const progressMission = async (id: string) => {
    const updated = savingsMissions.map((m) => {
      if (m.id !== id) return m;
      const next = Math.min(m.currentDays + 1, m.targetDays);
      return { ...m, currentDays: next, completed: next >= m.targetDays };
    });
    setSavingsMissions(updated);
    await AsyncStorage.setItem("savingsMissions", JSON.stringify(updated));
  };

  const toggleRoundUp = async (vaultId?: string) => {
    const updated: UserProfile = {
      ...(profile ?? { name: "Zeni User", currency: "NGN", monthlyIncome: 280000, financialPersonality: "Financial Explorer", onboardingComplete: false, savingsStreak: 0 }),
      roundUpEnabled: !profile?.roundUpEnabled,
      roundUpVaultId: vaultId ?? profile?.roundUpVaultId,
    };
    setProfileState(updated);
    await AsyncStorage.setItem("profile", JSON.stringify(updated));
  };

  const sendCoachMessage = async (text: string) => {
    const userMsg: CoachMessage = { id: Date.now().toString(), role: "user", text, timestamp: new Date().toISOString() };
    const aiText = generateAIResponse(text);
    const aiMsg: CoachMessage = { id: (Date.now() + 1).toString(), role: "ai", text: aiText, timestamp: new Date().toISOString() };
    const updated = [...coachMessages, userMsg, aiMsg];
    setCoachMessages(updated);
    await AsyncStorage.setItem("coachMessages", JSON.stringify(updated));
  };

  // ─── Computed Values ───────────────────────────────────────────────────────

  const categorySpending = (): Record<TransactionCategory, number> => {
    const result = {} as Record<TransactionCategory, number>;
    const cats: TransactionCategory[] = ["food","transport","entertainment","utilities","shopping","health","income","education","rent","betting","subscriptions","transfers","other"];
    cats.forEach((c) => { result[c] = 0; });
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      result[t.category] = (result[t.category] || 0) + t.amount;
    });
    return result;
  };

  const categoryAverage = (cat: TransactionCategory): number => {
    const catTxs = transactions.filter((t) => t.category === cat && t.type === "expense");
    if (catTxs.length === 0) return 0;
    return catTxs.reduce((s, t) => s + t.amount, 0) / catTxs.length;
  };

  const survivalReport    = (): SurvivalReport => computeSurvival(balance, transactions);
  const recurringPayments = (): RecurringPayment[] => detectRecurring(transactions);

  const budgetStatus = () => {
    const spending = categorySpending();
    return budgets.map((b) => {
      const spent = spending[b.category] ?? 0;
      const pct = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : 0;
      return { category: b.category, spent, limit: b.limit, pct };
    });
  };

  const income   = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance  = income - expenses;
  const score    = computeScore(transactions, budgets);

  return (
    <AppContext.Provider value={{
      profile, transactions, savingsGoals, coachMessages, budgets, savingsMissions,
      mascotMood: computeMood(score, transactions),
      balance, totalIncome: income, totalExpenses: expenses,
      financialScore: score,
      savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
      isLoading,
      merchantMemory, pendingCategorization,
      setProfile, addTransaction, confirmCategory, learnMerchant, clearPendingCategorization,
      addSavingsGoal, updateSavingsGoal, sendCoachMessage, setBudget, progressMission, toggleRoundUp,
      categorySpending, survivalReport, recurringPayments, budgetStatus, categoryAverage,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
