/**
 * Savings Service - Manages automated savings, goals, and AI Safe Save
 * Integrates with wallet service and payment processors
 */

import { supabaseAdmin } from "./supabase.js";
import { walletService } from "./wallet.js";
import { claudeService } from "./claude.js";

export interface SavingsGoal {
  id: string;
  userId: string;
  walletId: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
  isLocked: boolean;
  lockReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsAutomation {
  id: string;
  userId: string;
  walletId: string;
  type: "percentage" | "fixed" | "roundup" | "ai_safe_save";
  frequency: "daily" | "weekly" | "monthly";
  amount?: number;
  percentage?: number;
  isActive: boolean;
  nextScheduledDate: string;
  createdAt: string;
}

export interface AISafeSave {
  userId: string;
  recommendedAmount: number;
  reasoning: string;
  safetyScore: number;
  survivalDaysAfter: number;
  maxRecommendedAmount: number;
}

class SavingsService {
  /**
   * Create a savings goal
   */
  async createSavingsGoal(
    userId: string,
    walletId: string,
    name: string,
    emoji: string,
    targetAmount: number,
    deadline: string,
    color: string = "#7B5CF7"
  ): Promise<SavingsGoal> {
    const { data, error } = await supabaseAdmin
      .from("savings_goals")
      .insert({
        user_id: userId,
        wallet_id: walletId,
        name,
        emoji,
        target_amount: targetAmount,
        current_amount: 0,
        deadline,
        color,
        is_locked: false,
      });

    if (error) {
      throw new Error(`Failed to create savings goal: ${error.message}`);
    }

    if (!data || !data[0]) {
      throw new Error("Failed to create savings goal: no data returned");
    }

    return this.formatGoal(data[0]);
  }

