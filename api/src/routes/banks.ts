/**
 * Banks Routes - Open Banking Integration
 * 
 * This module handles Mono/Okra integration for:
 * - Bank connection authorization
 * - Account balance fetching
 * - Transaction syncing
 * - Transaction categorization
 * 
 * Architecture:
 * User → Mono/Okra SDK → Bank → Mono/Okra → Zeni Backend → Database
 */

import { Router, Response } from "express";
import { z } from "zod";
import { AuthRequest, authMiddleware } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { validateRequest } from "../middleware/validation.js";
import { bankingService } from "../services/banking.js";
import { paystackService } from "../services/paystack.js";

const router = Router();

// ─── Validation Schemas ────────────────────────────────────────────────

const handleCallbackSchema = z.object({
  code: z.string(),
  provider: z.enum(["mono", "okra"]),
});

// ─── STEP 1: Get SDK Authorization URL ─────────────────────────────────

/**
 * GET /api/v1/banks/authorize-url?provider=mono
 * Returns the URL to open Mono/Okra SDK in mobile app
 * 
 * Mobile flow:
 * 1. Call this endpoint
 * 2. Get URL
 * 3. Open URL in WebBrowser
 * 4. User logs into bank
 * 5. SDK redirects to callback URL with authorization code
 */
router.get(
  "/authorize-url",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { provider = "mono" } = req.query;

    if (!["mono", "okra"].includes(provider as string)) {
      throw new ApiError(400, "Provider must be 'mono' or 'okra'");
    }

    const authUrl = await bankingService.getAuthorizationUrl(
      provider as "mono" | "okra"
    );

    res.json({
      success: true,
      data: {
        authUrl,
        provider,
        message: "Open this URL to authorize bank connection",
      },
    });
  })
);

// ─── STEP 5: Handle OAuth Callback ─────────────────────────────────────

/**
 * POST /api/v1/banks/callback
 * 
 * Receives authorization code from Mono/Okra after user grants permission
 * Exchanges code for access token
 * Stores bank connection in database
 * 
 * Request body:
 * {
 *   "code": "authorization_code_from_sdk",
 *   "provider": "mono" or "okra"
 * }
 */
router.post(
  "/callback",
  authMiddleware,
  validateRequest(handleCallbackSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { code, provider } = req.body;

    // Exchange code for access token and get account details
    const connectedBank = await bankingService.handleOAuthCallback(
      req.userId,
      code,
      provider
    );

    // Sync initial transactions
    const syncResult = await bankingService.syncTransactions(connectedBank.id);

    res.json({
      success: true,
      data: {
        bank: connectedBank,
        initialSync: syncResult,
      },
      message: "Bank connected successfully and transactions synced",
    });
  })
);

// ─── Get User's Connected Banks ────────────────────────────────────────

/**
 * GET /api/v1/banks/connected
 * Get list of banks user has connected
 */
router.get(
  "/connected",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const banks = await bankingService.getUserBanks(req.userId);

    res.json({
      success: true,
      data: banks,
      count: banks.length,
    });
  })
);

// ─── STEP 6: Get Account Balance ────────────────────────────────────────

/**
 * GET /api/v1/banks/:bankId/balance
 * Fetch current account balance from connected bank
 */
router.get(
  "/:bankId/balance",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bankId } = req.params;

    const balance = await bankingService.getConnectedBankBalance(bankId);

    res.json({
      success: true,
      data: balance,
      timestamp: new Date().toISOString(),
    });
  })
);

// ─── STEP 7: Get Transactions ──────────────────────────────────────────

/**
 * GET /api/v1/banks/:bankId/transactions?limit=50
 * Fetch transaction history from connected bank
 * 
 * Note: These are NOT synced to database yet
 * Use /sync endpoint to store them
 */
router.get(
  "/:bankId/transactions",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bankId } = req.params;
    const { limit = 50 } = req.query;

    // Get bank details
    const bank = await bankingService.getConnectedBank(bankId);

    // Fetch from Open Banking provider
    const transactions = await bankingService.getTransactions(
      bank.accessToken,
      bank.provider,
      Number(limit)
    );

    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  })
);

// ─── Sync Transactions to Database ─────────────────────────────────────

/**
 * POST /api/v1/banks/:bankId/sync
 * Sync latest transactions from bank to Zeni database
 * 
 * This stores bank transactions as regular transactions
 * in the transactions table with bank_id reference
 */
router.post(
  "/:bankId/sync",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bankId } = req.params;

    const syncResult = await bankingService.syncTransactions(bankId);

    res.json({
      success: true,
      data: syncResult,
      message: `${syncResult.transactionsFetched} transactions fetched, ${syncResult.newTransactions.length} new transactions added`,
    });
  })
);

// ─── Disconnect Bank ───────────────────────────────────────────────────

/**
 * DELETE /api/v1/banks/:bankId
 * Disconnect a bank and revoke access
 * 
 * NOTE: In production, also revoke token with Mono/Okra
 */
router.delete(
  "/:bankId",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bankId } = req.params;

    await bankingService.disconnectBank(bankId);

    res.json({
      success: true,
      message: "Bank disconnected successfully",
    });
  })
);

// ─── Legacy Paystack Endpoints (for Payments) ──────────────────────────

/**
 * GET /api/v1/banks/list
 * Get list of Nigerian banks for Paystack integration
 * (For future payment flows, not for account connections)
 */
router.get(
  "/list",
  asyncHandler(async (req, res) => {
    const banks = await paystackService.getBanks();
    res.json({
      success: true,
      data: banks,
    });
  })
);

/**
 * POST /api/v1/banks/resolve
 * Resolve bank account details via Paystack
 * (For future payment flows, not for account connections)
 */
router.post(
  "/resolve",
  asyncHandler(async (req, res) => {
    const { account_number, bank_code } = req.body;

    const account = await paystackService.resolveAccount(
      account_number,
      bank_code
    );

    res.json({
      success: true,
      data: account,
    });
  })
);

export default router;
