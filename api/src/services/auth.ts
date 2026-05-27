import jwt from "jsonwebtoken";
import { supabaseAdmin } from "./supabase.js";
import { User, AuthResponse } from "../types/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Create a JWT token for a user
 */
export const createToken = (userId: string, email: string): string => {
  return jwt.sign(
    {
      userId,
      email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRY,
      algorithm: "HS256",
    }
  );
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Refresh a JWT token
 */
export const refreshToken = (token: string): string | null => {
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }
  return createToken(payload.userId, payload.email);
};

/**
 * Sign up a new user
 */
export const signUp = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<AuthResponse> => {
  // Create auth user in Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // Require email confirmation in production
  });

  if (authError || !authData.user) {
    throw new Error(`Signup failed: ${authError?.message || "Unknown error"}`);
  }

  // Create user profile
  const { data: userData, error: userError } = await supabaseAdmin
    .from("users")
    .insert({
      id: authData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      encrypted_password: "", // Handled by Supabase Auth
    })
    .select()
    .single();

  if (userError || !userData) {
    // Clean up auth user if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create user profile: ${userError?.message}`);
  }

  // Create JWT token
  const token = createToken(authData.user.id, email);

  return {
    token,
    user: {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      monthlyIncome: userData.monthly_income,
      monthlyExpenseTarget: userData.monthly_expense_target,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
    } as User,
  };
};

/**
 * Sign in an existing user
 */
export const signIn = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  // Authenticate with Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.signInWithPassword(
    email,
    password
  );

  if (authError || !authData.user || !authData.session) {
    throw new Error(`Signin failed: ${authError?.message || "Invalid credentials"}`);
  }

  // Get user profile
  const { data: userData, error: userError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (userError || !userData) {
    throw new Error(`User profile not found`);
  }

  // Create JWT token
  const token = createToken(authData.user.id, email);

  return {
    token,
    user: {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      monthlyIncome: userData.monthly_income,
      monthlyExpenseTarget: userData.monthly_expense_target,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
    } as User,
  };
};

/**
 * Reset password by sending reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  const { error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${process.env.APP_URL || "http://localhost:3000"}/reset-password`,
    },
  });

  if (error) {
    throw new Error(`Failed to send reset email: ${error.message}`);
  }
};

/**
 * Confirm password reset with token
 */
export const confirmPasswordReset = async (
  token: string,
  newPassword: string
): Promise<void> => {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(token, {
    password: newPassword,
  });

  if (error) {
    throw new Error(`Failed to reset password: ${error.message}`);
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    monthlyIncome: data.monthly_income,
    monthlyExpenseTarget: data.monthly_expense_target,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

/**
 * Verify user email
 */
export const verifyEmail = async (token: string): Promise<void> => {
  const { error } = await supabaseAdmin.auth.verifyOtp({
    token_hash: token,
    type: "email",
  });

  if (error) {
    throw new Error(`Email verification failed: ${error.message}`);
  }
};
