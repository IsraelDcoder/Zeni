import { z } from "zod";
import { TransactionCategory, TransactionType } from "../types/index.js";

// Auth Schemas
export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

// User Profile Schemas
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  monthlyIncome: z.number().min(0).optional(),
  monthlyExpenseTarget: z.number().min(0).optional(),
  notificationsEnabled: z.boolean().optional(),
  spendingAlertsEnabled: z.boolean().optional(),
  weeklyReportsEnabled: z.boolean().optional(),
});

// Transaction Schemas
export const createTransactionSchema = z.object({
  amount: z.number().min(0.01),
  description: z.string().min(1),
  category: z.enum(Object.values(TransactionCategory) as [string, ...string[]]),
  type: z.enum(Object.values(TransactionType) as [string, ...string[]]),
  date: z.string().datetime().optional(),
  isImpulse: z.boolean().optional(),
});

export const updateTransactionSchema = z.object({
  amount: z.number().min(0.01).optional(),
  description: z.string().min(1).optional(),
  category: z.enum(Object.values(TransactionCategory) as [string, ...string[]]).optional(),
  type: z.enum(Object.values(TransactionType) as [string, ...string[]]).optional(),
});

// Budget Schemas
export const createBudgetSchema = z.object({
  category: z.enum(Object.values(TransactionCategory) as [string, ...string[]]),
  limit: z.number().min(0.01),
  period: z.enum(["monthly", "weekly"]).optional(),
});

export const updateBudgetSchema = z.object({
  limit: z.number().min(0.01).optional(),
  period: z.enum(["monthly", "weekly"]).optional(),
});

// Savings Goal Schemas
export const createSavingsGoalSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().length(1), // Single emoji
  targetAmount: z.number().min(0.01),
  deadline: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export const updateSavingsGoalSchema = z.object({
  name: z.string().min(1).optional(),
  emoji: z.string().length(1).optional(),
  targetAmount: z.number().min(0.01).optional(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

// Bank Connection Schemas
export const linkBankAccountSchema = z.object({
  bankName: z.string().min(1),
  accountNumber: z.string().regex(/^\d{10}$/), // Nigerian account numbers are 10 digits
  paystackAccessCode: z.string().optional(),
});

// Validation middleware creator
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }
      next(error);
    }
  };
};
