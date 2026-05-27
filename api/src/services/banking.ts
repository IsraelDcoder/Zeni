/**
 * Banking Service - Open Banking Integration
 * 
 * This service handles the bridge between Zeni and banks via Mono/Okra.
 * 
 * Flow:
 * 1. User clicks "Connect Bank"
 * 2. Open Banking SDK opens (user never gives password to Zeni)
 * 3. User logs into bank securely (Mono/Okra handles this)
 * 4. User grants permissions (balance, transactions, debit auth)
 * 5. API returns access token to Zeni backend
 * 6. Zeni backend uses token to fetch balances, transactions, initiate debits
 */

import axios, { AxiosInstance } from "axios";
import { supabaseAdmin } from "./supabase.js";

// ─── Types ─────────────────────────────────────────────────────────────

export interface ConnectedBank {
  id: string;
  userId: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  accountType: "savings" | "current";
  provider: "mono" | "okra";
  accessToken: string;
  monoCustomerId?: string;
  okraCustomerId?: string;
  isActive: boolean;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  accountType: string;
  balance: number;
  currency: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  type: "debit" | "credit";
  description: string;
  balance: number;
  merchant?: string;
  category?: string;
  reference: string;
}

export interface SyncResult {
  success: boolean;
  transactionsFetched: number;
  lastSync: string;
  newTransactions: BankTransaction[];
}

// ─── Banking Service ──────────────────────────────────────────────────

class BankingService {
  private monoClient: AxiosInstance;
  private okraClient: AxiosInstance;

