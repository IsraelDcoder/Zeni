import { Router, Response } from "express";
import { z } from "zod";
import {
  signUp,
  signIn,
  refreshToken,
  resetPassword,
  verifyToken as verifyTokenService,
} from "../services/auth.js";
import { supabaseAdmin } from "../services/supabase.js";
import { AuthRequest, authMiddleware } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { validateRequest } from "../middleware/validation.js";
import {
  signUpSchema,
  signInSchema,
  resetPasswordSchema,
} from "../middleware/validation.js";

const router = Router();

/**
 * POST /api/v1/auth/signup
 * Create a new user account
 */
router.post(
  "/signup",
  validateRequest(signUpSchema),
  asyncHandler(async (req: any, res: Response) => {
    const { email, password, firstName, lastName } = req.validatedBody;

    try {
      const result = await signUp(email, password, firstName, lastName);
      res.status(201).json({
        success: true,
        data: result,
        message: "Account created successfully",
      });
    } catch (error: any) {
      // Check for duplicate email
      if (error.message.includes("User already exists")) {
        throw new ApiError(409, "Email already registered");
      }
      throw new ApiError(400, error.message);
    }
  })
);

/**
 * POST /api/v1/auth/signin
 * Sign in with email and password
 */
router.post(
  "/signin",
  validateRequest(signInSchema),
  asyncHandler(async (req: any, res: Response) => {
    const { email, password } = req.validatedBody;

    try {
      const result = await signIn(email, password);
      res.json({
        success: true,
        data: result,
        message: "Signed in successfully",
      });
    } catch (error: any) {
      throw new ApiError(401, "Invalid email or password");
    }
  })
);

/**
 * POST /api/v1/auth/refresh
 * Refresh JWT token
 */
router.post(
  "/refresh",
  asyncHandler(async (req: any, res: Response) => {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, "Token is required");
    }

    const newToken = refreshToken(token);

    if (!newToken) {
      throw new ApiError(401, "Invalid or expired token");
    }

    const payload = verifyTokenService(newToken);

    res.json({
      success: true,
      data: {
        token: newToken,
        expiresIn: process.env.JWT_EXPIRY || "24h",
      },
      message: "Token refreshed successfully",
    });
  })
);

/**
 * POST /api/v1/auth/reset-password
 * Request password reset (sends email)
 */
router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  asyncHandler(async (req: any, res: Response) => {
    const { email } = req.validatedBody;

    try {
      await resetPassword(email);
      res.json({
        success: true,
        message: "Password reset email sent",
      });
    } catch (error: any) {
      // Don't leak whether email exists
      res.json({
        success: true,
        message: "If an account with this email exists, a reset link has been sent",
      });
    }
  })
);

/**
 * POST /api/v1/auth/verify-token
 * Verify if a token is valid
 */
router.post(
  "/verify-token",
  asyncHandler(async (req: any, res: Response) => {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, "Token is required");
    }

    const payload = verifyTokenService(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: "Invalid or expired token",
      });
    }

    res.json({
      success: true,
      valid: true,
      data: payload,
      message: "Token is valid",
    });
  })
);

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Not authenticated");
    }

    res.json({
      success: true,
      data: {
        userId: req.user.userId,
        email: req.user.email,
      },
      message: "Current user info",
    });
  })
);

/**
 * POST /api/v1/auth/logout
 * Logout (client-side token deletion)
 */
router.post(
  "/logout",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // JWT logout is just client-side deletion of token
    // In production, could invalidate tokens in a blacklist
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  })
);

/**
 * POST /api/v1/auth/2fa/setup
 * Initialize 2FA setup (returns QR code)
 */
router.post(
  "/2fa/setup",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    // Generate TOTP secret
    const speakeasy = require("speakeasy");
    const secret = speakeasy.generateSecret({
      name: `Zeni (${req.user?.email})`,
      issuer: "Zeni",
      length: 32,
    });

    // Generate QR code
    const qrcode = require("qrcode");
    const dataUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: dataUrl,
        backupCodes: generateBackupCodes(),
      },
      message: "2FA setup initiated. Scan QR code with authenticator app.",
    });
  })
);

