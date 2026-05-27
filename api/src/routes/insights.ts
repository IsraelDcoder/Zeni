import { Router, Response } from "express";
import { supabaseAdmin } from "../services/supabase.js";
import { claudeService } from "../services/claude.js";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { v4 as uuid } from "uuid";

const router = Router();

/**
 * GET /api/v1/insights
 * Get recent insights for the user
 */
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { limit = 10, type } = req.query;

    let query = supabaseAdmin
      .from("ai_insights")
      .select("*")
      .eq("user_id", req.userId)
      .order("generated_at", { ascending: false })
      .limit(Number(limit));

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) {
      throw new ApiError(400, "Failed to fetch insights");
    }

    res.json({
      success: true,
      data: data?.map((i: any) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        title: i.title,
        message: i.message,
        actionItems: i.action_items,
        generatedAt: i.generated_at,
        expiresAt: i.expires_at,
        readAt: i.read_at,
      })) || [],
    });
  })
);

/**
 * GET /api/v1/insights/unread
 * Get count of unread insights
 */
router.get(
  "/unread",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data, error } = await supabaseAdmin
      .from("ai_insights")
      .select("*", { count: "exact", head: true })
      .eq("user_id", req.userId)
      .is("read_at", null);

    if (error) {
      throw new ApiError(400, "Failed to fetch unread count");
    }

    res.json({
      success: true,
      data: {
        unreadCount: data?.length || 0,
      },
    });
  })
);

/**
 * GET /api/v1/insights/:id
 * Get a specific insight
 */
router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data, error } = await supabaseAdmin
      .from("ai_insights")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single();

    if (error || !data) {
      throw new ApiError(404, "Insight not found");
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        type: data.type,
        severity: data.severity,
        title: data.title,
        message: data.message,
        actionItems: data.action_items,
        generatedAt: data.generated_at,
        expiresAt: data.expires_at,
        readAt: data.read_at,
      },
    });
  })
);

/**
 * PUT /api/v1/insights/:id/read
 * Mark insight as read
 */
router.put(
  "/:id/read",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from("ai_insights")
      .select("user_id")
      .eq("id", req.params.id)
      .single();

    if (!existing || existing.user_id !== req.userId) {
      throw new ApiError(404, "Insight not found");
    }

    const { data, error } = await supabaseAdmin
      .from("ai_insights")
      .update({ read_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error || !data) {
      throw new ApiError(400, "Failed to mark as read");
    }

    res.json({
      success: true,
      message: "Insight marked as read",
    });
  })
);

/**
 * DELETE /api/v1/insights/:id
 * Delete an insight
 */
router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from("ai_insights")
      .select("user_id")
      .eq("id", req.params.id)
      .single();

    if (!existing || existing.user_id !== req.userId) {
      throw new ApiError(404, "Insight not found");
    }

    const { error } = await supabaseAdmin
      .from("ai_insights")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      throw new ApiError(400, "Failed to delete insight");
    }

    res.json({
      success: true,
      message: "Insight deleted successfully",
    });
  })
);

/**
 * POST /api/v1/insights/generate
 * Generate new insights using Claude AI
 */
