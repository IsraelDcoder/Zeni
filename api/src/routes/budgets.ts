import { Router, Response } from "express";
import { supabaseAdmin } from "../services/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import {
  validateRequest,
  createBudgetSchema,
  updateBudgetSchema,
} from "../middleware/validation.js";
import { v4 as uuid } from "uuid";

const router = Router();

/**
 * GET /api/v1/budgets
 * Get all budgets with spending status
 */
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data: budgets, error: budgetError } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("user_id", req.userId);

    if (budgetError) {
      throw new ApiError(400, "Failed to fetch budgets");
    }

    // Get budget status with spending
    const { data: budgetStatus, error: statusError } = await supabaseAdmin.rpc(
      "get_budget_status",
      { user_id: req.userId }
    );

    if (statusError) {
      throw new ApiError(400, "Failed to calculate budget status");
    }

    res.json({
      success: true,
      data: budgetStatus?.map((b: any) => ({
        category: b.category,
        limit: b.limit_amount,
        spent: b.spent,
        percentageUsed: parseFloat(b.percentage_used),
        remaining: Math.max(0, b.limit_amount - b.spent),
      })) || [],
    });
  })
);

/**
 * POST /api/v1/budgets
 * Create a new budget
 */
router.post(
  "/",
  validateRequest(createBudgetSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { category, limit, period = "monthly" } = req.validatedBody;

    const { data, error } = await supabaseAdmin
      .from("budgets")
      .insert({
        id: uuid(),
        user_id: req.userId,
        category,
        limit_amount: limit,
        period,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ApiError(409, `Budget already exists for ${category}`);
      }
      throw new ApiError(400, "Failed to create budget");
    }

    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        category: data.category,
        limit: data.limit_amount,
        period: data.period,
      },
      message: "Budget created successfully",
    });
  })
);

/**
 * GET /api/v1/budgets/:category
 * Get budget for a specific category
 */
router.get(
  "/:category",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data, error } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("user_id", req.userId)
      .eq("category", req.params.category)
      .single();

    if (error || !data) {
      throw new ApiError(404, "Budget not found");
    }

    // Get spending for this category this month
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("amount")
      .eq("user_id", req.userId)
      .eq("category", req.params.category)
      .eq("type", "expense")
      .gte("date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const spent = transactions?.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0;

    res.json({
      success: true,
      data: {
        category: data.category,
        limit: data.limit_amount,
        spent,
        percentageUsed: (spent / data.limit_amount) * 100,
        remaining: Math.max(0, data.limit_amount - spent),
      },
    });
  })
);

/**
 * PUT /api/v1/budgets/:category
 * Update a budget
 */
router.put(
  "/:category",
  validateRequest(updateBudgetSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { limit, period } = req.validatedBody;

    const updateData: any = {};
    if (limit !== undefined) updateData.limit_amount = limit;
    if (period !== undefined) updateData.period = period;

    const { data, error } = await supabaseAdmin
      .from("budgets")
      .update(updateData)
      .eq("user_id", req.userId)
      .eq("category", req.params.category)
      .select()
      .single();

    if (error || !data) {
      throw new ApiError(404, "Budget not found");
    }

    res.json({
      success: true,
      data: {
        category: data.category,
        limit: data.limit_amount,
        period: data.period,
      },
      message: "Budget updated successfully",
    });
  })
);

/**
 * DELETE /api/v1/budgets/:category
 * Delete a budget
 */
router.delete(
  "/:category",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { error } = await supabaseAdmin
      .from("budgets")
      .delete()
      .eq("user_id", req.userId)
      .eq("category", req.params.category);

    if (error) {
      throw new ApiError(400, "Failed to delete budget");
    }

    res.json({
      success: true,
      message: "Budget deleted successfully",
    });
  })
);

/**
 * GET /api/v1/budgets/status/alerts
 * Get budget alerts for categories over limit
 */
router.get(
  "/status/alerts",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data: budgetStatus, error } = await supabaseAdmin.rpc("get_budget_status", {
      user_id: req.userId,
    });

    if (error) {
      throw new ApiError(400, "Failed to fetch budget alerts");
    }

    const alerts = budgetStatus
      ?.filter((b: any) => parseFloat(b.percentage_used) >= 80)
      .map((b: any) => ({
        category: b.category,
        limit: b.limit_amount,
        spent: b.spent,
        percentageUsed: parseFloat(b.percentage_used),
        severity: parseFloat(b.percentage_used) >= 100 ? "critical" : "warning",
      })) || [];

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  })
);

export default router;
