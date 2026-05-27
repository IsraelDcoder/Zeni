/**
 * Wallet Routes - User Savings & Wallet Management
 * 
 * This module handles:
 * - Wallet balance queries
 * - Manual savings deposits
 * - Savings goals management
 * - Wallet transaction history
 * - Savings analytics
 */

import { Router, Response } from "express";
import { z } from "zod";
import { AuthRequest, authMiddleware } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { validateRequest } from "../middleware/validation.js";
import walletService from "../services/wallet-service.js";
import { paystackService } from "../services/paystack.js";
import { supabaseAdmin } from "../services/supabase.js";

const router = Router();

// ─── Validation Schemas ────────────────────────────────────────────────

const depositSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  savingsGoalId: z.string().uuid().optional(),
  description: z.string().optional(),
});

const savingsGoalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  category: z.string(),
  targetDate: z.string().datetime().optional(),
  description: z.string().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().positive(),
  description: z.string(),
});

// ─── STEP 8: Get Wallet Balance ────────────────────────────────────────

/**
 * GET /api/v1/wallet/balance
 * Get user's wallet balance and savings summary
 */
router.get(
  "/balance",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const balance = await walletService.getWalletBalance(req.userId);

    res.json({
      success: true,
      data: {
        balance: parseFloat(balance.balance.toString()),
        lockedBalance: parseFloat(balance.locked_balance.toString()),
        totalSaved: parseFloat(balance.total_saved.toString()),
        totalWithdrawn: parseFloat(balance.total_withdrawn.toString()),
        currency: "NGN",
      },
    });
  })
);

// ─── STEP 9: Create Savings Goal ───────────────────────────────────────

/**
 * POST /api/v1/wallet/goals
 * Create a new savings goal
 * 
 * Example:
 * {
 *   "name": "Holiday Fund",
 *   "targetAmount": 500000,
 *   "category": "vacation",
 *   "targetDate": "2026-12-25T00:00:00Z",
 *   "description": "Saving for end of year holiday"
 * }
 */
router.post(
  "/goals",
  authMiddleware,
  validateRequest(savingsGoalSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { name, targetAmount, category, targetDate, description } = req.body;

    const goal = await walletService.createSavingsGoal(
      req.userId,
      name,
      targetAmount,
      category,
      targetDate,
      description
    );

    res.status(201).json({
      success: true,
      data: goal,
      message: "Savings goal created successfully",
    });
  })
);

// ─── Get Savings Goals ─────────────────────────────────────────────────

/**
 * GET /api/v1/wallet/goals
 * Get all active savings goals
 */
router.get(
  "/goals",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const goals = await walletService.getSavingsGoals(req.userId);

    // Calculate progress percentage for each goal
    const goalsWithProgress = goals.map((goal) => ({
      ...goal,
      progressPercent: Math.round(
        (parseFloat(goal.current_amount.toString()) /
          parseFloat(goal.target_amount.toString())) *
          100
      ),
    }));

    res.json({
      success: true,
      data: goalsWithProgress,
      count: goalsWithProgress.length,
    });
  })
);

// ─── STEP 10-11: Manual Savings (Deposit to Wallet) ──────────────────────

/**
 * POST /api/v1/wallet/deposit
 * User manually saves money to wallet
 * 
 * This endpoint:
 * 1. Processes payment via Paystack
 * 2. Moves funds to wallet on successful payment
 * 3. Updates savings goal progress
 * 4. Creates wallet transaction ledger entry
 * 
 * Request flow:
 * 1. POST with amount & optional goal ID
 * 2. Returns Paystack authorization URL
 * 3. User completes payment
 * 4. Frontend polls /verify to confirm
 */
router.post(
  "/deposit",
  authMiddleware,
  validateRequest(depositSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { amount, savingsGoalId, description } = req.body;

    // Get user email for Paystack
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(req.userId);
    if (!user?.email) {
      throw new ApiError(400, "User email not found");
    }

    // Initialize Paystack payment
    const paymentResponse = await paystackService.initializePayment({
      email: user.email,
      amount: Math.round(amount * 100), // Convert to kobo
      metadata: {
        userId: req.userId,
        savingsGoalId,
        description: description || "Wallet Deposit",
        type: "wallet_deposit",
      },
    });

    res.json({
      success: true,
      data: {
        authorizationUrl: paymentResponse.authorization_url,
        accessCode: paymentResponse.access_code,
        reference: paymentResponse.reference,
        amount,
        message: "Complete payment to save money to wallet",
      },
    });
  })
);