  /**
   * Get user's savings goals
   */
  async getUserSavingsGoals(userId: string): Promise<SavingsGoal[]> {
    const { data, error } = await supabaseAdmin
      .from("savings_goals")
      .select("*")
      .eq("user_id", userId)
      .order("deadline", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch savings goals: ${error.message}`);
    }

    return data?.map((g) => this.formatGoal(g)) || [];
  }

  /**
   * Update savings goal progress
   */
  async updateGoalProgress(
    goalId: string,
    amount: number
  ): Promise<SavingsGoal> {
    // Get current goal
    const { data: goal } = await supabaseAdmin
      .from("savings_goals")
      .select("*")
      .eq("id", goalId)
      .single();

    if (!goal) {
      throw new Error("Savings goal not found");
    }

    const newAmount = Math.min(goal.current_amount + amount, goal.target_amount);

    const { data, error } = await supabaseAdmin
      .from("savings_goals")
      .update({
        current_amount: newAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", goalId);

    if (error) {
      throw new Error(`Failed to update goal: ${error.message}`);
    }

    if (!data || !data[0]) {
      throw new Error("Failed to update goal: no data returned");
    }

    return this.formatGoal(data[0]);
  }

  /**
   * Lock a savings goal (prevents withdrawals)
   */
  async lockGoal(goalId: string, reason: string): Promise<SavingsGoal> {
    const { data, error } = await supabaseAdmin
      .from("savings_goals")
      .update({
        is_locked: true,
        lock_reason: reason,
      })
      .eq("id", goalId);

    if (error) {
      throw new Error(`Failed to lock goal: ${error.message}`);
    }

    if (!data || !data[0]) {
      throw new Error("Failed to lock goal: no data returned");
    }

    return this.formatGoal(data[0]);
  }

  /**
   * Create automated savings
   */
  async createSavingsAutomation(
    userId: string,
    walletId: string,
    type: SavingsAutomation["type"],
    frequency: SavingsAutomation["frequency"],
    amount?: number,
    percentage?: number
  ): Promise<SavingsAutomation> {
    const nextScheduledDate = this.calculateNextScheduleDate(frequency);

    const { data, error } = await supabaseAdmin
      .from("savings_automations")
      .insert({
        user_id: userId,
        wallet_id: walletId,
        type,
        frequency,
        amount,
        percentage,
        is_active: true,
        next_scheduled_date: nextScheduledDate,
      });

    if (error) {
      throw new Error(
        `Failed to create savings automation: ${error.message}`
      );
    }

    if (!data || !data[0]) {
      throw new Error("Failed to create savings automation: no data returned");
    }

    return this.formatAutomation(data[0]);
  }

  /**
   * Get user's savings automations
   */
  async getUserSavingsAutomations(userId: string): Promise<SavingsAutomation[]> {
    const { data, error } = await supabaseAdmin
      .from("savings_automations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      throw new Error(`Failed to fetch automations: ${error.message}`);
    }

    return data?.map((a) => this.formatAutomation(a)) || [];
  }

  /**
   * Calculate AI Safe Save recommendation
   * Based on spending patterns, survival analysis, and financial health
   */
  async calculateAISafeSave(userId: string): Promise<AISafeSave> {
    // Get user's recent transactions
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte(
        "date",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );

    if (!transactions || transactions.length === 0) {
      return {
        userId,
        recommendedAmount: 5000,
        reasoning: "Insufficient transaction history. Start small.",
        safetyScore: 50,
        survivalDaysAfter: 30,
        maxRecommendedAmount: 10000,
      };
    }

    // Calculate metrics
    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const dailyBurnRate = expenses / 30;

    // Get user balance (from transactions or wallet)
    const { data: userWallets } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .eq("type", "savings");

    const savingsBalance = userWallets?.[0]?.balance || 0;

    // Format transactions for Claude analysis
    const formattedTransactions = transactions.map((t: any) => ({
      category: t.category || "other",
      amount: t.amount || 0,
      description: t.description || t.category || "Transaction",
      date: t.date || new Date().toISOString(),
    }));

    // Get monthly income (calculate from transactions)
    const monthlyIncome = income > 0 ? income : expenses * 1.2; // If no income recorded, estimate as 1.2x expenses

    // AI analysis using Claude
    const analysis = await claudeService.analyzeSavingsPotential({
      userId,
      transactions: formattedTransactions,
      monthlyIncome,
      emergencyFund: savingsBalance,
    });

    return {
      userId,
      recommendedAmount: analysis.recommendedMonthly,
      reasoning: analysis.analysis,
      safetyScore: analysis.safetyScore,
      survivalDaysAfter: analysis.survivalDaysAfterSaving,
      maxRecommendedAmount: Math.floor(analysis.potentialAnnualSavings / 12 * 0.5),
    };
  }

  /**
   * Execute scheduled savings
   * Called by cron job or event trigger
   */
  async executeScheduledSavings(automationId: string): Promise<void> {
    // Get automation
    const { data: automation } = await supabaseAdmin
      .from("savings_automations")
      .select("*")
      .eq("id", automationId)
      .single();

    if (!automation || !automation.is_active) {
      return;
    }

    // Calculate amount to save
    let amountToSave = automation.amount || 0;

    if (automation.type === "percentage") {
      // Get user's last transaction amount to calculate percentage
      const { data: lastTx } = await supabaseAdmin
        .from("transactions")
        .select("amount")
        .eq("user_id", automation.user_id)
        .eq("type", "expense")
        .order("date", { ascending: false })
        .limit(1)
        .single();

      if (lastTx) {
        amountToSave = Math.floor(lastTx.amount * (automation.percentage || 0.1));
      }
    } else if (automation.type === "roundup") {
      // Round-up logic would integrate with bank API
      amountToSave = 500; // Placeholder
    } else if (automation.type === "ai_safe_save") {
      const aiSave = await this.calculateAISafeSave(automation.user_id);
      amountToSave = aiSave.recommendedAmount;
    }

    // Record the transaction
    if (amountToSave > 0) {
      await walletService.recordTransaction(
        automation.wallet_id,
        "credit",
        amountToSave,
        `Automated ${automation.type} savings`,
        `auto_save_${automationId}`
      );
    }

    // Update next scheduled date
    const nextDate = this.calculateNextScheduleDate(automation.frequency);
    await supabaseAdmin
      .from("savings_automations")
      .update({ next_scheduled_date: nextDate })
      .eq("id", automationId);
  }

  /**
   * Get savings summary for user
   */
  async getSavingsSummary(userId: string) {
    const goals = await this.getUserSavingsGoals(userId);
    const automations = await this.getUserSavingsAutomations(userId);
    const { data: wallets } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .eq("type", "savings");

    const totalSavings = wallets?.reduce((sum, w) => sum + w.balance, 0) || 0;
    const totalGoalAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalGoalProgress = goals.reduce((sum, g) => sum + g.currentAmount, 0);

    return {
      totalSavings,
      totalGoals: goals.length,
      totalGoalAmount,
      totalGoalProgress,
      progressPercentage:
        totalGoalAmount > 0
          ? Math.round((totalGoalProgress / totalGoalAmount) * 100)
          : 0,
      automations: automations.length,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private formatGoal(raw: any): SavingsGoal {
    return {
      id: raw.id,
      userId: raw.user_id,
      walletId: raw.wallet_id,
      name: raw.name,
      emoji: raw.emoji,
      targetAmount: raw.target_amount,
      currentAmount: raw.current_amount,
      deadline: raw.deadline,
      color: raw.color,
      isLocked: raw.is_locked,
      lockReason: raw.lock_reason,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  private formatAutomation(raw: any): SavingsAutomation {
    return {
      id: raw.id,
      userId: raw.user_id,
      walletId: raw.wallet_id,
      type: raw.type,
      frequency: raw.frequency,
      amount: raw.amount,
      percentage: raw.percentage,
      isActive: raw.is_active,
      nextScheduledDate: raw.next_scheduled_date,
      createdAt: raw.created_at,
    };
  }

  private calculateNextScheduleDate(frequency: string): string {
    const now = new Date();
    let nextDate = new Date(now);

    switch (frequency) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    return nextDate.toISOString();
  }
}

export const savingsService = new SavingsService();
