import { Router, Response } from "express";
import { supabaseAdmin } from "../services/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import {
  validateRequest,
  createTransactionSchema,
  updateTransactionSchema,
} from "../middleware/validation.js";
import { v4 as uuid } from "uuid";

const router = Router();

/**
 * GET /api/v1/transactions
 * List user transactions with optional filtering
 */
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const {
      category,
      type,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = supabaseAdmin
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", req.userId)
      .order("date", { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq("category", category);
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (startDate) {
      query = query.gte("date", new Date(startDate as string).toISOString());
    }
    if (endDate) {
      query = query.lte("date", new Date(endDate as string).toISOString());
    }

    // Apply pagination
    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError(400, "Failed to fetch transactions");
    }

    res.json({
      success: true,
      data: data?.map((t: any) => ({
        id: t.id,
        amount: t.amount,
        description: t.description,
        category: t.category,
        type: t.type,
        date: t.date,
        isImpulse: t.is_impulse,
        source: t.source,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })) || [],
      pagination: {
        total: count || 0,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  })
);

/**
 * POST /api/v1/transactions
 * Create a new transaction
 */
router.post(
  "/",
  validateRequest(createTransactionSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { amount, description, category, type, date, isImpulse } = req.validatedBody;

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        id: uuid(),
        user_id: req.userId,
        amount,
        description,
        category,
        type,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        is_impulse: isImpulse || false,
        source: "manual",
      })
      .select()
      .single();

    if (error || !data) {
      throw new ApiError(400, "Failed to create transaction");
    }

    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        amount: data.amount,
        description: data.description,
        category: data.category,
        type: data.type,
        date: data.date,
        isImpulse: data.is_impulse,
      },
      message: "Transaction created successfully",
    });
  })
);

/**
 * GET /api/v1/transactions/:id
 * Get a single transaction
 */
router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single();

    if (error || !data) {
      throw new ApiError(404, "Transaction not found");
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        amount: data.amount,
        description: data.description,
        category: data.category,
        type: data.type,
        date: data.date,
        isImpulse: data.is_impulse,
      },
    });
  })
);

/**
 * PUT /api/v1/transactions/:id
 * Update a transaction
 */
router.put(
  "/:id",
  validateRequest(updateTransactionSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("transactions")
      .select("user_id")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !existing || existing.user_id !== req.userId) {
      throw new ApiError(404, "Transaction not found");
    }

    const updateData: any = {};
    if (req.validatedBody.amount !== undefined) updateData.amount = req.validatedBody.amount;
    if (req.validatedBody.description !== undefined) updateData.description = req.validatedBody.description;
    if (req.validatedBody.category !== undefined) updateData.category = req.validatedBody.category;
    if (req.validatedBody.type !== undefined) updateData.type = req.validatedBody.type;

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .update(updateData)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error || !data) {
      throw new ApiError(400, "Failed to update transaction");
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        amount: data.amount,
        description: data.description,
        category: data.category,
        type: data.type,
      },
      message: "Transaction updated successfully",
    });
  })
);

/**
 * DELETE /api/v1/transactions/:id
 * Delete a transaction
 */
router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("transactions")
      .select("user_id")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !existing || existing.user_id !== req.userId) {
      throw new ApiError(404, "Transaction not found");
    }

    const { error } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      throw new ApiError(400, "Failed to delete transaction");
    }

    res.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  })
);

/**
 * GET /api/v1/transactions/analytics/summary
 * Get transaction analytics and summary
 */
router.get(
  "/analytics/summary",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    // Get monthly spending by category
    const { data: categoryBreakdown, error: categoryError } = await supabaseAdmin
      .from("transactions")
      .select("category, amount, type")
      .eq("user_id", req.userId)
      .eq("type", "expense")
      .gte("date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    if (categoryError) {
      throw new ApiError(400, "Failed to fetch analytics");
    }

    // Group by category
    const categoryTotals: Record<string, number> = {};
    categoryBreakdown?.forEach((t: any) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
    });

    // Get total income and expenses
    const { data: allTransactions } = await supabaseAdmin
      .from("transactions")
      .select("amount, type")
      .eq("user_id", req.userId)
      .gte("date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const totalIncome = allTransactions
      ?.filter((t: any) => t.type === "income")
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0;

    const totalExpenses = allTransactions
      ?.filter((t: any) => t.type === "expense")
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0;

    res.json({
      success: true,
      data: {
        month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
        categoryBreakdown: categoryTotals,
      },
    });
  })
);

export default router;
