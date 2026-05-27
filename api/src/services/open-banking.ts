// Open Banking Service: Mono/Okra SDK Integration
// This layer handles bank connections, balance fetching, and transaction syncing

import axios, { AxiosInstance } from "axios";

interface MonoConfig {
  monoPublicKey: string;
  monoSecretKey: string;
  baseUrl: string;
}

interface OkraConfig {
  okraPublicKey: string;
  okraSecretKey: string;
  baseUrl: string;
}

interface BankBalance {
  accountNumber: string;
  accountName: string;
  balance: number;
  currency: string;
}

interface BankTransaction {
  id: string;
  amount: number;
  description: string;
  merchant?: string;
  type: "debit" | "credit";
  date: string;
  balance: number;
}

interface ConnectionCallback {
  customerId: string;
  accessToken: string;
  accountDetails: {
    accountNumber: string;
    accountName: string;
    bankName: string;
  };
}

/**
 * MONO Open Banking Integration
 * Reference: https://mono.co/docs/
 */
export class MonoService {
  private client: AxiosInstance;
  private publicKey: string;

  constructor(publicKey: string, secretKey: string) {
    this.publicKey = publicKey;
    this.client = axios.create({
      baseURL: "https://api.mono.co",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get SDK link for browser/mobile
   */
  getSDKLink(userId: string): string {
    const params = new URLSearchParams({
      key: this.publicKey,
      customer: JSON.stringify({
        identity: {
          type: "phone",
          number: "+234xxxxxxxxxx", // Will be filled by app
        },
      }),
      onClose: `${process.env.API_BASE_URL}/banks/mono-close`,
      onSuccess: `${process.env.API_BASE_URL}/banks/mono-callback`,
    });

    return `https://connect.withmono.com/?${params.toString()}`;
  }

  /**
   * Exchange code for access token (called from callback)
   */
  async exchangeCodeForToken(code: string): Promise<ConnectionCallback> {
    try {
      const response = await this.client.post("/auth/login", {
        code,
      });

      return {
        customerId: response.data.meta.customer.id,
        accessToken: response.data.data.access_token,
        accountDetails: {
          accountNumber: response.data.data.account.number,
          accountName: response.data.data.account.name,
          bankName: response.data.data.account.institution.name,
        },
      };
    } catch (error) {
      console.error("Error exchanging Mono code:", error);
      throw new Error("Failed to exchange Mono code for token");
    }
  }

  /**
   * Fetch account balance
   */
  async getBalance(accessToken: string): Promise<BankBalance> {
    try {
      const response = await this.client.get("/accounts", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const account = response.data.data[0]; // Mono returns array of accounts

      return {
        accountNumber: account.number,
        accountName: account.name,
        balance: account.balance,
        currency: "NGN",
      };
    } catch (error) {
      console.error("Error fetching Mono balance:", error);
      throw new Error("Failed to fetch balance");
    }
  }

  /**
   * Fetch transactions
   */
  async getTransactions(
    accessToken: string,
    limit: number = 50
  ): Promise<BankTransaction[]> {
    try {
      const response = await this.client.get("/transactions", {
        params: {
          limit,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.data.map((tx: any) => ({
        id: tx.id,
        amount: Math.abs(tx.amount),
        description: tx.description,
        merchant: tx.narration,
        type: tx.type === "DEBIT" ? "debit" : "credit",
        date: tx.date,
        balance: tx.balance,
      }));
    } catch (error) {
      console.error("Error fetching Mono transactions:", error);
      throw new Error("Failed to fetch transactions");
    }
  }

  /**
   * Revoke account access
   */
  async revokeAccess(accessToken: string): Promise<boolean> {
    try {
      await this.client.post(
        "/accounts/unlink",
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return true;
    } catch (error) {
      console.error("Error revoking Mono access:", error);
      return false;
    }
  }
}

/**
 * OKRA Open Banking Integration
 * Reference: https://docs.okra.ng/
 */
export class OkraService {
  private client: AxiosInstance;
  private publicKey: string;

  constructor(publicKey: string, secretKey: string) {
    this.publicKey = publicKey;
    this.client = axios.create({
      baseURL: "https://api.okra.ng/v3",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get SDK link for browser/mobile
   */
  getSDKLink(userId: string): string {
    const params = new URLSearchParams({
      key: this.publicKey,
      customer_id: userId,
      redirect_url: `${process.env.API_BASE_URL}/banks/okra-callback`,
    });

    return `https://embedded.okra.ng/?${params.toString()}`;
  }

  /**
   * Exchange code for access token
   */
  async exchangeCodeForToken(code: string): Promise<ConnectionCallback> {
    try {
      const response = await this.client.post("/auth/token", {
        code,
      });

      return {
        customerId: response.data.data.customer_id,
        accessToken: response.data.data.access_token,
        accountDetails: {
          accountNumber: response.data.data.account.account_number,
          accountName: response.data.data.account.account_name,
          bankName: response.data.data.account.bank_name,
        },
      };
    } catch (error) {
      console.error("Error exchanging Okra code:", error);
      throw new Error("Failed to exchange Okra code for token");
    }
  }

  /**
   * Fetch account balance
   */
  async getBalance(accessToken: string): Promise<BankBalance> {
    try {
      const response = await this.client.get("/accounts", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const account = response.data.data[0];

      return {
        accountNumber: account.account_number,
        accountName: account.account_name,
        balance: account.balance,
        currency: "NGN",
      };
    } catch (error) {
      console.error("Error fetching Okra balance:", error);
      throw new Error("Failed to fetch balance");
    }
  }

  /**
   * Fetch transactions
   */
  async getTransactions(
    accessToken: string,
    limit: number = 50
  ): Promise<BankTransaction[]> {
    try {
      const response = await this.client.get("/transactions", {
        params: {
          limit,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.data.map((tx: any) => ({
        id: tx.id,
        amount: Math.abs(tx.amount),
        description: tx.description || tx.narration,
        merchant: tx.merchant,
        type: tx.type === "DEBIT" ? "debit" : "credit",
        date: tx.date,
        balance: tx.balance,
      }));
    } catch (error) {
      console.error("Error fetching Okra transactions:", error);
      throw new Error("Failed to fetch transactions");
    }
  }

  /**
   * Revoke account access
   */
  async revokeAccess(accessToken: string): Promise<boolean> {
    try {
      await this.client.post("/auth/revoke", {
        token: accessToken,
      });
      return true;
    } catch (error) {
      console.error("Error revoking Okra access:", error);
      return false;
    }
  }
}

/**
 * Factory for creating appropriate service
 */
export function createOpenBankingService(
  provider: "mono" | "okra"
): MonoService | OkraService {
  if (provider === "mono") {
    return new MonoService(
      process.env.MONO_PUBLIC_KEY || "",
      process.env.MONO_SECRET_KEY || ""
    );
  } else {
    return new OkraService(
      process.env.OKRA_PUBLIC_KEY || "",
      process.env.OKRA_SECRET_KEY || ""
    );
  }
}

export { BankBalance, BankTransaction, ConnectionCallback };
