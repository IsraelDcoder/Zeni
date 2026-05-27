import { useState, useEffect, useCallback } from 'react';
import { zeniApi } from './api-client';

// Wallet Hooks
export function useWallets() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await zeniApi.getWallets();
      setWallets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(zeniApi.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const createWallet = useCallback(
    async (type: 'savings' | 'vault' | 'emergency' | 'goal', name: string) => {
      try {
        const wallet = await zeniApi.createWallet(type, name);
        setWallets([...wallets, wallet]);
        return wallet;
      } catch (err) {
        const errorMsg = zeniApi.getErrorMessage(err);
        setError(errorMsg);
        throw err;
      }
    },
    [wallets]
  );

  return {
    wallets,
    loading,
    error,
    createWallet,
    refetch: fetchWallets,
  };
}

export function useWallet(walletId: string) {
  const [wallet, setWallet] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWallet();
  }, [walletId]);

  const fetchWallet = useCallback(async () => {
    if (!walletId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await zeniApi.getWallet(walletId);
      setWallet(data.wallet);
      setLedger(data.ledger);
      setTransactions(data.recentTransactions || []);
    } catch (err) {
      setError(zeniApi.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [walletId]);

  const getTransactionHistory = useCallback(
    async (limit?: number) => {
      try {
        const txs = await zeniApi.getWalletTransactions(walletId, limit);
        setTransactions(txs);
        return txs;
      } catch (err) {
        setError(zeniApi.getErrorMessage(err));
        throw err;
      }
    },
    [walletId]
  );

  return {
    wallet,
    ledger,
    transactions,
    loading,
    error,
    getTransactionHistory,
    refetch: fetchWallet,
  };
}

// Savings Goals Hooks
export function useSavingsGoals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await zeniApi.getWalletSavingsGoals();
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(zeniApi.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const createGoal = useCallback(
    async (
      name: string,
      emoji: string,
      targetAmount: number,
      deadline: string,
      color?: string
    ) => {
      try {
        const goal = await zeniApi.createWalletSavingsGoal(
          name,
          emoji,
          targetAmount,
          deadline,
          color
        );
        setGoals([...goals, goal]);
        return goal;
      } catch (err) {
        const errorMsg = zeniApi.getErrorMessage(err);
        setError(errorMsg);
        throw err;
      }
    },
    [goals]
  );

  const updateProgress = useCallback(
    async (goalId: string, amount: number) => {
      try {
        const updatedGoal = await zeniApi.updateGoalProgress(goalId, amount);
        setGoals(
          goals.map((g) => (g.id === goalId ? updatedGoal : g))
        );
        return updatedGoal;
      } catch (err) {
        const errorMsg = zeniApi.getErrorMessage(err);
        setError(errorMsg);
        throw err;
      }
    },
    [goals]
  );

  return {
    goals,
    loading,
    error,
    createGoal,
    updateProgress,
    refetch: fetchGoals,
  };
}

export function useSavingsGoal(goalId: string) {
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoal = async () => {
      if (!goalId) return;
      // Get from list and filter
      try {
        const goals = await zeniApi.getWalletSavingsGoals();
        const found = goals.find((g) => g.id === goalId);
        setGoal(found || null);
      } catch (err) {
        setError(zeniApi.getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchGoal();
  }, [goalId]);

  const updateProgress = useCallback(
    async (amount: number) => {
      try {
        const updated = await zeniApi.updateGoalProgress(goalId, amount);
        setGoal(updated);
        return updated;
      } catch (err) {
        const errorMsg = zeniApi.getErrorMessage(err);
        setError(errorMsg);
        throw err;
      }
    },
    [goalId]
  );

  return {
    goal,
    loading,
    error,
    updateProgress,
  };
}

// Savings Automations Hook
export function useSavingsAutomations() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await zeniApi.getSavingsAutomations();
      setAutomations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(zeniApi.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const createAutomation = useCallback(
    async (
      type: 'percentage' | 'fixed' | 'roundup' | 'ai_safe_save',
      frequency: 'daily' | 'weekly' | 'monthly',
      amount?: number,
      percentage?: number
    ) => {
      try {
        const automation = await zeniApi.createSavingsAutomation(
          type,
          frequency,
          amount,
          percentage
        );
        setAutomations([...automations, automation]);
        return automation;
      } catch (err) {
        const errorMsg = zeniApi.getErrorMessage(err);
        setError(errorMsg);
        throw err;
      }
    },
    [automations]
  );

  return {
    automations,
    loading,
    error,
    createAutomation,
    refetch: fetchAutomations,
  };
}

// AI Safe Save Hook
export function useAISafeSave() {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await zeniApi.getAISafeSaveRecommendation();
      setRecommendation(data);
      return data;
    } catch (err) {
      const errorMsg = zeniApi.getErrorMessage(err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const enable = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const automation = await zeniApi.enableAISafeSave();
      setRecommendation(automation);
      return automation;
    } catch (err) {
      const errorMsg = zeniApi.getErrorMessage(err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    recommendation,
    loading,
    error,
    fetch,
    enable,
  };
}

// Savings Summary Hook
export function useSavingsSummary() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await zeniApi.getSavingsSummary();
      setSummary(data);
    } catch (err) {
      setError(zeniApi.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
}
