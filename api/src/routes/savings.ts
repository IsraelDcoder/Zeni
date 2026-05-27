import { Router, Response } from "express";
import { z } from "zod";
import { AuthRequest, authMiddleware } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { validateRequest } from "../middleware/validation.js";
import { walletService } from "../services/wallet.js";
import { savingsService } from "../services/savings.js";

const router = Router();

// ─── Validation Schemas ────────────────────────────────────────────────

const createWalletSchema = z.object({
  type: z.enum(["savings", "vault", "emergency", "goal"]),
  name: z.string().min(1),
});

const createSavingsGoalSchema = z.object({
  name: z.string().min(1),
  emoji: z.string(),
  targetAmount: z.number().positive(),
  deadline: z.string().datetime(),
  color: z.string().optional(),
});

const updateGoalProgressSchema = z.object({
  amount: z.number().positive(),
});

const createAutomationSchema = z.object({
  type: z.enum(["percentage", "fixed", "roundup", "ai_safe_save"]),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  amount: z.number().positive().optional(),
  percentage: z.number().min(0.01).max(100).optional(),
});

// ─── Wallet Endpoints ──────────────────────────────────────────────────

/**
 * POST /api/v1/savings/wallets
 * Create a new savings wallet
 */
router.post(
  "/wallets",
  authMiddleware,
  validateRequest(createWalletSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { type, name } = req.body;
    const wallet = await walletService.createWallet(req.userId, type, name);

    res.status(201).json({
      success: true,
      data: wallet,
      message: "Wallet created successfully",
    });
  })
);

/**
 * GET /api/v1/savings/wallets
 * Get all user wallets
 */
router.get(
  "/wallets",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const wallets = await walletService.getUserWallets(req.userId);

    res.json({
      success: true,
      data: wallets,
    });
  })
);

/**
 * GET /api/v1/savings/wallets/:walletId
 * Get specific wallet details
 */
router.get(
  "/wallets/:walletId",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { walletId } = req.params;
    const wallet = await walletService.getWallet(walletId);

    if (!wallet) {
      throw new ApiError(404, "Wallet not found");
    }

    const ledger = await walletService.getWalletLedger(walletId);
    const transactions = await walletService.getWalletTransactions(walletId, 10);

    res.json({
      success: true,
      data: {
        wallet,
        ledger,
        recentTransactions: transactions,
      },
    });
  })
);

/**
 * GET /api/v1/savings/wallets/:walletId/transactions
 * Get wallet transaction history
 */
router.get(
  "/wallets/:walletId/transactions",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { walletId } = req.params;
    const { limit = 50 } = req.query;

    const transactions = await walletService.getWalletTransactions(
      walletId,
      Number(limit)
    );

    res.json({
      success: true,
      data: transactions,
    });
  })
);

// ─── Savings Goals Endpoints ───────────────────────────────────────────

/**
 * POST /api/v1/savings/goals
 * Create a savings goal
 */
router.post(
  "/goals",
  authMiddleware,
  validateRequest(createSavingsGoalSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { name, emoji, targetAmount, deadline, color } = req.body;

    // Create wallet for this goal
    const wallet = await walletService.createWallet(
      req.userId,
      "goal",
      name
    );

    // Create savings goal
    const goal = await savingsService.createSavingsGoal(
      req.userId,
      wallet.id,
      name,
      emoji,
      targetAmount,
      deadline,
      color
    );

    res.status(201).json({
      success: true,
      data: goal,
      message: "Savings goal created successfully",
    });
  })
);

/**
 * GET /api/v1/savings/goals
 * Get all user savings goals
 */
router.get(
  "/goals",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const goals = await savingsService.getUserSavingsGoals(req.userId);

    res.json({
      success: true,
      data: goals,
    });
  })
);

/**
 * PUT /api/v1/savings/goals/:goalId/progress
 * Update savings goal progress
 */
router.put(
  "/goals/:goalId/progress",
  authMiddleware,
  validateRequest(updateGoalProgressSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { goalId } = req.params;
    const { amount } = req.body;

    const goal = await savingsService.updateGoalProgress(goalId, amount);

    res.json({
      success: true,
      data: goal,
      message: "Goal progress updated",
    });
  })
);

// ─── Savings Automation Endpoints ──────────────────────────────────────

/**
 * POST /api/v1/savings/automations
 * Create automated savings
 */
router.post(
  "/automations",
  authMiddleware,
  validateRequest(createAutomationSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { type, frequency, amount, percentage } = req.body;

    // Get or create savings wallet
    const wallets = await walletService.getUserWallets(req.userId);
    let savingsWallet = wallets.find((w) => w.type === "savings");

    if (!savingsWallet) {
      savingsWallet = await walletService.createWallet(
        req.userId,
        "savings",
        "Main Savings"
      );
    }

    const automation = await savingsService.createSavingsAutomation(
      req.userId,
      savingsWallet.id,
      type,
      frequency,
      amount,
      percentage
    );

    res.status(201).json({
      success: true,
      data: automation,
      message: "Automated savings created",
    });
  })
);

/**
 * GET /api/v1/savings/automations
 * Get user's automated savings
 */
router.get(
  "/automations",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const automations = await savingsService.getUserSavingsAutomations(
      req.userId
    );

    res.json({
      success: true,
      data: automations,
    });
  })
);

// ─── AI Safe Save Endpoint ────────────────────────────────────────────

/**
 * POST /api/v1/savings/ai-safe-save
 * Get AI recommendation for safe savings amount
 */
router.post(
  "/ai-safe-save",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const recommendation = await savingsService.calculateAISafeSave(
      req.userId
    );

    res.json({
      success: true,
      data: recommendation,
      message: "AI Safe Save recommendation generated",
    });
  })
);

/**
 * POST /api/v1/savings/ai-safe-save/auto-enable
 * Enable automated AI Safe Save
 */
router.post(
  "/ai-safe-save/auto-enable",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    // Get or create savings wallet
    const wallets = await walletService.getUserWallets(req.userId);
    let savingsWallet = wallets.find((w) => w.type === "savings");

    if (!savingsWallet) {
      savingsWallet = await walletService.createWallet(
        req.userId,
        "savings",
        "AI Safe Savings"
      );
    }

    const automation = await savingsService.createSavingsAutomation(
      req.userId,
      savingsWallet.id,
      "ai_safe_save",
      "weekly"
    );

    res.json({
      success: true,
      data: automation,
      message: "AI Safe Save enabled weekly",
    });
  })
);

// ─── Summary Endpoints ────────────────────────────────────────────────

/**
 * GET /api/v1/savings/summary
 * Get savings summary for user
 */
router.get(
  "/summary",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const summary = await savingsService.getSavingsSummary(req.userId);

    res.json({
      success: true,
      data: summary,
    });
  })
);

export default router;