  constructor() {
    // Mono API Client
    this.monoClient = axios.create({
      baseURL: "https://api.mono.co/api/v1",
      headers: {
        "mono-sec-key": process.env.MONO_SECRET_KEY || "",
        "Content-Type": "application/json",
      },
    });

    // Okra API Client
    this.okraClient = axios.create({
      baseURL: "https://api.okra.ng/api/v1",
      headers: {
        Authorization: `Bearer ${process.env.OKRA_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * STEP 1: Get SDK link for bank connection
   * Returns URL for mobile app to open Open Banking SDK
   */
  async getAuthorizationUrl(provider: "mono" | "okra"): Promise<string> {
    if (provider === "mono") {
      // Mono SDK initialization URL
      // In production, return URL that opens Mono Connect widget
      const monoPublicKey = process.env.MONO_PUBLIC_KEY || "";
      return `https://connect.mono.co/?key=${monoPublicKey}`;
    } else {
      // Okra SDK initialization URL
      const okraPublicKey = process.env.OKRA_PUBLIC_KEY || "";
      return `https://www.okra.ng/connect/?client_id=${okraPublicKey}`;
    }
  }

  /**
   * STEP 5: Handle OAuth callback after user authorizes
   * Exchange authorization code for access token
   */
  async handleOAuthCallback(
    userId: string,
    code: string,
    provider: "mono" | "okra"
  ): Promise<ConnectedBank> {
    try {
      let accessToken: string;
      let customerId: string;
      let accountData: BankAccount;

      if (provider === "mono") {
        // Exchange code for Mono access token
        const response = await this.monoClient.post("/auth/login", {
          code,
        });

        accessToken = response.data.data.accessToken;
        customerId = response.data.data.id;

        // Fetch account details
        accountData = await this.getAccountBalance(accessToken, provider);
      } else {
        // Exchange code for Okra access token
        const response = await this.okraClient.post("/auth/getAccessToken", {
          code,
          client_id: process.env.OKRA_CLIENT_ID,
          client_secret: process.env.OKRA_CLIENT_SECRET,
        });

        accessToken = response.data.data.accessToken;
        customerId = response.data.data.customerId;

        // Fetch account details
        accountData = await this.getAccountBalance(accessToken, provider);
      }

      // Store in database
      const { data: connectedBank, error } = await supabaseAdmin
        .from("connected_banks")
        .insert({
          user_id: userId,
          bank_name: accountData.bankName,
          account_number: accountData.accountNumber,
          account_holder: accountData.accountName,
          account_type: accountData.accountType,
          provider,
          access_token: accessToken,
          mono_customer_id: provider === "mono" ? customerId : null,
          okra_customer_id: provider === "okra" ? customerId : null,
          is_active: true,
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return this.formatBank(connectedBank);
    } catch (error) {
      console.error("OAuth callback error:", error);
      throw new Error(`Failed to connect bank: ${(error as any).message}`);
    }
  }

  /**
   * STEP 6: Fetch account balance
   * Called after authorization to get current balance
   */
  async getAccountBalance(
    accessToken: string,
    provider: "mono" | "okra"
  ): Promise<BankAccount> {
    try {
      if (provider === "mono") {
        const response = await this.monoClient.get("/accounts", {
          headers: { "mono-auth-token": accessToken },
        });

        const account = response.data.data;
        return {
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          bankName: account.institution.name,
          bankCode: account.institution.code,
          accountType: account.type || "current",
          balance: account.balance || 0,
          currency: "NGN",
        };
      } else {
        const response = await this.okraClient.get("/accounts", {
          headers: { "Authorization": `Bearer ${accessToken}` },
        });

        const account = response.data.data[0];
        return {
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          bankName: account.bankName,
          bankCode: account.bankCode,
          accountType: account.accountType || "current",
          balance: account.balance || 0,
          currency: "NGN",
        };
      }
    } catch (error) {
      console.error("Error fetching account balance:", error);
      throw new Error(`Failed to fetch account balance: ${(error as any).message}`);
    }
  }

  /**
   * STEP 7: Fetch transactions
   * Called periodically to sync transaction history
   */
  async getTransactions(
    accessToken: string,
    provider: "mono" | "okra",
    limit: number = 50
  ): Promise<BankTransaction[]> {
    try {
      if (provider === "mono") {
        const response = await this.monoClient.get("/transactions", {
          params: { limit },
          headers: { "mono-auth-token": accessToken },
        });

        return response.data.data.transactions.map((tx: any) => ({
          id: tx.id,
          date: tx.date,
          amount: Math.abs(tx.amount),
          type: tx.type === "debit" ? "debit" : "credit",
          description: tx.narration || tx.description,
          balance: tx.balance,
          merchant: tx.merchant,
          category: this.categorizeTransaction(tx),
          reference: tx.reference || tx.id,
        }));
      } else {
        const response = await this.okraClient.get("/transactions", {
          params: { limit },
          headers: { "Authorization": `Bearer ${accessToken}` },
        });

        return response.data.data.map((tx: any) => ({
          id: tx.id,
          date: tx.date,
          amount: Math.abs(tx.amount),
          type: tx.type === "debit" ? "debit" : "credit",
          description: tx.narration || tx.description,
          balance: tx.balance,
          merchant: tx.merchant || tx.description,
          category: this.categorizeTransaction(tx),
          reference: tx.reference || tx.id,
        }));
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw new Error(`Failed to fetch transactions: ${(error as any).message}`);
    }
  }

  /**
   * Sync transactions for a connected bank
   * Fetches latest transactions and stores in Zeni database
   */
  async syncTransactions(connectedBankId: string): Promise<SyncResult> {
    try {
      // Get connected bank
      const { data: bank, error: bankError } = await supabaseAdmin
        .from("connected_banks")
        .select("*")
        .eq("id", connectedBankId)
        .single();

      if (bankError || !bank) {
        throw new Error("Connected bank not found");
      }

      // Fetch transactions from provider
      const transactions = await this.getTransactions(
        bank.access_token,
        bank.provider,
        100
      );

      // Store transactions in database
      const newTransactions = [];
      for (const tx of transactions) {
        const { data: existingTx } = await supabaseAdmin
          .from("transactions")
          .select("id")
          .eq("user_id", bank.user_id)
          .eq("external_reference", tx.reference)
          .single();

        // Only insert if not already exists
        if (!existingTx) {
          const { data: insertedTx, error: insertError } = await supabaseAdmin
            .from("transactions")
            .insert({
              user_id: bank.user_id,
              category: tx.category,
              amount: tx.amount,
              description: tx.description,
              type: tx.type === "debit" ? "expense" : "income",
              date: tx.date,
              external_reference: tx.reference,
              bank_id: bank.id,
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error inserting transaction:", insertError);
          } else {
            newTransactions.push(insertedTx);
          }
        }
      }

      // Update last synced time
      await supabaseAdmin
        .from("connected_banks")
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", connectedBankId);

      return {
        success: true,
        transactionsFetched: transactions.length,
        newTransactions: newTransactions,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Sync error:", error);
      throw new Error(`Failed to sync transactions: ${(error as any).message}`);
    }
  }

  /**
   * Get user's connected banks
   */
  async getUserBanks(userId: string): Promise<ConnectedBank[]> {
    const { data, error } = await supabaseAdmin
      .from("connected_banks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((b) => this.formatBank(b));
  }

  /**
   * Get single connected bank
   */
  async getConnectedBank(bankId: string): Promise<ConnectedBank> {
    const { data, error } = await supabaseAdmin
      .from("connected_banks")
      .select("*")
      .eq("id", bankId)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Bank not found");

    return this.formatBank(data);
  }

  /**
   * Disconnect a bank
   * Note: In production, also revoke token with provider
   */
  async disconnectBank(bankId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("connected_banks")
      .update({ is_active: false })
      .eq("id", bankId);

    if (error) throw error;
  }

  /**
   * Get account balance for a connected bank
   */
  async getConnectedBankBalance(bankId: string): Promise<BankAccount> {
    const bank = await this.getConnectedBank(bankId);

    return this.getAccountBalance(bank.accessToken, bank.provider);
  }

  /**
   * STEP 10: Initiate debit (for auto-save)
   * Requires prior user authorization
   */
  async initiateDebit(
    connectedBankId: string,
    amount: number,
    reference: string,
    description: string
  ): Promise<{ status: string; transactionId: string }> {
    try {
      const bank = await this.getConnectedBank(connectedBankId);

      if (bank.provider === "mono") {
        // Mono debit endpoint
        const response = await this.monoClient.post("/transfers/debit", {
          amount: Math.round(amount), // Amount in kobo
          reference,
          narration: description,
          accountId: bank.monoCustomerId,
        });

        return {
          status: response.data.status,
          transactionId: response.data.data.id,
        };
      } else {
        // Okra debit endpoint
        const response = await this.okraClient.post("/transfers/debit", {
          amount: Math.round(amount),
          reference,
          narration: description,
          customerId: bank.okraCustomerId,
        });

        return {
          status: response.data.status,
          transactionId: response.data.data.id,
        };
      }
    } catch (error) {
      console.error("Debit initiation error:", error);
      throw new Error(`Failed to initiate debit: ${(error as any).message}`);
    }
  }

  // ─── Helper Methods ────────────────────────────────────────────────

  private formatBank(data: any): ConnectedBank {
    return {
      id: data.id,
      userId: data.user_id,
      bankName: data.bank_name,
      accountNumber: data.account_number,
      accountHolder: data.account_holder,
      accountType: data.account_type,
      provider: data.provider,
      accessToken: data.access_token,
      monoCustomerId: data.mono_customer_id,
      okraCustomerId: data.okra_customer_id,
      isActive: data.is_active,
      lastSyncedAt: data.last_synced_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private categorizeTransaction(tx: any): string {
    const description = (tx.description || tx.narration || "").toLowerCase();
    const merchant = (tx.merchant || "").toLowerCase();
    const combined = `${description} ${merchant}`;

    // Simple categorization rules
    if (
      combined.includes("gtbank") ||
      combined.includes("access") ||
      combined.includes("transfer")
    ) {
      return "transfers";
    }
    if (combined.includes("fuel") || combined.includes("gas station")) {
      return "transport";
    }
    if (
      combined.includes("food") ||
      combined.includes("restaurant") ||
      combined.includes("pizza") ||
      combined.includes("chicken")
    ) {
      return "food";
    }
    if (
      combined.includes("netflix") ||
      combined.includes("spotify") ||
      combined.includes("gaming")
    ) {
      return "subscriptions";
    }
    if (
      combined.includes("healthcare") ||
      combined.includes("hospital") ||
      combined.includes("pharmacy")
    ) {
      return "health";
    }
    if (
      combined.includes("mall") ||
      combined.includes("shop") ||
      combined.includes("store")
    ) {
      return "shopping";
    }
    if (combined.includes("education") || combined.includes("school")) {
      return "education";
    }
    if (
      combined.includes("salary") ||
      combined.includes("payment") ||
      combined.includes("deposit")
    ) {
      return "income";
    }

    return "other";
  }
}

export const bankingService = new BankingService();
