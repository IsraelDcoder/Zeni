import { Router, Response } from "express";
import { supabaseAdmin } from "../services/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import {
  validateRequest,
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
} from "../middleware/validation.js";
import { v4 as uuid } from "uuid";

const router = Router();

/**
 * GET /api/v1/savings-goals
 * Get all savings goals
 */
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data, error } = await supabaseAdmin
      .from("savings_goals")
      .select("*")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ApiError(400, "Failed to fetch savings goals");
    }

    res.json({
      success: true,
      data: data?.map((g: any) => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        targetAmount: g.target_amount,
        currentAmount: g.current_amount,
        percentageComplete: (g.current_amount / g.target_amount) * 100,
        deadline: g.deadline,
        priority: g.priority,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      })) || [],
    });
  })
);

/**
 * POST /api/v1/savings-goals
 * Create a new savings goal
 */
router.post(
  "/",
  validateRequest(createSavingsGoalSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { name, emoji, targetAmount, deadline, priority = "medium" } = req.validatedBody;

    const { data, error } = await supabaseAdmin
      .from("savings_goals")
      .insert({
        id: uuid(),
        user_id: req.userId,
        name,
        emoji,
        target_amount: targetAmount,
        current_amount: 0,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        priority,
      })
      .select()
      .single();

    if (error || !data) {
      throw new ApiError(400, "Failed to create savings goal");
    }

    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        emoji: data.emoji,
        targetAmount: data.target_amount,
        currentAmount: data.current_amount,
        deadline: data.deadline,
        priority: data.priority,
      },
      message: "Savings goal created successfully",
    });
  })
);

/**
 * GET /api/v1/savings-goals/:id
 * Get a specific savings goal
 */
router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data, error } = await supabaseAdmin
      .from("savings_goals")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single();

    if (error || !data) {
      throw new ApiError(404, "Savings goal not found");
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        emoji: data.emoji,
        targetAmount: data.target_amount,
        currentAmount: data.current_amount,
        percentageComplete: (data.current_amount / data.target_amount) * 100,
        deadline: data.deadline,
        priority: data.priority,
      },
    });
  })
);

/**
 * PUT /api/v1/savings-goals/:id
 * Update a savings goal
 */
router.put(
  "/:id",
  validateRequest(updateSavingsGoalSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from("savings_goals")
      .select("user_id")
      .eq("id", req.params.id)
      .single();

    if (!existing || existing.user_id !== req.userId) {
      throw new ApiError(404, "Savings goal not found");
    }

    const updateData: any = {};
    if (req.validatedBody.name !== undefined) updateData.name = req.validatedBody.name;
    if (req.validatedBody.emoji !== undefined) updateData.emoji = req.validatedBody.emoji;
    if (req.validatedBody.targetAmount !== undefined) updateData.target_amount = req.validatedBody.targetAmount;
    if (req.validatedBody.currentAmount !== undefined) updateData.current_amount = req.validatedBody.currentAmount;
    if (req.validatedBody.deadline !== undefined) updateData.deadline = req.validatedBody.deadline;
    if (req.validatedBody.priority !== undefined) updateData.priority = req.validatedBody.priority;

    const { data, error } = await supabaseAdmin
      .from("savings_goals")
      .update(updateData)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error || !data) {
      throw new ApiError(400, "Failed to update savings goal");
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        emoji: data.emoji,
        targetAmount: data.target_amount,
        currentAmount: data.current_amount,
        percentageComplete: (data.current_amount / data.target_amount) * 100,
      },
      message: "Savings goal updated successfully",
    });
  })
);

/**
 * DELETE /api/v1/savings-goals/:id
 * Delete a savings goal
 */
router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from("savings_goals")
      .select("user_id")
      .eq("id", req.params.id)
      .single();

    if (!existing || existing.user_id !== req.userId) {
      throw new ApiError(404, "Savings goal not found");
    }

    const { error } = await supabaseAdmin
      .from("savings_goals")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      throw new ApiError(400, "Failed to delete savings goal");
    }

    res.json({
      success: true,
      message: "Savings goal deleted successfully",
    });
  })
);

/**
 * PUT /api/v1/savings-goals/:id/progress
 * Update progress on a savings goal
 */
router.put(
  "/:id/progress",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { amount } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      throw new ApiError(400, "Invalid progress amount");
    }

    // Get current goal
    const { data: goal } = await supabaseAdmin
      .from("savings_goals")
      .select("current_amount, target_amount")
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single();

    if (!goal) {
      throw new ApiError(404, "Savings goal not found");
    }

    const newAmount = Math.min(goal.current_amount + amount, goal.target_amount);

    const { data, error } = await supabaseAdmin
      .from("savings_goals")
      .update({ current_amount: newAmount })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error || !data) {
      throw new ApiError(400, "Failed to update progress");
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        currentAmount: data.current_amount,
        targetAmount: data.target_amount,
        percentageComplete: (data.current_amount / data.target_amount) * 100,
        reached: data.current_amount >= data.target_amount,
      },
      message: "Progress updated successfully",
    });
  })
);

export default router;
