// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatar?: string;
  monthlyIncome: number;
  monthlyExpenseTarget: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  userId: string;
  profileName: string;
  monthlyIncome: number;
  monthlyExpenseTarget: number;
  notificationsEnabled: boolean;
  spendingAlertsEnabled: boolean;
  weeklyReportsEnabled: boolean;
}

// Transaction Types
export enum TransactionCategory {
  FOOD = "food",
  TRANSPORT = "transport",
  ENTERTAINMENT = "entertainment",
  UTILITIES = "utilities",
  SHOPPING = "shopping",
  HEALTH = "health",
  INCOME = "income",
  EDUCATION = "education",
  RENT = "rent",
  BETTING = "betting",
  SUBSCRIPTIONS = "subscriptions",
  TRANSFERS = "transfers",
  OTHER = "other"
}

export enum TransactionType {
  EXPENSE = "expense",
  INCOME = "income"
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: TransactionCategory;
  type: TransactionType;
  date: Date;
  isImpulse?: boolean;
  hour?: number;
  bankTransactionId?: string; // From Paystack sync
  source?: "manual" | "bank"; // Where transaction came from
  createdAt: Date;
  updatedAt: Date;
}

// Budget Types
export interface Budget {
  id: string;
  userId: string;
  category: TransactionCategory;
  limit: number;
  spent: number;
  period: "monthly" | "weekly"; // Default: monthly
  createdAt: Date;
  updatedAt: Date;
}

// Savings Goal Types
export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  priority: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
}

// Bank Connection Types
export interface BankConnection {
  id: string;
  userId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  paystackAccessCode?: string; // From Paystack OAuth
  lastSyncedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// AI Insight Types
export enum InsightType {
  BUDGET_ALERT = "budget_alert",
  SPENDING_PATTERN = "spending_pattern",
  ANOMALY_DETECTION = "anomaly_detection",
  RECOMMENDATION = "recommendation",
  GOAL_PROGRESS = "goal_progress"
}

export enum SeverityLevel {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
  POSITIVE = "positive"
}

export interface AIInsight {
  id: string;
  userId: string;
  type: InsightType;
  severity: SeverityLevel;
  title: string;
  message: string;
  actionItems?: string[];
  generatedAt: Date;
  expiresAt?: Date;
}

// Authentication Types
export interface AuthPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Paystack Types
export interface PaystackBankAccount {
  id: number;
  bank_id: number;
  account_number: string;
  account_name: string;
  bank_name: string;
  access_code: string;
}

// Request Types
export interface CreateTransactionRequest {
  amount: number;
  description: string;
  category: TransactionCategory;
  type: TransactionType;
  date?: Date;
  isImpulse?: boolean;
}

export interface UpdateTransactionRequest {
  amount?: number;
  description?: string;
  category?: TransactionCategory;
  type?: TransactionType;
}

export interface CreateBudgetRequest {
  category: TransactionCategory;
  limit: number;
  period?: "monthly" | "weekly";
}

export interface CreateSavingsGoalRequest {
  name: string;
  emoji: string;
  targetAmount: number;
  deadline?: Date;
  priority?: "low" | "medium" | "high";
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  monthlyIncome?: number;
  monthlyExpenseTarget?: number;
  notificationsEnabled?: boolean;
  spendingAlertsEnabled?: boolean;
  weeklyReportsEnabled?: boolean;
}
