import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { errorHandler } from "./middleware/errorHandler.js";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import transactionRoutes from "./routes/transactions.js";
import budgetRoutes from "./routes/budgets.js";
import savingsGoalRoutes from "./routes/savings-goals.js";
import savingsRoutes from "./routes/savings.js";
import insightRoutes from "./routes/insights.js";
import banksRoutes from "./routes/banks.js";
import walletRoutes from "./routes/wallet.js";

const app: Express = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow all origins in development
    if (process.env.API_ENV === 'development') {
      callback(null, true);
    } else {
      // In production, use the whitelist from CORS_ORIGIN
      const whitelist = (process.env.CORS_ORIGIN || "http://localhost:8081").split(",").map(o => o.trim());
      if (whitelist.indexOf(origin || "") !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", authMiddleware, userRoutes);
app.use("/api/v1/transactions", authMiddleware, transactionRoutes);
app.use("/api/v1/budgets", authMiddleware, budgetRoutes);
app.use("/api/v1/savings-goals", authMiddleware, savingsGoalRoutes);
app.use("/api/v1/savings", authMiddleware, savingsRoutes);
app.use("/api/v1/insights", authMiddleware, insightRoutes);
app.use("/api/v1/wallet", authMiddleware, walletRoutes);
app.use("/api/v1/banks", authMiddleware, banksRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Zeni API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.API_ENV || "development"}`);
  console.log(`🔐 CORS enabled for: ${process.env.CORS_ORIGIN}`);
});

export default app;
