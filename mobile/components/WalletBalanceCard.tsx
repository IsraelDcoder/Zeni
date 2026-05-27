/**
 * Wallet Balance & Savings Display Component
 * 
 * Shows user's wallet balance, savings progress, and quick actions
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from './GlassCard';
import { useColors } from '@/hooks/useColors';
import { zeniApi } from '@/lib/api-client';

interface WalletBalance {
  balance: number;
  lockedBalance: number;
  totalSaved: number;
  totalWithdrawn: number;
  currency: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  status: string;
  progressPercent: number;
}

interface WalletStats {
  balance: number;
  totalSaved: number;
  totalWithdrawn: number;
  activeGoals: number;
  totalGoalsAmount: number;
  completedGoals: number;
  recentDeposits: number;
  recentWithdrawals: number;
}

interface WalletBalanceCardProps {
  onDepositPress?: () => void;
  onWithdrawPress?: () => void;
  onViewDetailsPress?: () => void;
}

export function WalletBalanceCard({
  onDepositPress,
  onWithdrawPress,
  onViewDetailsPress,
}: WalletBalanceCardProps) {
  const { colors } = useColors();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const data = await zeniApi.getWalletBalance();
      setBalance(data);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await zeniApi.getWalletBalance();
      setBalance(data);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!balance) {
    return null;
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      scrollEnabled={false}
    >
      {/* Main Balance Card */}
      <LinearGradient
        colors={[colors.accent + '20', colors.accent + '05']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mainCard}
      >
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Total Savings</Text>
          <Feather name="info" size={16} color={colors.textSecondary} />
        </View>

        <Text style={styles.balanceAmount}>
          ₦{balance.balance.toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>

        <Text style={styles.balanceSubtext}>
          {balance.totalSaved > 0
            ? `Total saved: ₦${balance.totalSaved.toLocaleString('en-NG')}`
            : 'Start saving to build your wealth'}
        </Text>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={styles.statValue}>
              ₦{(balance.balance - balance.lockedBalance).toLocaleString('en-NG')}
            </Text>
          </View>

          <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
            <Text style={styles.statLabel}>Locked in Goals</Text>
            <Text style={styles.statValue}>
              ₦{balance.lockedBalance.toLocaleString('en-NG')}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
            onPress={onDepositPress}
          >
            <Feather name="arrow-down" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Deposit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.border }]}
            onPress={onWithdrawPress}
          >
            <Feather name="arrow-up" size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Withdraw</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.border }]}
            onPress={onViewDetailsPress}
          >
            <Feather name="eye" size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Details</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

/**
 * Savings Goals Display
 */
export function SavingsGoalsCard() {
  const { colors } = useColors();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await zeniApi.getWalletGoals();
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching savings goals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  if (goals.length === 0) {
    return (
      <GlassCard style={styles.emptyState}>
        <Feather name="target" size={32} color={colors.textSecondary} />
        <Text style={styles.emptyStateText}>No savings goals yet</Text>
        <Text style={styles.emptyStateSubtext}>Create your first goal to get started</Text>
      </GlassCard>
    );
  }

  return (
    <View style={styles.goalsContainer}>
      <Text style={styles.sectionTitle}>Savings Goals</Text>
      {goals.map((goal) => (
        <GlassCard key={goal.id} style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View>
              <Text style={styles.goalName}>{goal.name}</Text>
              <Text style={styles.goalTarget}>
                Target: ₦{goal.target_amount.toLocaleString('en-NG')}
              </Text>
            </View>
            <Text style={styles.goalProgress}>{goal.progressPercent}%</Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(goal.progressPercent, 100)}%`,
                  backgroundColor:
                    goal.progressPercent >= 100 ? colors.success : colors.accent,
                },
              ]}
            />
          </View>

          <View style={styles.goalFooter}>
            <Text style={styles.goalCurrent}>
              ₦{goal.current_amount.toLocaleString('en-NG')} saved
            </Text>
            {goal.target_date && (
              <Text style={styles.goalDate}>
                Due: {new Date(goal.target_date).toLocaleDateString()}
              </Text>
            )}
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

/**
 * Wallet Statistics
 */
export function WalletStatsCard() {
  const { colors } = useColors();
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await zeniApi.getWalletStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return null;
  }

  return (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>Savings Summary</Text>
      <GlassCard style={styles.statsGrid}>
        <View style={styles.statsGridItem}>
          <Feather name="trending-up" size={24} color={colors.success} />
          <Text style={styles.statGridLabel}>Total Saved</Text>
          <Text style={styles.statGridValue}>
            ₦{stats.totalSaved.toLocaleString('en-NG')}
          </Text>
        </View>

        <View style={[styles.statsGridItem, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
          <Feather name="target" size={24} color={colors.accent} />
          <Text style={styles.statGridLabel}>Active Goals</Text>
          <Text style={styles.statGridValue}>{stats.activeGoals}</Text>
        </View>

        <View style={[styles.statsGridItem, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Feather name="award" size={24} color={colors.warning} />
          <Text style={styles.statGridLabel}>Goals Completed</Text>
          <Text style={styles.statGridValue}>{stats.completedGoals}</Text>
        </View>

        <View
          style={[
            styles.statsGridItem,
            {
              borderTopWidth: 1,
              borderTopColor: colors.border,
              borderLeftWidth: 1,
              borderLeftColor: colors.border,
            },
          ]}
        >
          <Feather name="layers" size={24} color={colors.secondary} />
          <Text style={styles.statGridLabel}>Goal Amount</Text>
          <Text style={styles.statGridValue}>
            ₦{stats.totalGoalsAmount.toLocaleString('en-NG')}
          </Text>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    paddingHorizontal: 12,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  goalsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  goalCard: {
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  goalTarget: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  goalProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalCurrent: {
    fontSize: 12,
    color: '#666',
  },
  goalDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statsGridItem: {
    flex: 1,
    minWidth: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statGridLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
  },
  statGridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginTop: 4,
  },
});
