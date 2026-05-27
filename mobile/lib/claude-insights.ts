/**
 * Claude AI Insights Engine
 * Generates spending insights, predictions, and recommendations using Claude API
 */

import { zeniApi } from './api-client';

export interface Insight {
  id: string;
  type: 'spending' | 'prediction' | 'recommendation' | 'alert' | 'achievement';
  title: string;
  description: string;
  icon: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface SpendingPattern {
  topCategories: { category: string; percentage: number }[];
  averageDaily: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
  anomalies: Array<{ date: string; amount: number; reason: string }>;
}

export interface FinancialPrediction {
  projectedMonthlySpend: number;
  projectedBalance: number;
  riskOfShortfall: number;
  savingsOpportunities: Array<{ category: string; amount: number }>;
}

class ClaudeInsightsService {
  /**
   * Fetch all insights for the user
   */
  async getInsights(limit: number = 10): Promise<Insight[]> {
    try {
      const insights = await zeniApi.getInsights(limit);
      return Array.isArray(insights) ? insights : [];
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      return [];
    }
  }

  /**
   * Generate new insights based on recent transactions
   * Called after syncing new transactions or periodically
   */
  async generateInsights(): Promise<Insight[]> {
    try {
      const insights = await zeniApi.generateInsights();
      return Array.isArray(insights) ? insights : [];
    } catch (error) {
      console.error('Failed to generate insights:', error);
      throw new Error('Unable to generate insights at this time. Please try again later.');
    }
  }

  /**
   * Get spending pattern analysis
   */
  async getSpendingPattern(): Promise<SpendingPattern> {
    try {
      const pattern = await zeniApi.getSpendingPattern();
      return {
        topCategories: pattern.topCategories || [],
        averageDaily: pattern.averageDaily || 0,
        trendDirection: pattern.trendDirection || 'stable',
        trendPercentage: pattern.trendPercentage || 0,
        anomalies: pattern.anomalies || [],
      };
    } catch (error) {
      console.error('Failed to fetch spending pattern:', error);
      return {
        topCategories: [],
        averageDaily: 0,
        trendDirection: 'stable',
        trendPercentage: 0,
        anomalies: [],
      };
    }
  }

  /**
   * Get financial predictions and recommendations
   */
  async getFinancialPredictions(): Promise<FinancialPrediction> {
    try {
      const prediction = await zeniApi.getFinancialScore();
      return {
        projectedMonthlySpend: prediction.projectedMonthlySpend || 0,
        projectedBalance: prediction.projectedBalance || 0,
        riskOfShortfall: prediction.riskOfShortfall || 0,
        savingsOpportunities: prediction.savingsOpportunities || [],
      };
    } catch (error) {
      console.error('Failed to fetch financial predictions:', error);
      return {
        projectedMonthlySpend: 0,
        projectedBalance: 0,
        riskOfShortfall: 0,
        savingsOpportunities: [],
      };
    }
  }

  /**
   * Mark an insight as read
   */
  async markAsRead(insightId: string): Promise<void> {
    try {
      await zeniApi.markInsightAsRead(insightId);
    } catch (error) {
      console.error('Failed to mark insight as read:', error);
    }
  }

  /**
   * Dismiss/delete an insight
   */
  async dismissInsight(insightId: string): Promise<void> {
    try {
      await zeniApi.deleteInsight(insightId);
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  }

  /**
   * Get unread insights count for badge
   */
  async getUnreadCount(): Promise<number> {
    try {
      const data = await zeniApi.getUnreadInsightsCount();
      return data.count || 0;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  }

  /**
   * Format insight for display
   */
  formatInsightMessage(insight: Insight): string {
    switch (insight.type) {
      case 'spending':
        return `You've spent ${insight.data?.amount || '...'} on ${insight.category || 'shopping'} this month`;

      case 'prediction':
        return `Based on your spending, you'll have ₦${insight.data?.projectedBalance || '...'} left by month end`;

      case 'recommendation':
        return `💡 Tip: Consider setting a budget for ${insight.category} to save ₦${insight.data?.potentialSavings || '...'}`;

      case 'alert':
        return `⚠️ Warning: You're on track to exceed your ${insight.category} budget`;

      case 'achievement':
        return `🎉 Great job! You've stayed within budget for ${insight.data?.days || 7} days`;

      default:
        return insight.description;
    }
  }

  /**
   * Get icon for insight type
   */
  getInsightIcon(type: Insight['type']): string {
    const iconMap: Record<Insight['type'], string> = {
      spending: '📊',
      prediction: '🔮',
      recommendation: '💡',
      alert: '⚠️',
      achievement: '🎉',
    };
    return iconMap[type] || '📌';
  }

  /**
   * Categorize and prioritize insights for display
   */
  prioritizeInsights(insights: Insight[]): {
    critical: Insight[];
    important: Insight[];
    general: Insight[];
  } {
    return {
      critical: insights.filter(i => i.priority === 'high' && !i.isRead),
      important: insights.filter(i => i.priority === 'medium'),
      general: insights.filter(i => i.priority === 'low'),
    };
  }
}

export const claudeInsightsService = new ClaudeInsightsService();
