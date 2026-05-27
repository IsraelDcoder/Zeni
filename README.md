# Zeni - AI Financial Operating System

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/Node.js-18+-brightgreen)
![React Native](https://img.shields.io/badge/React%20Native-Expo-blue)

**Intelligent financial management powered by AI**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Development](#-development)

</div>

---

## 📱 Overview

Zeni is a comprehensive AI-powered financial operating system that helps users manage their finances intelligently. With seamless bank integration, intelligent budgeting, automated insights, and an AI financial coach, Zeni transforms how people understand and control their money.

### Why Zeni?

- **AI-Driven Insights** - Claude-powered financial recommendations tailored to your spending patterns
- **Open Banking Integration** - Securely connect multiple bank accounts for real-time transaction syncing
- **Intelligent Budgeting** - Automatic categorization and smart budget suggestions
- **Savings Goals** - Track progress toward financial milestones with AI coaching
- **Cross-Platform** - Native mobile app + cloud-based backend
- **Enterprise Security** - Bank-grade encryption and compliance-first architecture

---

## ✨ Features

### Core Capabilities
- 🏦 **Bank Integration** - Connect to major banks via open banking APIs (Paystack, etc.)
- 💳 **Transaction Management** - Auto-categorized transactions with smart insights
- 💰 **Wallet System** - Multi-currency wallet support and balance tracking
- 📊 **Analytics Dashboard** - Visual spending patterns, trends, and financial health scores
- 🎯 **Savings Goals** - Create and track progress toward financial objectives
- 💡 **AI Coach** - Claude-powered financial advisor providing personalized recommendations
- 🔐 **Security First** - JWT authentication, 2FA support, encrypted sensitive data
- 📱 **Mobile-First** - Beautiful React Native app with offline support
- 🚀 **Real-time Sync** - Live transaction updates and account status

### Advanced Features
- Automatic transaction categorization
- Budget forecasting and alerts
- Financial health scoring
- AI-generated insights from spending patterns
- Multi-account portfolio view
- Savings goal recommendations

---

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Cache**: Redis + BullMQ
- **AI**: Claude API (Anthropic)
- **Authentication**: JWT + OAuth 2.0
- **API Security**: Helmet, CORS, Rate Limiting

### Mobile
- **Framework**: React Native (Expo)
- **Routing**: Expo Router
- **State Management**: React Context + TanStack Query
- **Storage**: AsyncStorage + Secure Storage
- **Build**: TypeScript + Babel
- **UI Components**: Custom + Expo components

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Payment Processing**: Paystack
- **Open Banking**: Plaid/Open Banking APIs

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0+
- npm or yarn
- PostgreSQL (Supabase account)
- Redis (optional for local development)

### Backend Setup

```bash
cd api

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure your environment
# Edit .env with:
# - DATABASE_URL (Supabase)
# - REDIS_URL (if using Redis)
# - JWT_SECRET
# - ANTHROPIC_API_KEY
# - PAYSTACK_SECRET_KEY
# etc.

# Run migrations
npm run migrations

# Start development server
npm run dev
```

**Available Scripts:**
```bash
npm run dev          # Start with hot reload (tsx watch)
npm run build        # Compile TypeScript
npm start            # Run production build
npm run typecheck    # Type checking only
npm run lint         # Run ESLint
npm run migrations   # Run database migrations
```

### Mobile Setup

```bash
cd mobile

# Install dependencies
npm install

# Start development server
npm run dev

# Follow the Expo CLI prompts to open on iOS/Android/Web
```

**Available Scripts:**
```bash
npm run dev         # Start Expo development server
npm run build       # Production build
npm run serve       # Serve static build
npm run typecheck   # Type checking
```

### Docker Setup

**Local Development:**
```bash
cd api
docker-compose up
```

**Production Build:**
```bash
docker build -t zeni-api .
docker run -p 3000:3000 --env-file .env zeni-api
```

---

## 📂 Project Structure

```
Zeni/
├── api/                          # Backend Express.js API
│   ├── src/
│   │   ├── server.ts            # Entry point
│   │   ├── middleware/          # Express middleware
│   │   │   ├── auth.ts          # JWT authentication
│   │   │   ├── errorHandler.ts  # Global error handling
│   │   │   └── validation.ts    # Request validation (Zod)
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.ts
│   │   │   ├── banks.ts
│   │   │   ├── budgets.ts
│   │   │   ├── transactions.ts
│   │   │   ├── users.ts
│   │   │   ├── wallet.ts
│   │   │   ├── savings.ts
│   │   │   ├── savings-goals.ts
│   │   │   ├── insights.ts
│   │   │   └── banks.ts
│   │   ├── services/            # Business logic
│   │   │   ├── auth.ts          # Authentication logic
│   │   │   ├── banking.ts       # Bank operations
│   │   │   ├── wallet-service.ts
│   │   │   ├── savings.ts
│   │   │   ├── categorization-service.ts
│   │   │   ├── claude.ts        # AI insights
│   │   │   ├── paystack.ts      # Payment processing
│   │   │   ├── open-banking.ts  # Bank integration
│   │   │   └── supabase.ts      # Database client
│   │   └── types/               # TypeScript definitions
│   ├── migrations/              # Database migrations
│   │   ├── 001_create_initial_schema.sql
│   │   ├── 002_create_wallet_and_savings_tables.sql
│   │   ├── 003_create_connected_banks_table.sql
│   │   └── 004_create_wallet_system.sql
│   ├── scripts/
│   │   └── run-migrations.ts
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/                       # React Native Expo App
│   ├── app/                     # Expo Router pages
│   │   ├── _layout.tsx          # Root layout
│   │   ├── index.tsx            # Home
│   │   ├── auth.tsx             # Auth screen
│   │   ├── onboarding.tsx       # Onboarding flow
│   │   ├── bank-connect.tsx     # Bank linking
│   │   └── (tabs)/              # Tab navigation
│   │       ├── analytics.tsx
│   │       ├── coach.tsx
│   │       ├── profile.tsx
│   │       ├── savings.tsx
│   │       └── index.tsx        # Dashboard
│   ├── components/              # Reusable UI components
│   │   ├── WalletBalanceCard.tsx
│   │   ├── TransactionCard.tsx
│   │   ├── SavingsGoalCard.tsx
│   │   ├── BudgetRing.tsx
│   │   ├── SpendingDonut.tsx
│   │   ├── FinancialScoreRing.tsx
│   │   ├── AIInsightCard.tsx
│   │   ├── MascotWidget.tsx
│   │   └── [more components]
│   ├── lib/                     # Utilities
│   │   ├── api-client.ts        # API communication
│   │   ├── categorization.ts
│   │   ├── insights.ts
│   │   ├── claude-insights.ts
│   │   ├── paystack.ts
│   │   └── supabase.ts
│   ├── context/                 # React Context
│   │   ├── AppContext.tsx
│   │   └── AuthContext.tsx
│   ├── hooks/                   # Custom React hooks
│   │   ├── useSavings.ts
│   │   └── useColors.ts
│   ├── constants/
│   │   └── colors.ts
│   ├── server/                  # Landing page server
│   │   ├── serve.js
│   │   └── templates/
│   └── package.json
│
├── SECURITY_ARCHITECTURE.md      # Security specifications
├── QUICK_REFERENCE.sh           # Development quick reference
└── README.md                     # This file
```

---

## 📡 API Endpoints

### Authentication
```
POST   /api/v1/auth/signup              # Create account
POST   /api/v1/auth/signin              # Login
POST   /api/v1/auth/refresh             # Refresh access token
POST   /api/v1/auth/reset-password      # Reset password
```

### User Management
```
GET    /api/v1/users/profile            # Get user profile
PUT    /api/v1/users/profile            # Update profile
GET    /api/v1/users/settings           # Get settings
PUT    /api/v1/users/settings           # Update settings
```

### Transactions
```
GET    /api/v1/transactions             # List transactions
POST   /api/v1/transactions             # Create transaction
GET    /api/v1/transactions/:id         # Get transaction
PUT    /api/v1/transactions/:id         # Update transaction
DELETE /api/v1/transactions/:id         # Delete transaction
POST   /api/v1/transactions/sync        # Sync from bank
```

### Budgets
```
GET    /api/v1/budgets                  # List budgets
POST   /api/v1/budgets                  # Create budget
PUT    /api/v1/budgets/:id              # Update budget
DELETE /api/v1/budgets/:id              # Delete budget
```

### Savings Goals
```
GET    /api/v1/savings-goals            # List goals
POST   /api/v1/savings-goals            # Create goal
PUT    /api/v1/savings-goals/:id        # Update goal
DELETE /api/v1/savings-goals/:id        # Delete goal
```

### Banking
```
POST   /api/v1/banks/link               # Link bank account
GET    /api/v1/banks/connected          # List connected banks
POST   /api/v1/banks/sync               # Manual sync transactions
```

### AI Insights
```
GET    /api/v1/insights                 # Get insights
POST   /api/v1/insights/generate        # Generate new insights
```

### Wallet
```
GET    /api/v1/wallet/balance           # Get wallet balance
POST   /api/v1/wallet/transfer          # Transfer funds
GET    /api/v1/wallet/history           # Transaction history
```

---

## 🔐 Security

This is **financial software**. Security is not optional.

### Key Security Features
- ✅ JWT-based authentication with short-lived access tokens
- ✅ Refresh token rotation
- ✅ 2FA support (TOTP via Speakeasy)
- ✅ Rate limiting on all endpoints
- ✅ CORS protection with Helmet
- ✅ Input validation with Zod
- ✅ Password hashing (bcrypt)
- ✅ Secure session management
- ✅ SQL injection prevention (parameterized queries)
- ✅ HTTPS enforced in production

### Environment Security
- Never commit `.env` files
- Use Supabase's secure key management
- Rotate secrets regularly
- Review `SECURITY_ARCHITECTURE.md` for detailed requirements

**⚠️ IMPORTANT**: Before deploying to production, review [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) thoroughly.

---

## 🔄 Development Workflow

### Getting Started
1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Set up your environment (see Quick Start above)
5. Make your changes
6. Test thoroughly
7. Submit a pull request

### Code Standards
- **Language**: TypeScript (strict mode)
- **Linting**: ESLint + @typescript-eslint
- **Formatting**: Follow existing code style
- **Tests**: Include tests for new features
- **Commits**: Use clear, descriptive commit messages

### Running Tests
```bash
# API tests
cd api
npm test

# Mobile tests
cd mobile
npm test
```

### Type Safety
```bash
# Type check without building
npm run typecheck

# Full build
npm run build
```

---

## 📝 Database

### Migrations
Database migrations are version-controlled SQL files:

```bash
npm run migrations
```

Key tables:
- `users` - User accounts and profiles
- `transactions` - Financial transactions
- `budgets` - User budget configurations
- `savings_goals` - Savings targets
- `wallet` - Wallet balances and history
- `connected_banks` - Linked bank accounts
- `insights` - Generated AI insights

### Schema
See migration files in `api/migrations/` for complete schema documentation.

---

## 🚢 Deployment

### Backend Deployment
1. Build Docker image
2. Push to container registry
3. Deploy to your infrastructure (AWS, Azure, GCP, etc.)
4. Configure environment variables
5. Run migrations
6. Start container

### Mobile Deployment
- **iOS**: Submit to App Store via Expo
- **Android**: Submit to Google Play via Expo
- **Web**: Deploy to static hosting

See `api/SETUP.md` for detailed deployment instructions.

---

## 📊 Performance & Scalability

- Redis caching for frequently accessed data
- BullMQ for background jobs
- Connection pooling to database
- Pagination on all list endpoints
- Compression middleware enabled
- CDN-ready static assets

---

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Change port in .env
PORT=3001
```

**Database connection failed:**
```bash
# Verify DATABASE_URL in .env
# Check Supabase dashboard for credentials
```

**Mobile app won't connect to API:**
```bash
# Ensure API_URL in mobile/lib/api-client.ts points to your backend
# Check CORS settings in api/src/middleware/validation.ts
```

For more issues, see troubleshooting guides in respective README files:
- [api/README.md](./api/README.md)
- [mobile/README.md](./mobile/README.md) (if exists)

---

## 📚 Documentation

- [Security Architecture](./SECURITY_ARCHITECTURE.md) - Security specifications & compliance
- [API Setup](./api/SETUP.md) - Detailed backend setup
- [API README](./api/README.md) - API documentation
- [Quick Reference](./QUICK_REFERENCE.sh) - Dev commands cheatsheet

---

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork & Clone** - Start from your fork
2. **Create Branch** - `feature/your-feature` or `fix/your-fix`
3. **Code** - Follow TypeScript & code standards
4. **Test** - Verify functionality works
5. **Commit** - Clear, descriptive messages
6. **Push** - To your fork
7. **PR** - Open against `main` branch

### Before Submitting PR
- [ ] Code builds without errors
- [ ] No security vulnerabilities introduced
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Follows code style

---

## 📄 License

MIT License - see LICENSE file for details

---

## 👥 Support

- 📧 Email: support@zeni.io
- 💬 Discord: [Join our community](https://discord.gg/zeni)
- 🐛 Issues: [GitHub Issues](https://github.com/zeni/zeni/issues)
- 📖 Docs: [Documentation Site](https://docs.zeni.io)

---

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core financial management
- ✅ Bank integration
- ✅ AI insights
- ✅ Mobile app

### Phase 2 (Q3 2026)
- [ ] Multi-currency support
- [ ] Investment tracking
- [ ] Crypto integration
- [ ] Advanced analytics

### Phase 3 (Q4 2026)
- [ ] API for third-party integrations
- [ ] Open Banking standards (PSD2, OPEN Banking)
- [ ] Advanced ML models
- [ ] Enterprise features

---

## ⚖️ Legal & Compliance

**Important**: Zeni handles sensitive financial data. Before using in production:
- Review all compliance requirements for your jurisdiction
- Implement required security measures
- Obtain necessary licenses/registrations
- Conduct security audit
- Implement audit logging
- Set up incident response procedures

---

<div align="center">

**Made with ❤️ by the Zeni Team**

[⬆ Back to Top](#zeni---ai-financial-operating-system)

</div>