router.post(
  "/generate",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    try {
      // Get user profile
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("monthlyIncome, monthlyExpenseTarget")
        .eq("id", req.userId)
        .single();

      if (userError || !user) {
        throw new ApiError(400, "User not found");
      }

      // Get recent transactions
      const { data: transactions, error: txError } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("user_id", req.userId)
        .order("date", { ascending: false })
        .limit(50);

      if (txError) {
        throw new ApiError(400, "Failed to fetch transactions");
      }

      // Get budgets
      const { data: budgets, error: budgetError } = await supabaseAdmin
        .from("budgets")
        .select("*")
        .eq("user_id", req.userId);

      if (budgetError) {
        throw new ApiError(400, "Failed to fetch budgets");
      }

      // Prepare data for Claude
      const budgetMap: Record<string, number> = {};
      budgets?.forEach((b: any) => {
        budgetMap[b.category] = b.limit_amount;
      });

      const transactionData = (transactions || []).map((t: any) => ({
        category: t.category,
        amount: parseFloat(t.amount),
        description: t.description,
        date: t.date,
      }));

      // Generate Claude insights
      const claudeInsightText = await claudeService.generateInsights({
        userId: req.userId,
        transactions: transactionData,
        budgets: budgetMap,
        monthlyIncome: user.monthlyIncome,
      });

      let claudeInsight;
      try {
        claudeInsight = JSON.parse(claudeInsightText);
      } catch (e) {
        console.error("Failed to parse Claude response:", claudeInsightText);
        claudeInsight = {
          type: "recommendation",
          severity: "info",
          title: "Financial Analysis",
          insight: claudeInsightText,
          metric: "N/A",
        };
      }

      // Also generate budget alerts
      const insights = [];

      // Add Claude AI insight
      insights.push({
        id: uuid(),
        user_id: req.userId,
        type: claudeInsight.type || "recommendation",
        severity: claudeInsight.severity || "info",
        title: claudeInsight.title || "Financial Insight",
        message: claudeInsight.insight || claudeInsight.message || "",
        action_items: [claudeInsight.metric || ""],
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Budget alerts from database
      const { data: budgetStatus } = await supabaseAdmin.rpc("get_budget_status", {
        user_id: req.userId,
      });

      budgetStatus?.forEach((budget: any) => {
        const percentageUsed = parseFloat(budget.percentage_used);

        if (percentageUsed >= 100) {
          insights.push({
            id: uuid(),
            user_id: req.userId,
            type: "budget_alert",
            severity: "critical",
            title: `Over budget on ${budget.category}`,
            message: `You've exceeded your ${budget.category} budget by ₦${(budget.spent - budget.limit_amount).toFixed(2)}`,
            action_items: ["Review your spending", "Adjust your budget limit"],
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        } else if (percentageUsed >= 80) {
          insights.push({
            id: uuid(),
            user_id: req.userId,
            type: "budget_alert",
            severity: "warning",
            title: `Warning: ${budget.category} budget at ${percentageUsed.toFixed(0)}%`,
            message: `You've used ₦${budget.spent.toFixed(2)} of your ₦${budget.limit_amount.toFixed(2)} ${budget.category} budget`,
            action_items: ["Monitor your spending", "Consider reducing expenses"],
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      });

      // Insert insights
      if (insights.length > 0) {
        const { error } = await supabaseAdmin
          .from("ai_insights")
          .insert(
            insights.map((i: any) => ({
              ...i,
              action_items: i.action_items || [],
            }))
          );

        if (error) {
          console.error("Failed to insert insights:", error);
        }
      }

      res.json({
        success: true,
        data: {
          generated: insights.length,
          insights: insights.map((i: any) => ({
            type: i.type,
            severity: i.severity,
            title: i.title,
          })),
        },
        message: `Generated ${insights.length} insights`,
      });
    } catch (error) {
      console.error("Insight generation error:", error);
      throw new ApiError(500, "Failed to generate insights");
    }
  })
);

/**
 * GET /api/v1/insights/spending-pattern
 * Get spending pattern analysis
 */
router.get(
  "/analytics/spending-pattern",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    // Get last 30 days of transactions by day
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("amount, date, type")
      .eq("user_id", req.userId)
      .eq("type", "expense")
      .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Group by day
    const dailySpending: Record<string, number> = {};
    transactions?.forEach((t: any) => {
      const date = new Date(t.date).toLocaleDateString();
      dailySpending[date] = (dailySpending[date] || 0) + parseFloat(t.amount);
    });

    const average = Object.values(dailySpending).reduce((a: number, b: number) => a + b, 0) / 
                   Object.keys(dailySpending).length || 0;

    res.json({
      success: true,
      data: {
        dailySpending,
        averageDailySpending: average,
        totalDays: Object.keys(dailySpending).length,
        trend: average > 0 ? "increasing" : "stable",
      },
    });
  })
);

export default router;
