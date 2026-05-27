// Transaction Categorization Service: AI-powered transaction classification
import Anthropic from "@anthropic-ai/sdk";

interface TransactionData {
  description: string;
  amount: number;
  merchant?: string;
  type: "debit" | "credit";
}

interface CategoryResult {
  category: string;
  confidence: number; // 0-1
  reasoning: string;
}

// Transaction category taxonomy
const CATEGORIES = {
  FOOD: "Food & Dining",
  TRANSPORT: "Transportation",
  UTILITIES: "Utilities & Bills",
  SHOPPING: "Shopping",
  ENTERTAINMENT: "Entertainment",
  HEALTH: "Healthcare & Medical",
  EDUCATION: "Education",
  SUBSCRIPTIONS: "Subscriptions & Memberships",
  SALARY: "Salary & Income",
  TRANSFER: "Transfer & Remittance",
  INVESTMENT: "Investment & Savings",
  FEES: "Fees & Charges",
  INSURANCE: "Insurance",
  TAXES: "Taxes",
  PERSONAL: "Personal Care",
  HOME: "Home & Garden",
  BUSINESS: "Business Expenses",
  RECREATION: "Recreation",
  OTHER: "Other",
};

export class TransactionCategorizationService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  /**
   * Categorize a single transaction using Claude AI
   */
  async categorizeTransaction(transaction: TransactionData): Promise<CategoryResult> {
    try {
      const prompt = this._buildCategorizationPrompt(transaction);

      const message = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Parse response
      const response =
        message.content[0].type === "text" ? message.content[0].text : "";
      return this._parseCategorizationResponse(response);
    } catch (error) {
      console.error("Error categorizing transaction:", error);
      // Return default categorization on error
      return {
        category: CATEGORIES.OTHER,
        confidence: 0.5,
        reasoning: "Could not categorize - defaulting to Other",
      };
    }
  }

  /**
   * Categorize multiple transactions in batch
   */
  async categorizeTransactionsBatch(
    transactions: TransactionData[]
  ): Promise<CategoryResult[]> {
    try {
      // Batch categorization for efficiency
      const batchSize = 5;
      const results: CategoryResult[] = [];

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((tx) => this.categorizeTransaction(tx))
        );
        results.push(...batchResults);
      }

      return results;
    } catch (error) {
      console.error("Error in batch categorization:", error);
      throw error;
    }
  }

  /**
   * Detect recurring transactions
   */
  async detectRecurring(transactions: TransactionData[]): Promise<Map<string, number>> {
    try {
      const merchantCounts = new Map<string, number>();

      transactions.forEach((tx) => {
        const key = tx.merchant || tx.description;
        const count = merchantCounts.get(key) || 0;
        merchantCounts.set(key, count + 1);
      });

      // Filter merchants that appear 3+ times (likely recurring)
      const recurring = new Map<string, number>();
      merchantCounts.forEach((count, merchant) => {
        if (count >= 3) {
          recurring.set(merchant, count);
        }
      });

      return recurring;
    } catch (error) {
      console.error("Error detecting recurring:", error);
      return new Map();
    }
  }

  /**
   * Analyze spending patterns
   */
  async analyzeSpendingPatterns(transactions: TransactionData[]): Promise<{
    topCategories: { category: string; total: number }[];
    totalSpent: number;
    averageTransaction: number;
    spendingTrend: "increasing" | "decreasing" | "stable";
  }> {
    try {
      const categorized = await this.categorizeTransactionsBatch(transactions);

      // Group by category
      const categoryTotals = new Map<string, number>();
      let totalSpent = 0;

      transactions.forEach((tx, idx) => {
        if (tx.type === "debit") {
          const category = categorized[idx]?.category || CATEGORIES.OTHER;
          const current = categoryTotals.get(category) || 0;
          categoryTotals.set(category, current + tx.amount);
          totalSpent += tx.amount;
        }
      });

      // Sort by total spent
      const topCategories = Array.from(categoryTotals.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      // Calculate trend (very simplified)
      const firstHalf = transactions.slice(0, Math.floor(transactions.length / 2));
      const secondHalf = transactions.slice(Math.floor(transactions.length / 2));

      const firstHalfTotal = firstHalf.reduce((sum, tx) => sum + (tx.type === "debit" ? tx.amount : 0), 0);
      const secondHalfTotal = secondHalf.reduce((sum, tx) => sum + (tx.type === "debit" ? tx.amount : 0), 0);

      let spendingTrend: "increasing" | "decreasing" | "stable" = "stable";
      if (secondHalfTotal > firstHalfTotal * 1.1) {
        spendingTrend = "increasing";
      } else if (secondHalfTotal < firstHalfTotal * 0.9) {
        spendingTrend = "decreasing";
      }

      return {
        topCategories,
        totalSpent,
        averageTransaction: totalSpent / transactions.filter((t) => t.type === "debit").length,
        spendingTrend,
      };
    } catch (error) {
      console.error("Error analyzing patterns:", error);
      throw error;
    }
  }

  /**
   * Build AI prompt for categorization
   */
  private _buildCategorizationPrompt(transaction: TransactionData): string {
    const categories = Object.entries(CATEGORIES)
      .map(([_, value]) => `- ${value}`)
      .join("\n");

    return `Categorize the following bank transaction into ONE of these categories and provide confidence score.

Transaction Details:
- Description: ${transaction.description}
- Amount: ₦${transaction.amount}
- Merchant: ${transaction.merchant || "Unknown"}
- Type: ${transaction.type}

Available Categories:
${categories}

Respond in EXACTLY this JSON format (no markdown):
{
  "category": "Category Name",
  "confidence": 0.95,
  "reasoning": "Brief reason why"
}

Be confident but realistic. If unclear, confidence can be lower.`;
  }

  /**
   * Parse AI response
   */
  private _parseCategorizationResponse(response: string): CategoryResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate response
      if (!parsed.category || typeof parsed.confidence !== "number") {
        throw new Error("Invalid response format");
      }

      return {
        category: parsed.category,
        confidence: Math.min(1, Math.max(0, parsed.confidence)), // Clamp 0-1
        reasoning: parsed.reasoning || "",
      };
    } catch (error) {
      console.error("Error parsing categorization response:", error);
      return {
        category: CATEGORIES.OTHER,
        confidence: 0.3,
        reasoning: "Parse error - defaulting to Other",
      };
    }
  }
}

export default new TransactionCategorizationService();
