# ZENI ENTERPRISE SECURITY ARCHITECTURE

**Status:** Phase 1 Security Foundation  
**Last Updated:** May 27, 2026  
**Priority Level:** CRITICAL - All items non-negotiable

---

## 🔐 EXECUTIVE SUMMARY

Zeni is building **financial infrastructure**, not a mobile app. One security failure = company death.

This document is the **law of the land** for all developers.

Every line of code must assume:
- Attackers will try to breach this
- Users' money is on the line
- Regulatory bodies will audit this
- Investors will verify this

---

## 1️⃣ AUTHENTICATION & SESSION SECURITY

### JWT Implementation (MANDATORY)

```
├─ Access Token (15 min expiry)
│  ├─ Issued on login
│  ├─ Stored in secure storage
│  ├─ Checked on every API call
│  └─ Revoked on logout
│
├─ Refresh Token (7 day expiry)
│  ├─ Stored separately from access token
│  ├─ Never sent in API responses
│  ├─ Rotated on every use
│  └─ Revoked on logout
│
└─ Session Management
   ├─ Track device ID
   ├─ Track IP address
   ├─ Detect suspicious logins
   └─ Auto-logout after 15 min inactivity
```

**Implementation Requirements:**
- [ ] Access token: RS256 signed, 15 min TTL
- [ ] Refresh token: Stored server-side, can be revoked
- [ ] Token rotation: New refresh token on every refresh
- [ ] Logout: Blacklist tokens in cache
- [ ] Session: Device fingerprinting + IP logging

---

### Multi-Factor Authentication (MANDATORY)

**Phase 1 (MVP):**
- [ ] Email OTP (6 digits, 5 min expiry)
- [ ] TOTP support (Google Authenticator compatible)
- [ ] Backup codes (10 single-use codes)

**Phase 2:**
- [ ] SMS OTP
- [ ] Biometric (Face ID / Fingerprint)
- [ ] Hardware security keys

**Critical Rules:**
- MFA REQUIRED for:
  - [ ] First login from new device
  - [ ] Password changes
  - [ ] Withdrawal/transfer actions
  - [ ] Savings unlock
  - [ ] Bank account changes

---

### Mobile Biometric Security

**Implement:**
```
├─ Face ID (iOS)
├─ Fingerprint (Android)
├─ Device PIN fallback
└─ App-level session timeout (5 min)
```

**Rules:**
- [ ] Biometric MUST re-authenticate for sensitive actions
- [ ] Session timeout auto-locks app
- [ ] Failed auth = rate limited (5 attempts max)
- [ ] Device tampering = app warnings

---

### Login Security

**Track & Alert:**
- [ ] New device login
- [ ] New location login
- [ ] Impossible travel detection
- [ ] Unusual time patterns
- [ ] Failed login attempts (lock after 5)

**Implementation:**
- Require verification email for new device
- Send "login attempt" notification
- Allow user to revoke sessions remotely

---

## 2️⃣ BANK CONNECTION & TOKEN SECURITY

### Token Storage (CRITICAL)

**NEVER store tokens in plain text.**

**Encryption Standard: AES-256-GCM**

```
Database Level:
├─ Column-level encryption
├─ AES-256 with unique IV per row
├─ Encryption key in AWS KMS (not in app)
└─ Key rotation quarterly

Application Level:
├─ Decrypt tokens only when needed
├─ Keep in memory only during use
├─ Clear from memory after use
└─ NEVER log tokens
```

**Implementation Checklist:**
- [ ] Create `encryption-service.ts` with AES-256 utils
- [ ] Use AWS KMS for key management
- [ ] Implement field-level encryption in database
- [ ] Add `encrypted` flag to database schema
- [ ] Create token rotation mechanism

---

### Bank OAuth Flow

**ZENI MUST NEVER SEE:**
- Bank passwords
- PINs
- Security questions
- Card CVV

**ZENI ONLY RECEIVES:**
- Encrypted access tokens (from Mono/Okra)
- Account metadata
- Authorization scope

**Implementation:**
- [ ] Use Mono/Okra SDK ONLY
- [ ] Validate SDK responses
- [ ] Verify OAuth signature
- [ ] Store tokens encrypted
- [ ] Implement token refresh logic
- [ ] Handle token expiration gracefully

---

### Token Lifecycle