// ─── Verify Payment & Deposit to Wallet ────────────────────────────────

/**
 * POST /api/v1/wallet/verify-deposit
 * Verify payment success and move money to wallet
 * Called after user completes Paystack payment
 * 
 * Request:
 * {
 *   "reference": "paystack_reference"
 * }
 */
router.post(
  "/verify-deposit",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { reference } = req.body;
    if (!reference) {
      throw new ApiError(400, "Payment reference required");
    }

    // Verify payment with Paystack
    const paymentDetails = await paystackService.verifyPayment(reference);

    if (paymentDetails.status !== "success") {
      throw new ApiError(400, "Payment verification failed");
    }

    // Extract metadata
    const metadata = paymentDetails.metadata;
    const amount = paymentDetails.amount / 100; // Convert from kobo to Naira

    // Update wallet
    const result = await walletService.depositToWallet(
      req.userId,
      amount,
      "manual_save",
      metadata.description,
      paymentDetails.id
    );

    // If savings goal specified, update its progress
    if (metadata.savingsGoalId) {
      await walletService.updateSavingsGoalProgress(
        metadata.savingsGoalId,
        amount,
        "add"
      );
    }

    res.json({
      success: true,
      data: {
        transaction: result.transaction,
        newBalance: result.newBalance,
        amount,
      },
      message: `₦${amount.toLocaleString()} deposited to wallet successfully`,
    });
  })
);

// ─── Get Wallet Transaction History ────────────────────────────────────

/**
 * GET /api/v1/wallet/transactions?limit=50
 * Get wallet transaction ledger (deposits, withdrawals, transfers)
 */
router.get(
  "/transactions",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { limit = 50 } = req.query;
    const transactions = await walletService.getWalletTransactionHistory(
      req.userId,
      Number(limit)
    );

    res.json({
      success: true,
      data: transactions.map((tx) => ({
        ...tx,
        amount: parseFloat(tx.amount.toString()),
      })),
      count: transactions.length,
    });
  })
);

// ─── Withdraw from Wallet ──────────────────────────────────────────────

/**
 * POST /api/v1/wallet/withdraw
 * Withdraw money from wallet to bank account
 * (Phase 2 feature - after MVP)
 */
router.post(
  "/withdraw",
  authMiddleware,
  validateRequest(withdrawSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { amount, description } = req.body;

    const result = await walletService.withdrawFromWallet(
      req.userId,
      amount,
      description
    );

    res.json({
      success: true,
      data: {
        transaction: result.transaction,
        newBalance: result.newBalance,
      },
      message: `₦${amount.toLocaleString()} withdrawn from wallet`,
    });
  })
);

// ─── Get Wallet Statistics ────────────────────────────────────────────

/**
 * GET /api/v1/wallet/stats
 * Get wallet statistics and insights
 */
router.get(
  "/stats",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const balance = await walletService.getWalletBalance(req.userId);
    const goals = await walletService.getSavingsGoals(req.userId);
    const transactions = await walletService.getWalletTransactionHistory(
      req.userId,
      100
    );

    // Calculate statistics
    const totalGoalsAmount = goals.reduce(
      (sum, goal) => sum + parseFloat(goal.target_amount.toString()),
      0
    );

    const completedGoals = goals.filter((g) => g.status === "completed").length;

    const totalDeposits = transactions
      .filter((t) => t.type === "deposit")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalWithdrawals = transactions
      .filter((t) => t.type === "withdrawal")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    res.json({
      success: true,
      data: {
        balance: parseFloat(balance.balance.toString()),
        totalSaved: parseFloat(balance.total_saved.toString()),
        totalWithdrawn: parseFloat(balance.total_withdrawn.toString()),
        activeGoals: goals.filter((g) => g.status === "active").length,
        totalGoalsAmount,
        completedGoals,
        recentDeposits: totalDeposits,
        recentWithdrawals: totalWithdrawals,
      },
    });
  })
);

export default router;
