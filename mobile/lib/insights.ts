import type { Budget, Transaction, TransactionCategory } from "@/context/AppContext";

export interface TransactionInsight {
  id: string;
  type: "budget" | "velocity" | "impulse" | "pattern" | "survival" | "positive" | "category";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "positive";
  icon: string;
  color: string;
  actionLabel?: string;
}

// ─── Post-transaction insights (shown right after adding a tx) ────────────────

export function getPostTransactionInsights(
  tx: Transaction,
  allTransactions: Transaction[],
  budgets: Budget[],
  balance: number,
  monthlyIncome: number
): TransactionInsight[] {
  const insights: TransactionInsight[] = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTxs = allTransactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // 1. Budget alert for this category
  if (tx.type === "expense") {
    const budget = budgets.find((b) => b.category === tx.category);
    if (budget) {
      const spent = monthlyTxs
        .filter((t) => t.type === "expense" && t.category === tx.category)
        .reduce((s, t) => s + t.amount, 0);
      const pct = Math.round((spent / budget.limit) * 100);

      if (pct >= 100) {
        insights.push({
          id: "budget-over",
          type: "budget",
          title: "Budget exceeded",
          message: `You've spent ${pct}% of your ${tx.category} budget this month. Try to hold off for now.`,
          severity: "critical",
          icon: "alert-triangle",
          color: "#FF4757",
          actionLabel: "Adjust budget",
        });
      } else if (pct >= 80) {
        insights.push({
          id: "budget-near",
          type: "budget",
          title: "Budget nearly full",
          message: `You've used ${pct}% of your ${tx.category} budget. ₦${(budget.limit - spent).toLocaleString("en-NG")} left.`,
          severity: "warning",
          icon: "alert-circle",
          color: "#F5A623",
        });
      }
    }

    // 2. Late-night spending pattern
    const hour = tx.hour ?? now.getHours();
    if (hour >= 21) {
      const lateNightCount = allTransactions.filter(
        (t) => t.type === "expense" && (t.hour ?? 0) >= 21
      ).length;
      if (lateNightCount >= 3) {
        insights.push({
          id: "late-night",
          type: "pattern",
          title: "Late-night spending",
          message: `${lateNightCount} late-night transactions this month. Consider setting a 9PM financial curfew.`,
          severity: "warning",
          icon: "moon",
          color: "#7B5CF7",
        });
      }
    }

    // 3. Impulse spending pattern
    const impulseCount = allTransactions.filter((t) => t.isImpulse && t.type === "expense").length;
    if (tx.isImpulse && impulseCount >= 2) {
      insights.push({
        id: "impulse",
        type: "impulse",
        title: "Impulse spending detected",
        message: `This is your ${impulseCount}${ordinal(impulseCount)} impulse purchase this month. The 24-hour rule helps.`,
        severity: "warning",
        icon: "zap",
        color: "#EC4899",
        actionLabel: "Learn more",
      });
    }

    // 4. Spending velocity / survival
    const recentExpenses = allTransactions.filter((t) => t.type === "expense").slice(0, 10);
    const avgDaily = recentExpenses.reduce((s, t) => s + t.amount, 0) / Math.max(7, 1);
    const daysToPayday = Math.max(1, 30 - now.getDate());
    const projected = avgDaily * daysToPayday;

    if (projected > balance * 0.85 && balance > 0) {
      insights.push({
        id: "velocity",
        type: "velocity",
        title: "Pace check",
        message: `At ₦${Math.round(avgDaily).toLocaleString("en-NG")}/day, you'll spend ₦${Math.round(projected).toLocaleString("en-NG")} before payday. Consider slowing down.`,
        severity: projected > balance ? "critical" : "warning",
        icon: "trending-down",
        color: projected > balance ? "#FF4757" : "#F5A623",
      });
    }
  }

  // 5. Positive reinforcement
  if (tx.type === "expense" && !tx.isImpulse) {
    const catTxs = allTransactions.filter(
      (t) => t.type === "expense" && t.category === tx.category && t.id !== tx.id
    );
    if (catTxs.length >= 2) {
      const avg = catTxs.reduce((s, t) => s + t.amount, 0) / catTxs.length;
      if (tx.amount < avg * 0.75) {
        insights.push({
          id: "positive-spend",
          type: "positive",
          title: "Spending smart",
          message: `You spent 25% less than usual on ${tx.category} today. Keep this up!`,
          severity: "positive",
          icon: "check-circle",
          color: "#00D9C0",
        });
      }
    }
  }

  if (tx.type === "income") {
    insights.push({
      id: "income-received",
      type: "positive",
      title: "Income received",
      message: `₦${tx.amount.toLocaleString("en-NG")} added to your balance. A great time to top up your savings goals!`,
      severity: "positive",
      icon: "trending-up",
      color: "#10B981",
      actionLabel: "Add to savings",
    });
  }

  return insights;
}

