# Zeni API

Express.js backend for Zeni - AI Financial OS

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (via Supabase)
- Redis (for job queue)

### Setup

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Development**
```bash
npm run dev
```

4. **Build**
```bash
npm run build
npm start
```

### Docker

**Local development with Docker Compose:**
```bash
docker-compose up
```

**Production build:**
```bash
docker build -t zeni-api .
docker run -p 3000:3000 --env-file .env zeni-api
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Create account
- `POST /api/v1/auth/signin` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/reset-password` - Reset password

### Users
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update profile
- `GET /api/v1/users/settings` - Get settings
- `PUT /api/v1/users/settings` - Update settings

### Transactions
- `GET /api/v1/transactions` - List transactions
- `POST /api/v1/transactions` - Create transaction
- `GET /api/v1/transactions/:id` - Get transaction
- `PUT /api/v1/transactions/:id` - Update transaction
- `DELETE /api/v1/transactions/:id` - Delete transaction
- `POST /api/v1/transactions/sync` - Sync from bank

### Budgets
- `GET /api/v1/budgets` - List budgets
- `POST /api/v1/budgets` - Create budget
- `PUT /api/v1/budgets/:id` - Update budget
- `DELETE /api/v1/budgets/:id` - Delete budget

### Savings Goals
- `GET /api/v1/savings-goals` - List goals
- `POST /api/v1/savings-goals` - Create goal
- `PUT /api/v1/savings-goals/:id` - Update goal
- `DELETE /api/v1/savings-goals/:id` - Delete goal

### AI Insights
- `GET /api/v1/insights` - Get insights
- `POST /api/v1/insights/generate` - Generate new insights

### Bank Integration
- `POST /api/v1/banks/link` - Link bank account
- `GET /api/v1/banks/connected` - List connected banks
- `POST /api/v1/banks/sync` - Manual sync transactions

## Project Structure

```
api/
├── src/
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts         # JWT authentication
│   │   ├── errorHandler.ts # Error handling
│   │   └── validation.ts   # Request validation (Zod)
│   ├── routes/             # API endpoints
│   │   ├── auth.ts
│   │   ├── transactions.ts
│   │   ├── budgets.ts
│   │   ├── users.ts
│   │   ├── insights.ts
│   │   └── banks.ts
│   ├── services/           # Business logic
│   │   ├── supabase.ts    # Database client
│   │   ├── transaction.ts
│   │   ├── paystack.ts
│   │   ├── claude.ts      # LLM integration
│   │   └── notification.ts
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   └── server.ts           # Express app entry point
├── dist/                   # Compiled JavaScript
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Technologies

- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod
- **Job Queue**: BullMQ
- **Cache**: Redis
- **Auth**: JWT
- **LLM**: Claude API
- **Security**: Helmet, CORS
- **Logging**: Morgan

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `JWT_SECRET` - Secret for signing JWTs
- `ANTHROPIC_API_KEY` - Claude API key
- `PAYSTACK_SECRET_KEY` - Paystack API key
- `STRIPE_SECRET_KEY` - Stripe API key

## Development

### Type checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## Deployment

### Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create zeni-api

# Add Supabase config
heroku config:set SUPABASE_URL=...
heroku config:set SUPABASE_ANON_KEY=...
# ... add other vars

# Deploy
git push heroku main
```

### Railway

1. Connect GitHub repo to Railway
2. Add environment variables in Railway dashboard
3. Deploy from main branch

## Testing

```bash
# Unit tests (to be implemented)
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Security

- All requests are rate-limited (100 req/15min per IP)
- CORS configured for specified origins only
- Helmet security headers enabled
- JWT token validation on protected routes
- Zod schema validation on all inputs
- Environment variables for sensitive data

## Performance

- Redis caching for frequent queries
- Database query optimization
- Connection pooling via Supabase
- API response compression

## Monitoring

- Morgan request logging
- Sentry error tracking (to be added)
- Health endpoint: `GET /health`
- Database health checks

## Contributing

1. Create a feature branch
2. Make your changes
3. Type check: `npm run typecheck`
4. Lint: `npm run lint`
5. Commit with clear messages
6. Push to GitHub
7. Create Pull Request

## License

MIT