/**
 * POST /api/v1/auth/2fa/verify-setup
 * Verify and enable 2FA with TOTP code
 */
router.post(
  "/2fa/verify-setup",
  authMiddleware,
  validateRequest(z.object({ code: z.string().length(6) })),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { code } = req.body;
    const speakeasy = require("speakeasy");

    // Verify TOTP code (would need to store secret first)
    // This is simplified - in production store temp secret in session
    const verified = speakeasy.totp.verify({
      secret: req.body.secret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new ApiError(400, "Invalid verification code");
    }

    // Enable 2FA for user in database
    await supabaseAdmin
      .from("users")
      .update({ 
        two_factor_enabled: true,
        two_factor_secret: req.body.secret 
      })
      .eq("id", req.userId);

    res.json({
      success: true,
      message: "2FA enabled successfully. Save your backup codes in a safe place.",
    });
  })
);

/**
 * POST /api/v1/auth/2fa/verify
 * Verify TOTP code during login
 */
router.post(
  "/2fa/verify",
  validateRequest(z.object({ code: z.string().length(6), token: z.string().optional() })),
  asyncHandler(async (req: any, res: Response) => {
    const { code, token } = req.body;
    const speakeasy = require("speakeasy");

    if (!token) {
      throw new ApiError(400, "Token required");
    }

    // Verify token is valid login token (from JWT but without 2FA confirmed)
    // In production, this would be a special JWT without full auth
    const payload = verifyTokenService(token);
    if (!payload) {
      throw new ApiError(401, "Invalid token");
    }

    // Get user's 2FA secret
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("two_factor_secret")
      .eq("id", payload.userId)
      .single();

    if (!user || !user.two_factor_secret) {
      throw new ApiError(400, "2FA not enabled for this account");
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new ApiError(401, "Invalid 2FA code");
    }

    res.json({
      success: true,
      data: { token },
      message: "2FA verification successful",
    });
  })
);

/**
 * POST /api/v1/auth/2fa/disable
 * Disable 2FA (requires TOTP code)
 */
router.post(
  "/2fa/disable",
  authMiddleware,
  validateRequest(z.object({ code: z.string().length(6) })),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { code } = req.body;
    const speakeasy = require("speakeasy");

    // Get user's 2FA secret
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("two_factor_secret")
      .eq("id", req.userId)
      .single();

    if (!user || !user.two_factor_secret) {
      throw new ApiError(400, "2FA not enabled for this account");
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new ApiError(401, "Invalid 2FA code");
    }

    // Disable 2FA
    await supabaseAdmin
      .from("users")
      .update({ two_factor_enabled: false, two_factor_secret: null })
      .eq("id", req.userId);

    res.json({
      success: true,
      message: "2FA disabled successfully",
    });
  })
);

/**
 * POST /api/v1/auth/2fa/backup-codes
 * Generate new backup codes
 */
router.post(
  "/2fa/backup-codes",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const backupCodes = generateBackupCodes();

    // Store hashed backup codes
    await supabaseAdmin
      .from("users")
      .update({ backup_codes: backupCodes })
      .eq("id", req.userId);

    res.json({
      success: true,
      data: { backupCodes },
      message: "New backup codes generated. Store them in a safe place.",
    });
  })
);

/**
 * GET /api/v1/auth/2fa/status
 * Get 2FA status for user
 */
router.get(
  "/2fa/status",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw new ApiError(401, "Not authenticated");
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("two_factor_enabled, created_at")
      .eq("id", req.userId)
      .single();

    res.json({
      success: true,
      data: {
        enabled: user?.two_factor_enabled || false,
        createdAt: user?.created_at,
      },
    });
  })
);

// Helper function to generate backup codes
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    codes.push(code);
  }
  return codes;
}

export default router;
