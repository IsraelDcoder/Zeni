/**
 * Wallet Service - Manages user savings wallets and ledger
 * Integrates with payment processors for fund movements
 */

import { supabaseAdmin } from "./supabase.js";

export interface Wallet {
  id: string;
  userId: string;
  type: "savings" | "vault" | "emergency" | "goal";
  name: string;
  balance: number;
  currencyCode: string;
  isLocked: boolean;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: "credit" | "debit" | "transfer" | "interest";
  amount: number;
  description: string;
  reference: string;
  bankTransactionId?: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export interface WalletLedger {
  walletId: string;
  totalCredits: number;
  totalDebits: number;
  netBalance: number;
  transactionCount: number;
  lastTransactionAt?: string;
}

class WalletService {
  /**
   * Create a new wallet for user
   */
  async createWallet(
    userId: string,
    type: Wallet["type"],
    name: string
  ): Promise<Wallet> {
    const { data, error } = await supabaseAdmin.from("wallets").insert({
      user_id: userId,
      type,
      name,
      balance: 0,
      currency_code: "NGN",
      is_locked: false,
    });

    if (error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }

    return this.formatWallet(data[0]);
  }

  /**
   * Get user's wallets
   */
  async getUserWallets(userId: string): Promise<Wallet[]> {
    const { data, error } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch wallets: ${error.message}`);
    }

    return data?.map(this.formatWallet) || [];
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<Wallet | null> {
    const { data, error } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("id", walletId)
      .single();

    if (error) return null;
    return data ? this.formatWallet(data) : null;
  }

  /**
   * Record a wallet transaction
   */
  async recordTransaction(
    walletId: string,
    type: WalletTransaction["type"],
    amount: number,
    description: string,
    reference: string,
    bankTransactionId?: string
  ): Promise<WalletTransaction> {
    // Get current wallet balance
    const wallet = await this.getWallet(walletId);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Calculate new balance
    const newBalance =
      type === "debit" ? wallet.balance - amount : wallet.balance + amount;

    if (newBalance < 0) {
      throw new Error("Insufficient wallet balance");
    }

    // Record transaction
    const { data: txnData, error: txnError } = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        wallet_id: walletId,
        type,
        amount,
        description,
        reference,
        bank_transaction_id: bankTransactionId,
        status: "completed",
      });

    if (txnError) {
      throw new Error(`Failed to record transaction: ${txnError.message}`);
    }

    // Update wallet balance
    await supabaseAdmin
      .from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", walletId);

    return this.formatTransaction(txnData[0]);
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(
    walletId: string,
    limit: number = 50
  ): Promise<WalletTransaction[]> {
    const { data, error } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return data?.map(this.formatTransaction) || [];
  }

  /**
   * Get wallet ledger summary
   */
  async getWalletLedger(walletId: string): Promise<WalletLedger> {
    const { data, error } = await supabaseAdmin
      .from("wallet_transactions")
      .select("type, amount, created_at")
      .eq("wallet_id", walletId);

    if (error) {
      throw new Error(`Failed to fetch ledger: ${error.message}`);
    }

    const transactions = data || [];
    const totalCredits = transactions
      .filter((t) => ["credit", "interest"].includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = transactions
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      walletId,
      totalCredits,
      totalDebits,
      netBalance: totalCredits - totalDebits,
      transactionCount: transactions.length,
      lastTransactionAt:
        transactions.length > 0 ? transactions[0].created_at : undefined,
    };
  }

  /**
   * Lock wallet until specified date
   */
  async lockWallet(walletId: string, lockedUntil: string): Promise<Wallet> {
    const { data, error } = await supabaseAdmin
      .from("wallets")
      .update({
        is_locked: true,
        locked_until: lockedUntil,
      })
      .eq("id", walletId);

    if (error) {
      throw new Error(`Failed to lock wallet: ${error.message}`);
    }

    return this.formatWallet(data[0]);
  }

  /**
   * Unlock wallet
   */
  async unlockWallet(walletId: string): Promise<Wallet> {
    const { data, error } = await supabaseAdmin
      .from("wallets")
      .update({
        is_locked: false,
        locked_until: null,
      })
      .eq("id", walletId);

    if (error) {
      throw new Error(`Failed to unlock wallet: ${error.message}`);
    }

    return this.formatWallet(data[0]);
  }

  /**
   * Transfer between wallets
   */
  async transferBetweenWallets(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    // Debit from source
    await this.recordTransaction(
      fromWalletId,
      "transfer",
      amount,
      `Transfer to wallet ${toWalletId}`,
      `transfer_${Date.now()}`
    );

    // Credit to destination
    await this.recordTransaction(
      toWalletId,
      "transfer",
      amount,
      `Received from wallet ${fromWalletId}`,
      `transfer_${Date.now()}`
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private formatWallet(raw: any): Wallet {
    return {
      id: raw.id,
      userId: raw.user_id,
      type: raw.type,
      name: raw.name,
      balance: raw.balance,
      currencyCode: raw.currency_code,
      isLocked: raw.is_locked,
      lockedUntil: raw.locked_until,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  private formatTransaction(raw: any): WalletTransaction {
    return {
      id: raw.id,
      walletId: raw.wallet_id,
      type: raw.type,
      amount: raw.amount,
      description: raw.description,
      reference: raw.reference,
      bankTransactionId: raw.bank_transaction_id,
      status: raw.status,
      createdAt: raw.created_at,
    };
  }
}

export const walletService = new WalletService();
