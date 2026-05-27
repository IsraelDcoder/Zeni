// Wallet Service: Manage user savings, wallet ledger, and transactions
import { supabaseAdmin, supabaseClient } from "./supabase";

type Wallet = any;
type WalletTransaction = any;
type SavingsGoal = any;

export class WalletService {
  /**
   * Get or create user wallet
   */
  async getOrCreateWallet(userId: string) {
    try {
      // Try to get existing wallet
      const { data: wallet, error } = await supabaseClient
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (wallet) {
        return wallet;
      }

      // Create new wallet if doesn't exist
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from("wallets")
        .insert({
          user_id: userId,
          balance: 0,
          currency: "NGN",
          total_saved: 0,
          total_withdrawn: 0,
          locked_balance: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating wallet:", createError);
        throw new Error(`Failed to create wallet: ${createError.message}`);
      }

      if (!newWallet) {
        throw new Error("Failed to create wallet: returned data is null");
      }

      return newWallet;
    } catch (error) {
      console.error("Error in getOrCreateWallet:", error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(userId: string) {
    try {
      const { data, error } = await supabaseClient
        .from("wallets")
        .select("balance, locked_balance, total_saved, total_withdrawn")
        .eq("user_id", userId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch wallet balance: ${error.message}`);
      }

      if (!data) {
        throw new Error("Wallet balance data is null");
      }

      return data;
    } catch (error) {
      console.error("Error in getWalletBalance:", error);
      throw error;
    }
  }

  /**
   * Add funds to wallet (manual or auto-save)
   */
  async depositToWallet(
    userId: string,
    amount: number,
    source: "manual_save" | "auto_save" | "round_up" | "interest",
    description: string,
    referenceId?: string
  ) {
    try {
      // Get wallet
      const wallet = await this.getOrCreateWallet(userId);

      // Create transaction record
      const { data: transaction, error: txError } = await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          wallet_id: wallet.id,
          user_id: userId,
          amount: amount,
          type: "deposit",
          source: source,
          description: description,
          reference_id: referenceId,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) {
        throw new Error(
          `Failed to create transaction: ${txError.message}`
        );
      }

      // Update wallet balance
      const newBalance = parseFloat(wallet.balance.toString()) + amount;
      const newTotalSaved = parseFloat(wallet.total_saved.toString()) + amount;

      const { error: updateError } = await supabaseAdmin
        .from("wallets")
        .update({
          balance: newBalance,
          total_saved: newTotalSaved,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      if (updateError) {
        throw new Error(`Failed to update wallet: ${updateError.message}`);
      }

      return {
        transaction,
        newBalance,
      };
    } catch (error) {
      console.error("Error in depositToWallet:", error);
      throw error;
    }
  }

  /**
   * Withdraw funds from wallet
   */
  async withdrawFromWallet(
    userId: string,
    amount: number,
    description: string
  ) {
    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (parseFloat(wallet.balance.toString()) < amount) {
        throw new Error("Insufficient wallet balance");
      }

      // Create transaction
      const { data: transaction, error: txError } = await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          wallet_id: wallet.id,
          user_id: userId,
          amount: amount,
          type: "withdrawal",
          source: "manual_withdrawal",
          description: description,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) {
        throw new Error(
          `Failed to create transaction: ${txError.message}`
        );
      }

      // Update wallet
      const newBalance = parseFloat(wallet.balance.toString()) - amount;
      const newWithdrawn =
        parseFloat(wallet.total_withdrawn.toString()) + amount;

      const { error: updateError } = await supabaseAdmin
        .from("wallets")
        .update({
          balance: newBalance,
          total_withdrawn: newWithdrawn,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      if (updateError) {
        throw new Error(`Failed to update wallet: ${updateError.message}`);
      }

      return {
        transaction,
        newBalance,
      };
    } catch (error) {
      console.error("Error in withdrawFromWallet:", error);
      throw error;
    }
  }

  /**
   * Get wallet transaction history
   */
  async getWalletTransactionHistory(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabaseClient
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch transaction history: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error in getWalletTransactionHistory:", error);
      throw error;
    }
  }

  /**
   * Create savings goal
   */
  async createSavingsGoal(
    userId: string,
    name: string,
    targetAmount: number,
    category: string,
    targetDate?: string,
    description?: string
  ) {
    try {
      const wallet = await this.getOrCreateWallet(userId);

      const { data, error } = await supabaseAdmin
        .from("savings_goals")
        .insert({
          user_id: userId,
          wallet_id: wallet.id,
          name,
          description,
          target_amount: targetAmount,
          current_amount: 0,
          target_date: targetDate,
          category,
          is_locked: false,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create savings goal: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error in createSavingsGoal:", error);
      throw error;
    }
  }

  /**
   * Get savings goals
   */
  async getSavingsGoals(userId: string) {
    try {
      const { data, error } = await supabaseClient
        .from("savings_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch savings goals: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error in getSavingsGoals:", error);
      throw error;
    }
  }

  /**
   * Update savings goal progress
   */
  async updateSavingsGoalProgress(
    goalId: string,
    amount: number,
    operation: "add" | "subtract" = "add"
  ) {
    try {
      const { data: goal, error: fetchError } = await supabaseClient
        .from("savings_goals")
        .select("current_amount, target_amount")
        .eq("id", goalId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch goal: ${fetchError.message}`);
      }

      const current = parseFloat(goal.current_amount.toString());
      const newAmount =
        operation === "add" ? current + amount : current - amount;

      const status =
        newAmount >= parseFloat(goal.target_amount.toString())
          ? "completed"
          : "active";

      const { error: updateError } = await supabaseAdmin
        .from("savings_goals")
        .update({
          current_amount: newAmount,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", goalId);

      if (updateError) {
        throw new Error(`Failed to update goal: ${updateError.message}`);
      }

      return { success: true, status };
    } catch (error) {
      console.error("Error in updateSavingsGoalProgress:", error);
      throw error;
    }
  }
}

export default new WalletService();
