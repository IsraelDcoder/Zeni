import axios from "axios";
import { supabaseAdmin } from "./supabase.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

interface PaystackAccount {
  account_number: string;
  bank_code: string;
  account_name?: string;
}

interface BankConnection {
  user_id: string;
  paystack_access_code: string;
  account_number: string;
  bank_code: string;
  account_name: string;
  last_sync: string;
  created_at: string;
}

class PaystackService {
  private client = axios.create({
    baseURL: PAYSTACK_BASE_URL,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

  /**
   * Generate Paystack auth URL for account linking
   */
  generateAuthUrl(userId: string, redirectUrl: string): string {
    // Paystack uses their hosted payment page
    // In production, you'd generate a unique reference for this user
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const reference = `zeni_${userId}_${timestamp}_${random}`;
    
    return `${PAYSTACK_BASE_URL}/auth?reference=${reference}&redirect_url=${encodeURIComponent(redirectUrl)}`;
  }

  /**
   * Verify Paystack transaction and link account
   */
  async verifyAndLinkAccount(
    userId: string,
    reference: string,
    account: PaystackAccount
  ): Promise<BankConnection> {
    try {
      // Verify the transaction reference with Paystack
      const response = await this.client.get(`/transaction/verify/${reference}`);

      if (!response.data.status || response.data.data.status !== "success") {
        throw new Error("Transaction verification failed");
      }

      // Store bank connection
      const bankConnection: BankConnection = {
        user_id: userId,
        paystack_access_code: reference,
        account_number: account.account_number,
        bank_code: account.bank_code,
        account_name: account.account_name || "",
        last_sync: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("bank_connections")
        .insert([bankConnection])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Paystack verification error:", error);
      throw error;
    }
  }

  /**
   * Resolve bank account details (Nigerian banks only)
   */
  async resolveAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ account_number: string; account_name: string }> {
    try {
      const response = await this.client.get("/bank/resolve", {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
      });

      if (!response.data.status) {
        throw new Error("Account resolution failed");
      }

      return {
        account_number: response.data.data.account_number,
        account_name: response.data.data.account_name,
      };
    } catch (error) {
      console.error("Account resolution error:", error);
      throw error;
    }
  }

  /**
   * Get list of Nigerian banks for account linking
   */
  async getBanks(): Promise<
    Array<{ id: number; name: string; code: string; slug: string }>
  > {
    try {
      const response = await this.client.get("/bank?country=NG");

      if (!response.data.status) {
        throw new Error("Failed to fetch banks");
      }

      return response.data.data.map(
        (bank: { id: number; name: string; code: string; slug: string }) => ({
          id: bank.id,
          name: bank.name,
          code: bank.code,
          slug: bank.slug,
        })
      );
    } catch (error) {
      console.error("Bank list fetch error:", error);
      throw error;
    }
  }

  /**
   * Sync transactions from linked bank account
   * (This would typically be called by a scheduled job)
   */
  async syncBankTransactions(userId: string): Promise<void> {
    try {
      // Get user's bank connection
      const { data: bankConnection, error: fetchError } = await supabaseAdmin
        .from("bank_connections")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (fetchError || !bankConnection) {
        throw new Error("No bank connection found for user");
      }

      // In a real implementation, you'd fetch transactions from Paystack Open Banking
      // For now, this is a placeholder that would integrate with their API
      console.log(`Syncing transactions for user ${userId}`);

      // Update last_sync timestamp
      await supabaseAdmin
        .from("bank_connections")
        .update({ last_sync: new Date().toISOString() })
        .eq("user_id", userId);
    } catch (error) {
      console.error("Transaction sync error:", error);
      throw error;
    }
  }

  /**
   * Unlink a bank account
   */
  async unlinkBankAccount(userId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from("bank_connections")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error) {
      console.error("Unlink error:", error);
      throw error;
    }
  }

  /**
   * Get user's connected bank account
   */
  async getConnectedBank(userId: string): Promise<BankConnection | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from("bank_connections")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Fetch bank connection error:", error);
      return null;
    }
  }

  /**
   * Initialize a payment for wallet deposit
   */
  async initializePayment(data: {
    email: string;
    amount: number;
    metadata: any;
  }): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    try {
      const response = await this.client.post("/transaction/initialize", {
        email: data.email,
        amount: data.amount,
        metadata: data.metadata,
      });

      if (!response.data.status) {
        throw new Error("Payment initialization failed");
      }

      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error) {
      console.error("Payment initialization error:", error);
      throw error;
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<any> {
    try {
      const response = await this.client.get(`/transaction/verify/${reference}`);

      if (!response.data.status) {
        throw new Error("Payment verification failed");
      }

      return response.data.data;
    } catch (error) {
      console.error("Payment verification error:", error);
      throw error;
    }
  }
}

export const paystackService = new PaystackService();
