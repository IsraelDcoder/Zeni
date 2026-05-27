/**
 * Manual Savings Deposit Flow
 * 
 * STEP 9-12: User initiates manual savings
 * 1. Enter amount
 * 2. Select saving goal (optional)
 * 3. Process payment via Paystack
 * 4. Money moves to wallet
 * 5. Show success
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from './GlassCard';
import { useColors } from '@/hooks/useColors';
import { zeniApi } from '@/lib/api-client';

interface ManualSavingsSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  savingsGoals?: Array<{
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
  }>;
}

export function ManualSavingsSheet({
  isVisible,
  onClose,
  onSuccess,
  savingsGoals = [],
}: ManualSavingsSheetProps) {
  const { colors } = useColors();
  const [step, setStep] = useState<'amount' | 'goal' | 'confirm' | 'processing' | 'success'>('amount');
  const [amount, setAmount] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setAmount('');
    setSelectedGoal(null);
    setDescription('');
    setStep('amount');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  /**
   * STEP 9: User enters amount
   */
  const handleAmountSubmit = () => {
    const parsedAmount = parseFloat(amount);

    if (!amount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than ₦0');
      return;
    }

    if (parsedAmount < 1000) {
      Alert.alert('Minimum Amount', 'Minimum deposit is ₦1,000');
      return;
    }

    setStep('goal');
  };

  /**
   * STEP 10: User selects goal (optional)
   */
  const handleGoalSelect = () => {
    setStep('confirm');
  };

  /**
   * STEP 11: Confirm and initiate payment
   */
  const handleInitiatePayment = async () => {
    if (!amount) return;

    setLoading(true);
    setStep('processing');

    try {
      // Call backend to initialize Paystack payment
      // Returns authorization URL
      const paymentData = await zeniApi.initiateManualDeposit(
        parseFloat(amount),
        selectedGoal || undefined,
        description || undefined
      );

      if (paymentData.authorizationUrl) {
        // Open payment URL
        const canOpen = await Linking.canOpenURL(paymentData.authorizationUrl);
        if (canOpen) {
          await Linking.openURL(paymentData.authorizationUrl);
          // Store reference for later verification
          // In real app, you'd handle the callback properly
          setTimeout(() => {
            handlePaymentSuccess(paymentData.reference);
          }, 3000);
        } else {
          throw new Error('Cannot open payment URL');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'Could not process payment'
      );
      setStep('confirm');
      setLoading(false);
    }
  };

  /**
   * STEP 12: Payment success - verify and deposit to wallet
   */
  const handlePaymentSuccess = async (reference: string) => {
    try {
      // Verify payment with backend
      const result = await zeniApi.verifyManualDeposit(reference);

      setStep('success');
      setLoading(false);

      // Call success callback after brief delay
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Verification Failed', 'Please contact support');
      setStep('confirm');
      setLoading(false);
    }
  };

  /**
   * Step 1: Amount Entry
   */
  const renderAmountStep = () => (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>How much do you want to save?</Text>
      <Text style={styles.stepSubtitle}>You can save any amount above ₦1,000</Text>

      <View style={styles.amountInput}>
        <Text style={styles.currencySymbol}>₦</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#ccc"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          editable={!loading}
        />
      </View>

      {/* Quick amounts */}
      <View style={styles.quickAmounts}>
        {[5000, 10000, 25000, 50000].map((quickAmount) => (
          <TouchableOpacity
            key={quickAmount}
            style={[
              styles.quickButton,
              amount === String(quickAmount) && { backgroundColor: colors.accent },
            ]}
            onPress={() => setAmount(String(quickAmount))}
          >
            <Text
              style={[
                styles.quickButtonText,
                amount === String(quickAmount) && { color: '#fff' },
              ]}
            >
              ₦{(quickAmount / 1000).toFixed(0)}k
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={handleAmountSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Next</Text>
        <Feather name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  /**
   * Step 2: Goal Selection
   */
  const renderGoalStep = () => (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Save for a goal? (Optional)</Text>
      <Text style={styles.stepSubtitle}>Link this savings to a goal to track progress</Text>

      <ScrollView style={styles.goalsList} showsVerticalScrollIndicator={false}>
        {savingsGoals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.goalOption,
              selectedGoal === goal.id && { borderColor: colors.accent, borderWidth: 2 },
            ]}
            onPress={() => setSelectedGoal(goal.id)}
          >
            <View style={styles.goalOptionContent}>
              <View>
                <Text style={styles.goalOptionName}>{goal.name}</Text>
                <Text style={styles.goalOptionTarget}>
                  Target: ₦{goal.target_amount.toLocaleString('en-NG')}
                </Text>
                <View style={styles.goalProgressBar}>
                  <View
                    style={{
                      width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%`,
                      height: '100%',
                      backgroundColor: colors.accent,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
              <View
                style={[
                  styles.radioButton,
                  selectedGoal === goal.id && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
              >
                {selectedGoal === goal.id && (
                  <Feather name="check" size={14} color="#fff" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* No goal option */}
        <TouchableOpacity
          style={[
            styles.goalOption,
            selectedGoal === null && { borderColor: colors.accent, borderWidth: 2 },
          ]}
          onPress={() => setSelectedGoal(null)}
        >
          <View style={styles.goalOptionContent}>
            <Text style={styles.goalOptionName}>💰 Just save (no specific goal)</Text>
            <View
              style={[
                styles.radioButton,
                selectedGoal === null && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
            >
              {selectedGoal === null && (
                <Feather name="check" size={14} color="#fff" />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.stepActions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => setStep('amount')}
        >
          <Feather name="arrow-left" size={18} color={colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, flex: 1 }]}
          onPress={handleGoalSelect}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Step 3: Confirmation
   */
  const renderConfirmStep = () => (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Confirm Savings</Text>

      <GlassCard style={styles.confirmCard}>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Amount</Text>
          <Text style={styles.confirmValue}>₦{parseFloat(amount).toLocaleString('en-NG')}</Text>
        </View>

        {selectedGoal && savingsGoals.find((g) => g.id === selectedGoal) && (
          <View style={[styles.confirmRow, { borderTopWidth: 1, borderTopColor: '#eee' }]}>
            <Text style={styles.confirmLabel}>Saving to Goal</Text>
            <Text style={styles.confirmValue}>
              {savingsGoals.find((g) => g.id === selectedGoal)?.name}
            </Text>
          </View>
        )}

        <View style={[styles.confirmRow, { borderTopWidth: 1, borderTopColor: '#eee' }]}>
          <Text style={styles.confirmLabel}>Processing via</Text>
          <View style={styles.processorBadge}>
            <Feather name="credit-card" size={14} color={colors.accent} />
            <Text style={styles.processorText}>Paystack</Text>
          </View>
        </View>
      </GlassCard>

      <View style={styles.securityInfo}>
        <Feather name="lock" size={16} color="#4CAF50" />
        <Text style={styles.securityText}>
          Your payment is secure and encrypted
        </Text>
      </View>

      <View style={styles.stepActions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => setStep('goal')}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, flex: 1 }]}
          onPress={handleInitiatePayment}
          disabled={loading}
        >
          {loading && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />}
          <Text style={styles.buttonText}>Pay & Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Processing state
   */
  const renderProcessingStep = () => (
    <View style={styles.step}>
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: 16 }} />
        <Text style={styles.stepTitle}>Processing Payment</Text>
        <Text style={styles.stepSubtitle}>Please wait while we process your savings...</Text>
      </View>
    </View>
  );

  /**
   * Success state
   */
  const renderSuccessStep = () => (
    <View style={styles.step}>
      <LinearGradient
        colors={['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0)']}
        style={styles.successGradient}
      >
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <Feather name="check" size={40} color="#4CAF50" />
          </View>
          <Text style={styles.stepTitle}>✅ Savings Successful!</Text>
          <Text style={styles.stepSubtitle}>
            ₦{parseFloat(amount).toLocaleString('en-NG')} has been added to your wallet
          </Text>

          {selectedGoal && savingsGoals.find((g) => g.id === selectedGoal) && (
            <View style={[styles.confirmCard, { marginTop: 16 }]}>
              <Text style={styles.goalUpdateText}>
                Goal "{savingsGoals.find((g) => g.id === selectedGoal)?.name}" updated ✓
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Save Money</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {step === 'amount' && renderAmountStep()}
            {step === 'goal' && renderGoalStep()}
            {step === 'confirm' && renderConfirmStep()}
            {step === 'processing' && renderProcessingStep()}
            {step === 'success' && renderSuccessStep()}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  step: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    lineHeight: 18,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  successGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 56,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  goalsList: {
    maxHeight: 250,
    marginBottom: 24,
  },
  goalOption: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalOptionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  goalOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  goalOptionTarget: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  goalProgressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 6,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCard: {
    marginBottom: 20,
    padding: 16,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  confirmLabel: {
    fontSize: 13,
    color: '#666',
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  processorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  processorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 24,
  },
  securityText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  goalUpdateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  stepActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
