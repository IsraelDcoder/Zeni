// API client for communicating with Zeni backend
import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    monthlyIncome: number;
    monthlyExpenseTarget: number;
    createdAt: string;
    updatedAt: string;
  };
}

class ZeniApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use(async (config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Handle token refresh on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken && typeof refreshToken === 'string') {
              const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
                token: refreshToken,
              });

              if (response.data.data.token) {
                this.token = response.data.data.token;
                if (this.token) {
                  await AsyncStorage.setItem('auth_token', this.token);
                }
                originalRequest.headers.Authorization = `Bearer ${this.token}`;
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed - user needs to login again
            await this.logout();
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async initialize() {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      this.token = token;
    }
  }

  // Auth endpoints
  async signup(email: string, password: string, firstName: string, lastName: string) {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/api/v1/auth/signup', {
      email,
      password,
      firstName,
      lastName,
    });

    if (response.data.data?.token) {
      this.token = response.data.data.token;
      await AsyncStorage.setItem('auth_token', this.token);
    }

    return response.data.data;
  }

  async signin(email: string, password: string) {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/api/v1/auth/signin', {
      email,
      password,
    });

    if (response.data.data?.token) {
      this.token = response.data.data.token;
      await AsyncStorage.setItem('auth_token', this.token);
    }

    return response.data.data;
  }

  async logout() {
    try {
      await this.client.post('/api/v1/auth/logout');
    } catch (error) {
      // Ignore errors on logout
    }

    this.token = null;
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('refresh_token');
  }

  async verifyToken() {
    if (!this.token) return null;
    const response = await this.client.post('/api/v1/auth/verify-token', { token: this.token });
    return response.data.data;
  }

  async resetPassword(email: string) {
    const response = await this.client.post('/api/v1/auth/reset-password', { email });
    return response.data;
  }

  // User endpoints
  async getUserProfile() {
    const response = await this.client.get('/api/v1/users/profile');
    return response.data.data;
  }

  async updateUserProfile(data: any) {
    const response = await this.client.put('/api/v1/users/profile', data);
    return response.data.data;
  }

  async getUserSettings() {
    const response = await this.client.get('/api/v1/users/settings');
    return response.data.data;
  }

  async updateUserSettings(data: any) {
    const response = await this.client.put('/api/v1/users/settings', data);
    return response.data.data;
  }

  async getFinancialScore() {
    const response = await this.client.get('/api/v1/users/financial-score');
    return response.data.data;
  }

  // Transaction endpoints
  async getTransactions(filters?: any) {
    const response = await this.client.get('/api/v1/transactions', { params: filters });
    return response.data;
  }

  async createTransaction(data: any) {
    const response = await this.client.post('/api/v1/transactions', data);
    return response.data.data;
  }

  async updateTransaction(id: string, data: any) {
    const response = await this.client.put(`/api/v1/transactions/${id}`, data);
    return response.data.data;
  }

  async deleteTransaction(id: string) {
    const response = await this.client.delete(`/api/v1/transactions/${id}`);
    return response.data;
  }

  async getTransactionAnalytics() {
    const response = await this.client.get('/api/v1/transactions/analytics/summary');
    return response.data.data;
  }

  // Budget endpoints
  async getBudgets() {
    const response = await this.client.get('/api/v1/budgets');
    return response.data.data;
  }

  async createBudget(data: any) {
    const response = await this.client.post('/api/v1/budgets', data);
    return response.data.data;
  }

  async updateBudget(category: string, data: any) {
    const response = await this.client.put(`/api/v1/budgets/${category}`, data);
    return response.data.data;
  }

  async deleteBudget(category: string) {
    const response = await this.client.delete(`/api/v1/budgets/${category}`);
    return response.data;
  }

  async getBudgetAlerts() {
    const response = await this.client.get('/api/v1/budgets/status/alerts');
    return response.data.data;
  }

  // Savings goals endpoints
  async getSavingsGoals() {
    const response = await this.client.get('/api/v1/savings-goals');
    return response.data.data;
  }

  async createSavingsGoal(data: any) {
    const response = await this.client.post('/api/v1/savings-goals', data);
    return response.data.data;
  }

  async updateSavingsGoal(id: string, data: any) {
    const response = await this.client.put(`/api/v1/savings-goals/${id}`, data);
    return response.data.data;
  }

  async deleteSavingsGoal(id: string) {
    const response = await this.client.delete(`/api/v1/savings-goals/${id}`);
    return response.data;
  }

  async updateSavingsGoalProgress(id: string, amount: number) {
    const response = await this.client.put(`/api/v1/savings-goals/${id}/progress`, { amount });
    return response.data.data;
  }

  // Insights endpoints
  async getInsights(limit?: number) {
    const response = await this.client.get('/api/v1/insights', { params: { limit } });
    return response.data.data;
  }

  async getUnreadInsightsCount() {
    const response = await this.client.get('/api/v1/insights/unread');
    return response.data.data;
  }

  async markInsightAsRead(id: string) {
    const response = await this.client.put(`/api/v1/insights/${id}/read`);
    return response.data;
  }

  async deleteInsight(id: string) {
    const response = await this.client.delete(`/api/v1/insights/${id}`);
    return response.data;
  }

  async generateInsights() {
    const response = await this.client.post('/api/v1/insights/generate');
    return response.data.data;
  }

  async getSpendingPattern() {
    const response = await this.client.get('/api/v1/insights/analytics/spending-pattern');
    return response.data.data;
  }

  // Bank endpoints (to be implemented)
  async linkBankAccount(data: any) {
    const response = await this.client.post('/api/v1/banks/link', data);
    return response.data.data;
  }

  async getConnectedBanks() {
    const response = await this.client.get('/api/v1/banks/connected');
    return response.data.data;
  }

  async syncBankTransactions() {
    const response = await this.client.post('/api/v1/banks/sync');
    return response.data.data;
  }

  async getPaystackAuthUrl() {
    const response = await this.client.get('/api/v1/banks/paystack/auth-url');
    return response.data.data;
  }

  async handlePaystackCallback(code: string) {
    const response = await this.client.post('/api/v1/banks/paystack/callback', { code });
    return response.data.data;
  }

  // 2FA/MFA endpoints
  async setupTwoFactor() {
    const response = await this.client.post('/api/v1/auth/2fa/setup');
    return response.data.data;
  }

  async verifyTwoFactorSetup(code: string) {
    const response = await this.client.post('/api/v1/auth/2fa/verify-setup', { code });
    return response.data.data;
  }

  async disableTwoFactor(code: string) {
    const response = await this.client.post('/api/v1/auth/2fa/disable', { code });
    return response.data;
  }

  async verifyTwoFactorCode(code: string) {
    const response = await this.client.post('/api/v1/auth/2fa/verify', { code });
    return response.data.data;
  }

  async getTwoFactorStatus() {
    const response = await this.client.get('/api/v1/auth/2fa/status');
    return response.data.data;
  }

  async generateBackupCodes() {
    const response = await this.client.post('/api/v1/auth/2fa/backup-codes');
    return response.data.data;
  }

  // ─── Wallet Endpoints ──────────────────────────────────────────────

  async createWallet(type: 'savings' | 'vault' | 'emergency' | 'goal', name: string) {
    const response = await this.client.post<ApiResponse>('/api/v1/savings/wallets', {
      type,
      name,
    });
    return response.data.data;
  }

  async getWallets() {
    const response = await this.client.get<ApiResponse>('/api/v1/savings/wallets');
    return response.data.data;
  }

  async getWallet(walletId: string) {
    const response = await this.client.get<ApiResponse>(`/api/v1/savings/wallets/${walletId}`);
    return response.data.data;
  }

  async getWalletTransactions(walletId: string, limit?: number) {
    const response = await this.client.get<ApiResponse>(
      `/api/v1/savings/wallets/${walletId}/transactions`,
      { params: { limit } }
    );
    return response.data.data;
  }

  // ─── Savings Goals Endpoints (New Wallet System) ──────────────────────

  async createWalletSavingsGoal(
    name: string,
    emoji: string,
    targetAmount: number,
    deadline: string,
    color?: string
  ) {
    const response = await this.client.post<ApiResponse>('/api/v1/savings/goals', {
      name,
      emoji,
      targetAmount,
      deadline,
      color,
    });
    return response.data.data;
  }

  async getWalletSavingsGoals() {
    const response = await this.client.get<ApiResponse>('/api/v1/savings/goals');
    return response.data.data;
  }

  async updateGoalProgress(goalId: string, amount: number) {
    const response = await this.client.put<ApiResponse>(
      `/api/v1/savings/goals/${goalId}/progress`,
      { amount }
    );
    return response.data.data;
  }

  // ─── Savings Automations Endpoints ─────────────────────────────────

  async createSavingsAutomation(
    type: 'percentage' | 'fixed' | 'roundup' | 'ai_safe_save',
    frequency: 'daily' | 'weekly' | 'monthly',
    amount?: number,
    percentage?: number
  ) {
    const response = await this.client.post<ApiResponse>('/api/v1/savings/automations', {
      type,
      frequency,
      amount,
      percentage,
    });
    return response.data.data;
  }

  async getSavingsAutomations() {
    const response = await this.client.get<ApiResponse>('/api/v1/savings/automations');
    return response.data.data;
  }

  // ─── AI Safe Save Endpoints ────────────────────────────────────────

  async getAISafeSaveRecommendation() {
    const response = await this.client.post<ApiResponse>('/api/v1/savings/ai-safe-save');
    return response.data.data;
  }

  async enableAISafeSave() {
    const response = await this.client.post<ApiResponse>('/api/v1/savings/ai-safe-save/auto-enable');
    return response.data.data;
  }

  // ─── Savings Summary Endpoint ──────────────────────────────────────

  async getSavingsSummary() {
    const response = await this.client.get<ApiResponse>('/api/v1/savings/summary');
    return response.data.data;
  }

  // ─────────────────────────────────────────────────────────────────────
  // ── PHASE 1 MVP: OPEN BANKING & WALLET SYSTEM ────────────────────────
  // ─────────────────────────────────────────────────────────────────────

  // SYSTEM 1: OPEN BANKING INTEGRATION (Mono/Okra)
  // ───────────────────────────────────────────────

  /**
   * Get authorization URL to open Mono/Okra SDK
   * User will click this to connect their bank account
   */
  async getBankAuthorizationUrl(provider: 'mono' | 'okra' = 'mono') {
    const response = await this.client.get<ApiResponse>('/api/v1/banks/authorize-url', {
      params: { provider },
    });
    return response.data.data;
  }

  /**
   * Handle OAuth callback from Mono/Okra
   * Called after user authorizes bank connection
   */
  async handleBankCallback(code: string, provider: 'mono' | 'okra') {
    const response = await this.client.post<ApiResponse>('/api/v1/banks/callback', {
      code,
      provider,
    });
    return response.data.data;
  }

  /**
   * Get user's connected banks
   */
  async getConnectedBankAccounts() {
    const response = await this.client.get<ApiResponse>('/api/v1/banks/connected');
    return response.data.data;
  }

  /**
   * Get bank account balance
   */
  async getBankBalance(bankId: string) {
    const response = await this.client.get<ApiResponse>(`/api/v1/banks/${bankId}/balance`);
    return response.data.data;
  }

  /**
   * Get bank transactions (not yet synced to Zeni)
   */
  async getBankTransactions(bankId: string, limit: number = 50) {
    const response = await this.client.get<ApiResponse>(`/api/v1/banks/${bankId}/transactions`, {
      params: { limit },
    });
    return response.data.data;
  }

  /**
   * Sync bank transactions to Zeni database
   * This fetches transactions and categorizes them
   */
  async syncBankTransactionsToZeni(bankId: string) {
    const response = await this.client.post<ApiResponse>(`/api/v1/banks/${bankId}/sync`);
    return response.data.data;
  }

  // SYSTEM 2 & 3: WALLET SYSTEM
  // ────────────────────────────

  /**
   * Get wallet balance
   * Shows: available balance, locked (in goals), total saved
   */
  async getWalletBalance() {
    const response = await this.client.get<ApiResponse>('/api/v1/wallet/balance');
    return response.data.data;
  }

  /**
   * Get wallet transaction history (ledger)
   * Shows all deposits, withdrawals, transfers
   */
  async getWalletTransactionHistory(limit: number = 50) {
    const response = await this.client.get<ApiResponse>('/api/v1/wallet/transactions', {
      params: { limit },
    });
    return response.data.data;
  }

  /**
   * Get wallet statistics and insights
   */
  async getWalletStats() {
    const response = await this.client.get<ApiResponse>('/api/v1/wallet/stats');
    return response.data.data;
  }

  // ───────────────────────────────────────────────
  // PHASE 1 MVP: MANUAL SAVINGS (User initiates save)
  // ───────────────────────────────────────────────

  /**
   * STEP 9-10: Initiate manual savings
   * User wants to save money from their bank to Zeni wallet
   * Returns Paystack authorization URL for payment processing
   *
   * Flow:
   * 1. Call this endpoint
   * 2. Get Paystack URL
   * 3. User completes payment
   * 4. Call verifyDeposit to confirm
   */
  async initiateManualDeposit(amount: number, savingsGoalId?: string, description?: string) {
    const response = await this.client.post<ApiResponse>('/api/v1/wallet/deposit', {
      amount,
      savingsGoalId,
      description: description || 'Wallet Deposit',
    });
    return response.data.data;
  }

  /**
   * STEP 11-12: Verify payment and deposit to wallet
   * Called after user completes payment on Paystack
   * Confirms payment and moves money to wallet
   */
  async verifyManualDeposit(reference: string) {
    const response = await this.client.post<ApiResponse>('/api/v1/wallet/verify-deposit', {
      reference,
    });
    return response.data.data;
  }

  // ───────────────────────────────────────────────
  // SAVINGS GOALS
  // ───────────────────────────────────────────────

  /**
   * Create a savings goal
   * Example: "Save ₦500,000 for holiday"
   */
  async createWalletGoal(
    name: string,
    targetAmount: number,
    category: string,
    targetDate?: string,
    description?: string
  ) {
    const response = await this.client.post<ApiResponse>('/api/v1/wallet/goals', {
      name,
      targetAmount,
      category,
      targetDate,
      description,
    });
    return response.data.data;
  }

  /**
   * Get all savings goals
   * Shows progress, target date, current amount
   */
  async getWalletGoals() {
    const response = await this.client.get<ApiResponse>('/api/v1/wallet/goals');
    return response.data.data;
  }

  /**
   * Get a specific savings goal
   */
  async getWalletGoal(goalId: string) {
    const response = await this.client.get<ApiResponse>(`/api/v1/wallet/goals/${goalId}`);
    return response.data.data;
  }

  /**
   * Update savings goal progress
   * Called when money is added to a goal
   */
  async updateWalletGoalProgress(goalId: string, amount: number, operation: 'add' | 'subtract' = 'add') {
    const response = await this.client.put<ApiResponse>(`/api/v1/wallet/goals/${goalId}/progress`, {
      amount,
      operation,
    });
    return response.data.data;
  }

  // ───────────────────────────────────────────────
  // PHASE 2: AUTOMATIC SAVINGS & ADVANCED FEATURES
  // ───────────────────────────────────────────────

  /**
   * Withdraw from wallet to bank (Phase 2)
   * Not in MVP - added for future use
   */
  async withdrawFromWallet(amount: number, description: string) {
    const response = await this.client.post<ApiResponse>('/api/v1/wallet/withdraw', {
      amount,
      description,
    });
    return response.data.data;
  }

  // Error handler
  getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.error || error.message;
    }
    return 'An unexpected error occurred';
  }
}

export const zeniApi = new ZeniApiClient();
export type { ApiResponse, AuthResponse };
