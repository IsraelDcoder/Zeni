import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "./supabase.js";

interface TransactionData {
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface InsightGenerationInput {
  userId: string;
  transactions: TransactionData[];
  budgets: Record<string, number>;
  monthlyIncome: number;
}

class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    });
  }

  /**
   * Analyze spending patterns and generate insights
   */
  async generateInsights(input: InsightGenerationInput): Promise<string> {
    const { userId, transactions, budgets, monthlyIncome } = input;

    // Calculate spending summary
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const byCategory = this.aggregateByCategory(transactions);
    const impulseTransactions = this.detectImpulse(transactions);

    const prompt = `
You are Zara, an AI financial advisor for a Nigerian personal finance app called Zeni. Analyze this user's spending data and provide ONE specific, actionable insight.

User Financial Data:
- Monthly Income: ₦${monthlyIncome.toLocaleString("en-NG")}
- Total Spending (last 30 days): ₦${totalSpent.toLocaleString("en-NG")}
- Savings Rate: ${((monthlyIncome - totalSpent) / monthlyIncome * 100).toFixed(1)}%

Spending by Category:
${Object.entries(byCategory)
  .map(([cat, amount]) => `- ${cat}: ₦${(amount as number).toLocaleString("en-NG")}`)
  .join("\n")}

Budget Alerts:
${Object.entries(budgets)
  .map(([cat, limit]) => {
    const spent = (byCategory[cat] as number) || 0;
    const pct = ((spent / (limit as number)) * 100).toFixed(0);
    return `- ${cat}: ${pct}% of budget (₦${spent.toLocaleString("en-NG")} / ₦${(limit as number).toLocaleString("en-NG")})`;
  })
  .join("\n")}

Recent Transactions:
${transactions
  .slice(0, 10)
  .map(
    (t) => `- ${t.date}: ${t.description} (${t.category}) - ₦${t.amount.toLocaleString("en-NG")}`
  )
  .join("\n")}

Impulse Spending Detected:
${impulseTransactions.length > 0 ? `${impulseTransactions.length} impulse purchases totaling ₦${impulseTransactions.reduce((s, t) => s + t.amount, 0).toLocaleString("en-NG")}` : "None"}

Generate ONE specific insight that:
1. Is actionable (the user can do something about it TODAY)
2. Uses Nigerian context (Lagos, naira, Nigerian merchants)
3. Is empathetic but direct
4. Includes a specific number or percentage
5. Suggests one concrete action

Format as JSON:
{
  "type": "budget_alert|spending_pattern|anomaly_detection|recommendation|goal_progress",
  "severity": "info|warning|critical|positive",
  "title": "Short title",
  "insight": "1-2 sentences with specific action",
  "metric": "percentage or amount"
}
`;

    try {
      const message = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === "text") {
        return content.text;
      }

      throw new Error("Unexpected response format from Claude");
    } catch (error) {
      console.error("Claude API error:", error);
      throw error;
    }
  }

  /**
   * Classify a transaction using AI
   */
  async classifyTransaction(
    description: string,
    amount: number
  ): Promise<{
    category: string;
    confidence: number;
    isImpulse: boolean;
  }> {
    const categories = [
      "food",
      "transport",
      "entertainment",
      "utilities",
      "shopping",
      "health",
      "education",
      "rent",
      "betting",
      "subscriptions",
      "transfers",
      "other",
    ];

    const prompt = `
Classify this Nigerian transaction:
Description: "${description}"
Amount: ₦${amount}

Categories: ${categories.join(", ")}

Respond with JSON:
{
  "category": "one of the categories",
  "confidence": 0.0 to 1.0,
  "isImpulse": true/false,
  "reasoning": "brief explanation"
}
`;

    try {
      const message = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === "text") {
        const result = JSON.parse(content.text);
        return {
          category: result.category,
          confidence: result.confidence,
          isImpulse: result.isImpulse,
        };
      }

      throw new Error("Unexpected response format from Claude");
    } catch (error) {
      console.error("Classification error:", error);
      // Return safe default
      return {
        category: "other",
        confidence: 0.3,
        isImpulse: false,
      };
    }
  }

  /**
   * Generate personalized financial recommendations
   */
  async generateRecommendations(userId: string): Promise<string[]> {
    try {
      // Fetch user's data
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) throw userError;

      // Fetch recent transactions
      const { data: transactions, error: txError } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(50);

      if (txError) throw txError;

      const prompt = `
Based on this Nigerian user's financial profile:
- Monthly Income: ₦${user.monthlyIncome}
- Expense Target: ₦${user.monthlyExpenseTarget}
- Recent spending: ${transactions.map((t: any) => `${t.category} ₦${t.amount}`).join(", ")}

Generate 3 specific, actionable financial recommendations:
1. One for savings
2. One for spending control
3. One for income growth

Format as JSON array of strings.
`;

      const message = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === "text") {
        return JSON.parse(content.text);
      }

      return [];
    } catch (error) {
      console.error("Recommendation generation error:", error);
      return [];
    }
  }

  private aggregateByCategory(
    transactions: TransactionData[]
  ): Record<string, number> {
    return transactions.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private detectImpulse(transactions: TransactionData[]): TransactionData[] {
    // Transactions late at night (after 9 PM) or on weekends
    return transactions.filter((t) => {
      const date = new Date(t.date);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const isLateNight = hour >= 21 || hour <= 3;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      return isLateNight || isWeekend;
    });
  }

  /**
   * Analyze savings potential and recommend safe savings amount
   * This is used by the AI Safe Save feature
   */
  async analyzeSavingsPotential(input: {
    userId: string;
    transactions: TransactionData[];
    monthlyIncome: number;
    emergencyFund?: number;
  }): Promise<{
    recommendedMonthly: number;
    recommendedWeekly: number;
    safetyScore: number;
    survivalDaysAfterSaving: number;
    potentialAnnualSavings: number;
    analysis: string;
  }> {
    const { userId, transactions, monthlyIncome, emergencyFund = 0 } = input;

    try {
      // Calculate spending metrics
      const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
      const avgDailySpend = totalSpent / 30;
      const avgMonthlySpend = totalSpent;
      const impulseSpend = this.detectImpulse(transactions).reduce(
        (sum, t) => sum + t.amount,
        0
      );

      // Calculate potential savings without impulse spending
      const optimizedSpend = avgMonthlySpend - impulseSpend * 0.5;
      const potentialMonthly = monthlyIncome - optimizedSpend;

      // Conservative recommendation: save 30-50% of potential
      const recommendedMonthly = Math.max(
        potentialMonthly * 0.3,
        monthlyIncome * 0.05
      );
      const recommendedWeekly = recommendedMonthly / 4.3;

      // Calculate survival score
      const monthlyBuffer = monthlyIncome - avgMonthlySpend;
      const survivalDaysAfterSaving =
        Math.floor(
          ((emergencyFund + monthlyBuffer * 3) / avgDailySpend) * 30
        ) / 30;

      // Safety score: 0-100
      // Factors: income stability, spending variability, emergency fund, potential savings
      const baseScore = Math.min(
        100,
        (monthlyBuffer / monthlyIncome) * 100 * 0.5 +
          (survivalDaysAfterSaving / 90) * 50
      );
      const safetyScore = Math.max(0, baseScore);

      // Annual projection
      const potentialAnnualSavings = recommendedMonthly * 12;

      const prompt = `
Analyze this Nigerian user's savings potential and generate a brief, actionable analysis:

Financial Profile:
- Monthly Income: ₦${monthlyIncome.toLocaleString("en-NG")}
- Average Monthly Spending: ₦${avgMonthlySpend.toLocaleString("en-NG")}
- Monthly Buffer: ₦${monthlyBuffer.toLocaleString("en-NG")}
- Impulse Spending Detected: ₦${impulseSpend.toLocaleString("en-NG")}
- Recommended Monthly Savings: ₦${recommendedMonthly.toLocaleString("en-NG")}
- Potential Annual Savings: ₦${potentialAnnualSavings.toLocaleString("en-NG")}

Generate ONE sentence that:
1. Affirms their savings potential
2. Explains how saving ₦${recommendedMonthly.toLocaleString("en-NG")}/month will impact them
3. Is encouraging but realistic

Keep it under 20 words. Format as plain text (no JSON).
`;

      const message = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      const analysis =
        content.type === "text" ? content.text : "Save consistently to build your emergency fund";

      return {
        recommendedMonthly: Math.round(recommendedMonthly),
        recommendedWeekly: Math.round(recommendedWeekly),
        safetyScore: Math.round(safetyScore),
        survivalDaysAfterSaving: survivalDaysAfterSaving,
        potentialAnnualSavings: Math.round(potentialAnnualSavings),
        analysis,
      };
    } catch (error) {
      console.error("Savings potential analysis error:", error);

      // Return conservative defaults on error
      const recommendedMonthly = Math.max(monthlyIncome * 0.1, 5000);
      return {
        recommendedMonthly,
        recommendedWeekly: Math.round(recommendedMonthly / 4.3),
        safetyScore: 50,
        survivalDaysAfterSaving: 30,
        potentialAnnualSavings: recommendedMonthly * 12,
        analysis: "Start small with consistent savings",
      };
    }
  }
}

export const claudeService = new ClaudeService();
