import { Router, Response } from "express";
import { supabaseAdmin } from "../services/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { validateRequest, updateProfileSchema } from "../middleware/validation.js";

const router = Router();

/**
 * GET /api/v1/users/profile
 * Get user profile
 */
router.get(
  "/profile",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", req.userId)
      .single();

    if (error || !data) {
      throw new ApiError(404, "User profile not found");
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        phoneNumber: data.phone_number,
        avatarUrl: data.avatar_url,
        monthlyIncome: data.monthly_income,
        monthlyExpenseTarget: data.monthly_expense_target,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  })
);

/**
 * PUT /api/v1/users/profile
 * Update user profile
 */
router.put(
  "/profile",
  validateRequest(updateProfileSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        first_name: req.validatedBody.firstName,
        last_name: req.validatedBody.lastName,
        monthly_income: req.validatedBody.monthlyIncome,
        monthly_expense_target: req.validatedBody.monthlyExpenseTarget,
      })
      .eq("id", req.userId)
      .select()
      .single();

    if (error || !data) {
      throw new ApiError(400, "Failed to update profile");
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        monthlyIncome: data.monthly_income,
        monthlyExpenseTarget: data.monthly_expense_target,
      },
      message: "Profile updated successfully",
    });
  })
);

/**
 * GET /api/v1/users/settings
 * Get user settings and preferences
 */
router.get(
  "/settings",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("notifications_enabled, spending_alerts_enabled, weekly_reports_enabled")
      .eq("id", req.userId)
      .single();

    if (error || !data) {
      throw new ApiError(404, "Settings not found");
    }

    res.json({
      success: true,
      data: {
        notificationsEnabled: data.notifications_enabled,
        spendingAlertsEnabled: data.spending_alerts_enabled,
        weeklyReportsEnabled: data.weekly_reports_enabled,
      },
    });
  })
);

/**
 * PUT /api/v1/users/settings
 * Update user settings
 */
router.put(
  "/settings",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { notificationsEnabled, spendingAlertsEnabled, weeklyReportsEnabled } = req.body;

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        notifications_enabled: notificationsEnabled ?? true,
        spending_alerts_enabled: spendingAlertsEnabled ?? true,
        weekly_reports_enabled: weeklyReportsEnabled ?? true,
      })
      .eq("id", req.userId)
      .select()
      .single();

    if (error || !data) {
      throw new ApiError(400, "Failed to update settings");
    }

    res.json({
      success: true,
      data: {
        notificationsEnabled: data.notifications_enabled,
        spendingAlertsEnabled: data.spending_alerts_enabled,
        weeklyReportsEnabled: data.weekly_reports_enabled,
      },
      message: "Settings updated successfully",
    });
  })
);

/**
 * GET /api/v1/users/financial-score
 * Calculate and get user financial health score
 */
router.get(
  "/financial-score",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data, error } = await supabaseAdmin.rpc("calculate_financial_score", {
      user_id: req.userId,
    });

    if (error) {
      throw new ApiError(400, "Failed to calculate score");
    }

    res.json({
      success: true,
      data: {
        score: data,
        maxScore: 100,
        percentage: (data / 100) * 100,
      },
    });
  })
);

export default router;