```
Token Issued
    ↓
[Stored Encrypted in DB]
    ↓
[Used for API calls (decrypted in memory)]
    ↓
[Re-encrypted immediately after use]
    ↓
[Rotated every 90 days]
    ↓
[Revoked on account deletion]
```

---

## 3️⃣ DATABASE SECURITY

### Encryption at Rest

**Every sensitive field MUST be encrypted:**

```sql
-- User Data
├─ email (encrypted)
├─ phone (encrypted)
├─ date_of_birth (encrypted)
└─ bvn (encrypted)

-- Financial Data
├─ account_number (encrypted)
├─ bank_name (encrypted)
├─ wallet_balance (encrypted)
├─ bank_tokens (encrypted)
└─ transaction_details (encrypted)

-- Audit Data
├─ ip_addresses (encrypted)
├─ device_ids (encrypted)
└─ location_data (encrypted)
```

**Implementation:**
- [ ] Column encryption with pgcrypto (PostgreSQL)
- [ ] AES-256 for all sensitive fields
- [ ] Separate encryption keys per table
- [ ] Key rotation quarterly

---

### Row-Level Security (RLS)

**Supabase RLS MUST be enabled:**

```sql
-- Users can only see their own data
CREATE POLICY user_data_policy ON wallets
  USING (auth.uid() = user_id);

-- Users can only read their transactions
CREATE POLICY transactions_policy ON wallet_transactions
  USING (wallet_id IN (
    SELECT id FROM wallets WHERE user_id = auth.uid()
  ));
```

**Enforcement:**
- [ ] RLS enabled on ALL tables
- [ ] Admin bypass only with logged audit trail
- [ ] Regular RLS policy audits
- [ ] No direct database access in production

---

### Access Control

**Database User Roles:**

```
├─ app_user (least privilege)
│  ├─ SELECT own data
│  ├─ INSERT transactions
│  └─ UPDATE limited fields
│
├─ app_admin (audit logging required)
│  ├─ SELECT with restrictions
│  ├─ UPDATE financial data (logged)
│  └─ DELETE with approval
│
└─ service_account (system only)
   ├─ Batch operations
   ├─ Scheduled jobs
   └─ All actions logged
```

---

## 4️⃣ API SECURITY

### HTTPS Only

**NO HTTP EVER.**

```
├─ TLS 1.3 minimum
├─ Certificate pinning in mobile app
├─ Perfect forward secrecy enabled
└─ OCSP stapling configured
```

---

### Rate Limiting

**Implement tiered rate limiting:**

```
Authentication Endpoints:
├─ /signin: 5 attempts per 15 min (IP-based)
├─ /verify-otp: 3 attempts per 15 min
└─ /signup: 10 per hour (IP-based)

API Endpoints:
├─ /wallet/*: 100 per minute (user-based)
├─ /banks/*: 50 per minute (user-based)
└─ /transactions/*: 200 per minute (user-based)

High-Risk Endpoints:
├─ /withdraw: 5 per hour (user-based)
├─ /link-bank: 3 per day (user-based)
└─ /verify-payment: 10 per hour (reference-based)
```

**Implementation:**
- [ ] Redis-based rate limiting
- [ ] IP + user ID combination tracking
- [ ] Exponential backoff on violations
- [ ] Alert on suspicious patterns

---

### Request Validation

**NEVER trust frontend data.**

```
ALWAYS:
├─ Validate payload schema
├─ Validate token signature
├─ Validate parameter types
├─ Validate data ranges
├─ Check user permissions
└─ Log validation failures

NEVER:
├─ Trust client-provided user IDs
├─ Use client-provided amounts directly
├─ Skip authentication checks
├─ Accept invalid data formats
└─ Process requests from non-HTTPS
```

**Implementation:**
- [ ] Zod/Joi schema validation on every endpoint
- [ ] JWT signature verification on every request
- [ ] Type checking for all financial amounts
- [ ] Enum validation for status fields

---

### Request Signing

**Critical operations MUST be signed:**

```
Withdrawal Request:
├─ User signs with private key
├─ Server verifies signature
├─ Timestamp included (replay protection)
├─ Nonce validation
└─ Only then process

Savings Unlock:
├─ OTP required
├─ Request signed
├─ Biometric confirmed
└─ Then authorized
```

---

## 5️⃣ PAYMENT & WITHDRAWAL SECURITY

### Withdrawal Rules (CRITICAL)

