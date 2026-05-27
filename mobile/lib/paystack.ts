/**
 * Paystack Open Banking Integration
 * Handles OAuth flow for connecting bank accounts via Paystack
 */

import { zeniApi } from './api-client';

export interface PaystackAuth {
  authUrl: string;
  state: string;
  timestamp: string;
}

export interface LinkedBank {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  connectedAt: string;
  lastSyncAt: string;
  isActive: boolean;
}

export interface SyncResult {
  banksLinked: number;
  transactionsSynced: number;
  lastSync: string;
  nextSyncScheduled: string;
}

class PaystackService {
  /**
   * Get the Paystack OAuth authorization URL
   * User will be redirected to this URL to authorize bank access
   */
  async getAuthorizationUrl(): Promise<PaystackAuth> {
    try {
      const data = await zeniApi.getPaystackAuthUrl();
      return {
        authUrl: data.authUrl,
        state: data.state,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get Paystack auth URL:', error);
      throw new Error('Unable to initiate bank connection. Please try again.');
    }
  }

  /**
   * Handle Paystack OAuth callback after user authorizes
   * Exchange authorization code for connected bank accounts
   */
  async handleOAuthCallback(code: string): Promise<SyncResult> {
    try {
      const result = await zeniApi.handlePaystackCallback(code);
      return {
        banksLinked: result.banksLinked || 0,
        transactionsSynced: result.transactionsSynced || 0,
        lastSync: result.lastSync || new Date().toISOString(),
        nextSyncScheduled: result.nextSyncScheduled || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      console.error('Failed to handle Paystack callback:', error);
      throw new Error('Failed to connect your bank account. Please try again.');
    }
  }

  /**
   * Get list of connected bank accounts
   */
  async getConnectedBanks(): Promise<LinkedBank[]> {
    try {
      const banks = await zeniApi.getConnectedBanks();
      return Array.isArray(banks) ? banks : [];
    } catch (error) {
      console.error('Failed to fetch connected banks:', error);
      return [];
    }
  }

  /**
   * Manually trigger a sync of transactions from connected banks
   */
  async syncTransactions(): Promise<SyncResult> {
    try {
      const result = await zeniApi.syncBankTransactions();
      return {
        banksLinked: result.banksLinked || 0,
        transactionsSynced: result.transactionsSynced || 0,
        lastSync: result.lastSync || new Date().toISOString(),
        nextSyncScheduled: result.nextSyncScheduled || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      console.error('Failed to sync transactions:', error);
      throw new Error('Unable to sync transactions. Please try again.');
    }
  }

  /**
   * Check if bank is currently syncing
   */
  isSyncing(bank: LinkedBank): boolean {
    if (!bank.lastSyncAt) return false;
    const lastSync = new Date(bank.lastSyncAt);
    const now = new Date();
    // Consider it syncing if last sync was less than 5 minutes ago
    return (now.getTime() - lastSync.getTime()) < 5 * 60 * 1000;
  }

  /**
   * Format bank connection status for UI
   */
  getBankConnectionStatus(bank: LinkedBank): string {
    if (!bank.isActive) {
      return 'Disconnected';
    }

    if (this.isSyncing(bank)) {
      return 'Syncing...';
    }

    const lastSync = new Date(bank.lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}

export const paystackService = new PaystackService();