// ─── Ambient home-screen insights (always visible) ───────────────────────────

export function getAmbientInsights(
  transactions: Transaction[],
  budgets: Budget[],
  balance: number,
  monthlyIncome: number
): TransactionInsight[] {
  const insights: TransactionInsight[] = [];
  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const expenses = thisMonth.filter((t) => t.type === "expense");
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  // Spending velocity
  const dayOfMonth = now.getDate();
  const avgDaily = dayOfMonth > 0 ? totalExpenses / dayOfMonth : 0;
  const daysLeft = 30 - dayOfMonth;
  const projected = totalExpenses + avgDaily * daysLeft;

  if (projected > monthlyIncome * 0.95) {
    insights.push({
      id: "projected-over",
      type: "velocity",
      title: `Projected to spend ₦${Math.round(projected / 1000)}k this month`,
      message: `You're spending ₦${Math.round(avgDaily).toLocaleString("en-NG")}/day. Trim ₦${Math.round(avgDaily * 0.2).toLocaleString("en-NG")}/day to stay safe.`,
      severity: "warning",
      icon: "trending-up",
      color: "#F5A623",
    });
  }

  // Category spike detection
  const catSpend: Partial<Record<TransactionCategory, number>> = {};
  expenses.forEach((t) => {
    catSpend[t.category] = (catSpend[t.category] ?? 0) + t.amount;
  });

  for (const budget of budgets) {
    const spent = catSpend[budget.category] ?? 0;
    const pct = (spent / budget.limit) * 100;
    if (pct >= 90) {
      insights.push({
        id: `budget-${budget.category}`,
        type: "budget",
        title: `${cap(budget.category)} budget at ${Math.round(pct)}%`,
        message: pct >= 100
          ? `You've exceeded your ${budget.category} budget by ₦${(spent - budget.limit).toLocaleString("en-NG")}.`
          : `₦${(budget.limit - spent).toLocaleString("en-NG")} remaining in ${budget.category} for this month.`,
        severity: pct >= 100 ? "critical" : "warning",
        icon: "pie-chart",
        color: pct >= 100 ? "#FF4757" : "#F5A623",
      });
    }
  }

  // Impulse detection
  const impulseTotal = expenses.filter((t) => t.isImpulse).reduce((s, t) => s + t.amount, 0);
  if (impulseTotal > monthlyIncome * 0.2) {
    insights.push({
      id: "impulse-total",
      type: "impulse",
      title: `₦${Math.round(impulseTotal / 1000)}k on impulse purchases`,
      message: `That's ${Math.round((impulseTotal / monthlyIncome) * 100)}% of your income on unplanned spending this month.`,
      severity: "warning",
      icon: "zap",
      color: "#EC4899",
    });
  }

  // Positive: savings rate
  const income = thisMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  if (income > 0) {
    const savingsRate = Math.max(0, (income - totalExpenses) / income);
    if (savingsRate >= 0.25) {
      insights.push({
        id: "savings-great",
        type: "positive",
        title: `${Math.round(savingsRate * 100)}% savings rate this month`,
        message: "You're saving a healthy portion of your income. Financial discipline pays off.",
        severity: "positive",
        icon: "star",
        color: "#00D9C0",
      });
    }
  }

  return insights.slice(0, 4);
}

// ─── Spending velocity label ──────────────────────────────────────────────────

export function getSpendingVelocity(
  transactions: Transaction[]
): { label: string; rate: number; trend: "up" | "down" | "stable"; color: string } {
  const now = new Date();
  const recent = transactions
    .filter((t) => t.type === "expense")
    .slice(0, 14);

  if (recent.length === 0) {
    return { label: "₦0/day", rate: 0, trend: "stable", color: "#00D9C0" };
  }

  const total = recent.reduce((s, t) => s + t.amount, 0);
  const rate = total / 7;

  const firstHalf = recent.slice(7).reduce((s, t) => s + t.amount, 0);
  const secondHalf = recent.slice(0, 7).reduce((s, t) => s + t.amount, 0);

  const trend: "up" | "down" | "stable" =
    secondHalf > firstHalf * 1.15 ? "up"
    : secondHalf < firstHalf * 0.85 ? "down"
    : "stable";

  const color = trend === "up" ? "#FF4757" : trend === "down" ? "#00D9C0" : "#F5A623";

  const label = rate >= 1000
    ? `₦${(rate / 1000).toFixed(1)}k/day`
    : `₦${Math.round(rate)}/day`;

  return { label, rate, trend, color };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function cap(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