```
NO silent withdrawals.

EVERY withdrawal must:
├─ Require explicit OTP confirmation
├─ Show confirmation screen (5 sec min)
├─ Verify device possession
├─ Log request + approval
├─ Send notification
└─ Allow reversal window (24 hours)
```

---

### Paystack Payment Flow

```
Payment Initiated
    ↓
[Server generates reference]
    ↓
[Client redirects to Paystack]
    ↓
[User completes payment]
    ↓
[Paystack sends webhook to server]
    ↓
[Server verifies signature + status]
    ↓
[Only THEN update wallet]
```

**Critical Validations:**
- [ ] Webhook signature verification
- [ ] Amount verification
- [ ] User ID verification
- [ ] Idempotency (prevent double-credit)
- [ ] Timeout handling

---

### Fraud Detection

**Implement behavioral fraud detection:**

```
Suspicious Activity Triggers:
├─ Withdrawal > daily limit
├─ Multiple withdrawals in short time
├─ Unusual destination account
├─ Impossible location jump
├─ Device inconsistency
├─ Unusual time pattern
├─ Amount > typical history
└─ New device + withdrawal
```

**Response:**
- [ ] Flag transaction for manual review
- [ ] Send user verification email
- [ ] Require OTP re-confirmation
- [ ] Lock account if high risk
- [ ] Alert admin dashboard

---

## 6️⃣ AUDIT LOGGING

### Everything Must Be Logged

```
Track:
├─ Login attempts (success/failure)
├─ MFA setup changes
├─ Password resets
├─ Bank connection/disconnection
├─ Token refreshes
├─ Wallet deposits/withdrawals
├─ Savings goal creation/update
├─ Payment initiations/verifications
├─ Admin actions
├─ Data access
└─ API errors

Do NOT Log:
├─ Passwords (hashed only)
├─ Tokens (hashed)
├─ Full card numbers
├─ Full account numbers
└─ OTP codes
```

**Audit Log Schema:**

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL,
  
  CONSTRAINT user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

## 7️⃣ ADMIN PANEL SECURITY

### Admin Access (CRITICAL)

```
NEVER allow casual admin access to:
├─ Wallet balances
├─ Bank tokens
├─ User passwords
├─ Sensitive user data
└─ Direct financial operations

ONLY allow via:
├─ MFA required
├─ Approval workflow
├─ Complete audit trail
├─ Time-limited access
└─ Session recording
```

**Admin Capabilities:**
- [ ] View audit logs
- [ ] Manage user support cases
- [ ] View anonymized analytics
- [ ] Manage API keys
- [ ] Approve disputes (with 2/2 review)

**Forbidden:**
- [ ] Direct wallet manipulation
- [ ] Token viewing
- [ ] Password resets without user consent
- [ ] Account deletion without verification

---

## 8️⃣ MOBILE APP SECURITY

### Root/Jailbreak Detection

```
On App Launch:
├─ Check device root status
├─ Check app tampering
├─ Check SSL pinning
└─ If compromised:
   ├─ Warn user
   ├─ Disable sensitive features
   └─ Request reinstall
```

**Implementation:**
- [ ] Use `react-native-root-detect` or similar
- [ ] Check app signature validity
- [ ] Verify certificate pinning

---

### SSL Certificate Pinning

```
DO NOT accept random certificates.

Pin Zeni's certificates:
├─ Production cert
├─ Backup cert (for rotation)
└─ Reject all others
```

---

### Secure Local Storage

```
NEVER store locally:
├─ Access tokens (plain)
├─ Bank tokens
├─ User passwords
├─ Wallet balances
└─ Sensitive metadata

ONLY store:
├─ Hashed refresh token
├─ Encrypted user preferences
├─ Cached public data (prices, etc.)
└─ Session timeout markers
```

---

## 9️⃣ AI SECURITY

### Claude AI Data Handling

**ZENI MUST SANITIZE before sending to Claude:**

```
NEVER send:
├─ Raw bank credentials
├─ Complete account numbers
├─ Full transaction history
├─ User identifiers
└─ Complete financial identity

ONLY send:
├─ Last 4 digits of account
├─ Transaction amounts (no details)
├─ Category hints
├─ Aggregated patterns
└─ Anonymized metadata

Prompt Injection Prevention:
├─ Never interpolate user data directly
├─ Use structured data formats
├─ Validate responses
└─ Sanitize outputs
```

---

## 🔟 COMPLIANCE PREPARATION

### NDPR (Nigeria Data Protection Regulation)

- [ ] User consent for data collection
- [ ] Right to access implemented
- [ ] Right to deletion implemented
- [ ] Data processing agreements in place
- [ ] Privacy policy updated

### PCI-DSS (Payment Card Industry)

- [ ] Do NOT store credit card data
- [ ] Use Paystack for PCI compliance
- [ ] Implement secure logging
- [ ] Network segmentation

### CBN Fintech Requirements

- [ ] Money transmission licensing roadmap
- [ ] Customer identification (KYC)
- [ ] Transaction monitoring (AML)
- [ ] Fraud prevention
- [ ] Consumer protection

---

## 1️⃣1️⃣ DEVOPS SECURITY

### Secret Management

```
NEVER commit to GitHub:
├─ API keys
├─ Database credentials
├─ Private keys
├─ Tokens
└─ Encryption keys

USE:
├─ AWS Secrets Manager
├─ AWS KMS
├─ GitHub Secrets (encrypted)
└─ Environment variables (server-side only)
```

### Dependency Security

```
IMPLEMENT:
├─ npm audit on every commit
├─ Snyk scanning
├─ Dependency version pinning
├─ Monthly security updates
└─ CVE monitoring
```

---

## 1️⃣2️⃣ INFRASTRUCTURE SECURITY

### Cloud Setup (AWS/GCP)

```
MUST HAVE:
├─ Private VPC for databases
├─ Private security groups
├─ NAT gateway for outbound
├─ DDoS protection (AWS Shield)
├─ WAF (Web Application Firewall)
├─ CloudTrail logging
├─ VPC Flow Logs
├─ Automated backups
├─ Disaster recovery plan
└─ Multi-region failover (future)
```

---

## 🚨 INCIDENT RESPONSE

### If Breach Suspected

1. **Immediate Actions (First Hour)**
   - [ ] Isolate affected systems
   - [ ] Preserve logs
   - [ ] Notify security team
   - [ ] Begin forensics

2. **User Notification (24 Hours)**
   - [ ] Alert affected users
   - [ ] Provide credit monitoring
   - [ ] Password reset guidance
   - [ ] Support contact info

3. **Regulatory Notification (Days)**
   - [ ] Notify CBN
   - [ ] Notify users' banks
   - [ ] Prepare incident report
   - [ ] Document remediation

---

## 📋 SECURITY CHECKLIST

Before ANY production deployment:

- [ ] All environment variables secured
- [ ] Database encrypted at rest
- [ ] RLS policies enabled
- [ ] Rate limiting active
- [ ] JWT validation working
- [ ] MFA implemented
- [ ] Audit logging enabled
- [ ] HTTPS + TLS 1.3
- [ ] Certificate pinning configured
- [ ] Admin panel secured
- [ ] Fraud detection active
- [ ] Webhook signature verification
- [ ] Backup & recovery tested
- [ ] Security headers configured
- [ ] CORS properly restricted
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak info
- [ ] Secrets not in code/logs
- [ ] Dependencies scanned for CVEs
- [ ] Security audit completed

---

## 📞 SECURITY ESCALATION

**If ANY security issue discovered:**

1. **Do NOT commit/deploy**
2. **Immediately notify tech lead**
3. **Create incident ticket**
4. **Begin investigation**
5. **Document findings**
6. **Implement fix with review**
7. **Deploy with caution**
8. **Monitor for impact**

---

## 🎯 NEXT STEPS

**This week:**
- [ ] Review this document as a team
- [ ] Assign ownership for each section
- [ ] Create implementation tickets
- [ ] Begin Phase 1 security implementation

**This month:**
- [ ] Core encryption layer
- [ ] MFA system
- [ ] Audit logging
- [ ] Database security hardening

**Before production:**
- [ ] Complete all checkboxes
- [ ] Security audit (external)
- [ ] Penetration testing
- [ ] Compliance review

---

## 💪 REMEMBER

You're not trying to "look secure."

You're building security into every layer.

Because users are trusting Zeni with their money.

That trust is everything.

**Security isn't a feature.**

**It's the foundation.**

---

*Last Updated: May 27, 2026*  
*Maintained by: Security Team*  
*Review Frequency: Quarterly*
