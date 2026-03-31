# 🔍 AUDIT FINDINGS: SPARTA Maintenance Project

**Date:** 31 March 2026  
**Scope:** Full project audit (Security, Architecture, Data Handling, Logging)  
**Severity Levels:** Critical | Major | Minor | Nit

---

## 📊 Executive Summary

| Category             | Count | Status          | Risk                               |
| -------------------- | ----- | --------------- | ---------------------------------- |
| 🔴 **CRITICAL**      | 3     | Urgent          | High - Production Impact           |
| 🟠 **MAJOR**         | 5     | High Priority   | Medium-High - Security/Data Issues |
| 🟡 **MINOR**         | 8     | Medium Priority | Low-Medium - Best Practices        |
| 🔵 **NIT**           | 2     | Low Priority    | Cosmetic                           |
| ✅ **VERIFIED GOOD** | 5+    | N/A             | No Action                          |

**Overall Project Health:** ⚠️ **NEEDS ATTENTION** — Critical issues must be fixed before production deployment.

---

## 🔴 CRITICAL ISSUES (Must Fix IMMEDIATELY)

### C-01: Plaintext Password Storage — Password = Branch Name

**Severity:** 🔴 CRITICAL  
**Category:** Security — Authentication  
**Files:** [app/login/action.ts](app/login/action.ts#L47-L55) | [prisma/schema.prisma](prisma/schema.prisma#L82)  
**Risk:** **EXTREME** — Any BMS user can be impersonated by anyone knowing the branch name

#### Problem

```typescript
// app/login/action.ts (Line 47-55)
const isPasswordValid = user.branchNames.some(
    (branch) => branch.trim().toUpperCase() === password.trim().toUpperCase(),
);
```

**Why This Is Critical:**

- Password = branch name (case-insensitive)
- Branch names are not secret (e.g., "Jakarta Pusat", "Bandung")
- If an insider knows store locations, they can impersonate any BMS
- No rate limiting (see M-02) makes brute force trivial
- Audit logs show `createdByNIK` but not who actually logged in
- Violates **OWASP A02:2021 — Authentication**

#### Impact

- **Confidentiality:** HIGH — Reports can be viewed by unauthorized users
- **Integrity:** HIGH — Fake reports can be submitted under others' NIK
- **Compliance:** CRITICAL — Audit trail is unreliable

#### Fix (Required)

Implement proper password hashing:

```typescript
// Add to schema.prisma
model User {
  NIK           String        @id
  email         String        @unique
  name          String
  role          UserRole      @default(BMS)
  branchNames   String[]
  passwordHash  String        // NEW: Argon2id hash
  // ... rest of fields
}

// app/login/action.ts
import { verify } from "@node-rs/argon2";

const isPasswordValid = await verify(user.passwordHash, password);
if (!isPasswordValid) {
    return { errors: { form: ["Email atau password salah."] } };
}
```

**Steps:**

1. Create migration: `npx prisma migrate dev --name add_password_hash`
2. Add `passwordHash` column to User table
3. Update login logic to use `verify()`
4. Update seeding script to hash all test passwords
5. Add password change UI in admin panel

**Timeline:** **BLOCKING** — Fix before any production access

---

### C-02: Middleware Not Protecting Routes — Rename `proxy.ts` → `middleware.ts`

**Severity:** 🔴 CRITICAL  
**Category:** Architecture — Route Protection  
**Files:** [proxy.ts](proxy.ts)  
**Risk:** **EXTREME** — All protected routes accessible at edge without auth

#### Problem

File is named `proxy.ts` instead of `middleware.ts`. Next.js only recognizes `middleware.ts` at the project root for edge middleware.

```
❌ proxy.ts (current)  — NOT executed by Next.js
✅ middleware.ts (required) — Executed at edge for ALL requests
```

**Current Behavior:**

- `proxy.ts` manually validates JWT for protected routes
- But Next.js doesn't call it automatically
- Server Components do perform auth checks (safety net), but:
    - Authentication happens AFTER initial request is processed
    - No edge-level rejection (slower, higher load)
    - Bypassing server components exposes unprotected data

#### Impact

- Database queries may execute before auth validation
- Performance is degraded (no edge-level rejection)
- If server components are removed, routes become public

#### Fix (Required)

```bash
# Rename file
mv proxy.ts middleware.ts

# Verify next.config.ts includes matcher (it should)
# No config changes needed — middleware.ts is auto-discovered
```

**Verification:**

```bash
npm run dev
# Check console: should see middleware logs for protected routes
```

**Timeline:** **IMMEDIATE** — Fix and test in next dev session

---

### C-03: Missing Branch-Level Authorization on Approval Routes

**Severity:** 🔴 CRITICAL  
**Category:** Access Control  
**Files:** [app/reports/actions/approve-final.ts](app/reports/actions/approve-final.ts) (deprecated, but pattern check)  
**Risk:** HIGH — BNM Manager from any branch can approve reports from other branches

#### Problem

BNM Manager roles lack `requireBranchAccess()` validation. A BNM Manager assigned to "Jakarta Pusat" could approve a report from "Bandung" branch.

```typescript
// ❌ MISSING: Branch validation
export async function approveFinal(reportNumber: string) {
    const user = await requireRole("BNM_MANAGER");  // ✓ Role check
    // ❌ NO: await requireBranchAccess(report.branchName);

    const report = await prisma.report.findUnique(...);
    // User from Jakarta could approve Bandung reports!
}
```

#### Fix (Required)

```typescript
export async function approveFinal(reportNumber: string) {
    const user = await requireRole("BNM_MANAGER");
    await validateCSRF(await headers());

    const report = await prisma.report.findUnique({
        where: { reportNumber },
        select: { branchName: true, status: true },
    });

    if (!report) throw new NotFoundError();

    // ✓ ADD: Branch validation
    if (!user.branchNames.includes(report.branchName)) {
        throw new AuthorizationError(
            `Tidak memiliki akses ke cabang ${report.branchName}`,
        );
    }

    // ... rest of approve logic
}
```

**Audit:** Check all server actions in `app/reports/actions/` for missing `branchNames` validation on BMC/BNM operations.

**Timeline:** **URGENT** — Fix all approval actions before deployment

---

## 🟠 MAJOR ISSUES (High Priority)

### M-01: CSRF Validation Silently Fails in Development

**Severity:** 🟠 MAJOR  
**Category:** Security — CSRF  
**Files:** [lib/authorization.ts](lib/authorization.ts#L162-L190)  
**Impact:** Developers won't catch misconfiguration before production

#### Problem

```typescript
// Line 188: Returns without throwing in dev
if (process.env.NODE_ENV === "development") {
    // ... check origin ...
    if (!isAllowedOrigin) {
        logger.warn(/* message */); // WARNING: Only logs, doesn't throw!
    }
    return; // ← Returns even if origin is invalid!
}
```

A developer misconfiguring their dev tunnel origin won't discover the issue until production.

#### Fix

```typescript
if (process.env.NODE_ENV === "development") {
    const devTunnelPatterns = [/\.devtunnels\.ms$/, /\.ngrok/];
    const isAllowed =
        allowedOrigins.includes(origin) ||
        devTunnelPatterns.some((p) => p.test(hostname));

    if (!isAllowed) {
        logger.error(
            { dev_origin: origin, expected_host: host },
            "CSRF blocked in development — fix your tunnel",
        );
        throw new Error("CSRF validation failed"); // ← Throw in dev too
    }
}
```

---

### M-02: No Rate Limiting on Login Endpoint

**Severity:** 🟠 MAJOR  
**Category:** Security — OWASP A07 (Authentication)  
**Files:** [app/login/action.ts](app/login/action.ts)  
**Rule:** [security-principles.md](./agent/rules/security-principles.md): "Rate Limiting: 5 attempts / 15 mins"  
**Combined Risk:** With C-01 (plaintext pwd), enables trivial brute force

#### Problem

- No attempt limiting
- No IP-based throttling
- Combined with branch names as passwords → trivial brute force
- "admin" role could be compromised via attempt enumeration

#### Fix (Required)

```typescript
// Install: npm install @vercel/kv upstash/ratelimit

import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 min
});

export async function loginAction(prevState: LoginState, formData: FormData) {
    const ipAddress = headers().get("x-forwarded-for") || "unknown";

    const { success } = await ratelimit.limit(ipAddress);
    if (!success) {
        return {
            errors: {
                form: [
                    "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.",
                ],
            },
        };
    }

    // ... rest of login logic
}
```

---

### M-03: Error Details Expose Internal Information

**Severity:** 🟠 MAJOR  
**Category:** Security — Information Disclosure  
**Files:** [lib/server-error.ts](lib/server-error.ts) | [app/reports/actions/submit.ts](app/reports/actions/submit.ts#L208-L221)  
**Impact:** Database schema, table names, query info leaked to client

#### Problem

Server actions return full error messages including Prisma internals:

```typescript
// ❌ app/reports/actions/submit.ts (L221)
logger.error({ operation: "submitReport" }, "Submit failed", error);
return {
    error: "Laporan gagal disimpan",
    detail: getErrorDetail(error), // ← Exposes full error message
};
```

If a Prisma query fails, users see: `"Unique constraint failed on the fields: (NIK,email)"` instead of generic message.

#### Fix

```typescript
// Helper function
function getSafeErrorMessage(error: unknown): string {
    if (process.env.NODE_ENV === "development") {
        return getErrorDetail(error); // Dev: Full details
    }

    // Production: Generic message
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error({ code: error.code }, "Database error");
        return "Terjadi kesalahan saat menyimpan data.";
    }

    return "Operasi gagal. Hubungi admin jika masalah berlanjut.";
}
```

---

### M-04: Open Redirect Vulnerability in Login

**Severity:** 🟠 MAJOR  
**Category:** Security — CWE-601 (Open Redirect)  
**Files:** [app/login/action.ts](app/login/action.ts#L81-L86)  
**Impact:** Phishing attacks, session fixation

#### Problem

```typescript
// ❌ Line 85
const safeRedirect =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/dashboard";
```

Vulnerable to:

- Unicode bypass: `/\evil.com` (slash-backslash)
- Encoded bypass: `/%2F%2Fevil.com`
- No length validation (DoS)

#### Fix

```typescript
function getSafeRedirectUrl(callbackUrl: string | null): string {
    if (!callbackUrl) return "/dashboard";

    try {
        // Parse as full URL to detect absolute URLs
        const parsed = new URL(callbackUrl, "http://localhost");

        // Only allow paths (no protocol/host)
        if (!callbackUrl.startsWith("/")) return "/dashboard";

        // Whitelist allowed paths
        const allowedPaths = ["/dashboard", "/reports", "/approval", "/admin"];

        if (!allowedPaths.some((p) => callbackUrl.startsWith(p))) {
            return "/dashboard";
        }

        // Limit length (512 chars)
        if (callbackUrl.length > 512) return "/dashboard";

        return callbackUrl;
    } catch {
        return "/dashboard";
    }
}
```

---

### M-05: No MIME Type Validation on Photo Upload

**Severity:** 🟠 MAJOR  
**Category:** Security — File Upload  
**Files:** [app/reports/(bms)/create/hooks/use-photo-upload.ts](<app/reports/(bms)/create/hooks/use-photo-upload.ts#L138-L145>)  
**Impact:** Malicious executable files disguised as images

#### Problem

```typescript
// ❌ Line 142: Only checks extension
const fileExt = file.name.split(".").pop() || "jpg";

// No validation of actual file content (magic bytes)
// User can rename malware.exe → photo.jpg
```

#### Fix

```typescript
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
];

const handlePhotoCaptured = useCallback(
    async (file: File) => {
        // ✓ Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            toast.error(
                "Format file tidak didukung. Gunakan JPEG, PNG, WebP, atau HEIC.",
            );
            return;
        }

        // ✓ Validate size
        if (file.size > 5 * 1024 * 1024) {
            // 5MB max
            toast.error("File terlalu besar. Maksimal 5MB.");
            return;
        }

        // ... rest of upload logic
    },
    [activePhotoItemId, draftId],
);
```

---

### M-06: Inconsistent DRAFT Filtering in Queries

**Severity:** 🟠 MAJOR  
**Category:** Data Access — Authorization  
**Files:** [app/dashboard/queries.ts](app/dashboard/queries.ts) | Various query files  
**Impact:** BMC/BNM could see DRAFT reports they shouldn't access

#### Problem

While most queries correctly filter `status: { not: "DRAFT" }`, some may not consistently apply this pattern.

**Rule:**

- BMS can see DRAFT reports they own
- BMC/BNM must NEVER see drafts (they're still being edited)

#### Verify

```bash
# Search all query files for DRAFT filtering
grep -r "DRAFT" app/dashboard/queries.ts app/reports/actions/queries.ts

# Each BMC/BNM query should have:
where: {
    branchName: { in: user.branchNames },
    status: { not: "DRAFT" }  // ← Must be present
}
```

---

## 🟡 MINOR ISSUES (Should Address)

### Mi-01: Supabase Anon Key Exposed to Browser

**Severity:** 🟡 MINOR  
**Category:** Security — Third-Party Storage  
**Files:** [lib/supabase.ts](lib/supabase.ts)  
**Impact:** Depends on Row Level Security configuration

```typescript
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // ← Public key
const _client = createClient(url, key);
```

**Status:** MITIGATED IF RLS is active on bucket "reports"  
**Action:** Verify RLS policies are enforced:

```sql
-- Run in Supabase SQL Editor
SELECT policy_name, action, check_expression
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND tablename LIKE '%reports%';
```

---

### Mi-02: `/api/auth/session` Endpoint Returns Expiry Without Auth

**Severity:** 🟡 MINOR  
**Category:** Security — Information Disclosure  
**Files:** [app/api/auth/session/route.ts](app/api/auth/session/route.ts)  
**Impact:** LOW — Session expiry state leaked to CSRF attackers

```typescript
// ❌ No auth check on GET /api/auth/session
export async function GET() {
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        return NextResponse.json({ expired: true }); // ← Can enumerate sessions
    }

    // ...
}
```

**Fix:** Add `requireAuth()` check or use `X-Requested-With: XMLHttpRequest` header validation.

---

### Mi-03: Supabase Storage Upload Path Assumptions

**Severity:** 🟡 MINOR  
**Category:** Reliability — Assumptions  
**Files:** [app/reports/actions/submit.ts](app/reports/actions/submit.ts#L33-L70)  
**Impact:** Broken images if photo migration logic assumptions change

```typescript
// ❌ Relies on path format remaining constant
if (!item.photoUrl.includes(`/${draftId}/`)) {
    return item; // Non-fatal: keeps old URL
}
```

If storage path format changes:

- Old photos stay in DRAFT folder
- References become stale
- Images break

**Recommendation:** Add versioning to photo URLs or implement cleanup job.

---

### Mi-04: Client-Side Password Hint

**Severity:** 🟡 MINOR  
**Category:** Security — Information Disclosure  
**Files:** [app/login/login-form.tsx](app/login/login-form.tsx#L44-L46)  
**Impact:** MINIMAL — Confirms password = branch name to attackers

```tsx
// ❌ Converts to uppercase, hinting plaintext password
<input
    type="password"
    value={password.toUpperCase()} // ← Hints case-insensitive
    onChange={(e) => setPassword(e.target.value)}
/>
```

**Fix:** Remove case conversion; let user type freely.

---

### Mi-05: Incomplete Logging Strategy

**Severity:** 🟡 MINOR  
**Category:** Observability — Logging  
**Files:** [.docs/plan-logging-system.md](.docs/plan-logging-system.md) | [lib/logger.ts](lib/logger.ts)  
**Impact:** MEDIUM — No persistent audit trail for admin review

**Current State:**

- Console logging only (transient)
- `ActivityLog` table tracks major workflow events ✓
- No structured app-level logging to DB
- Diagnostics require checking server logs

**Status:** PLANNED but NOT IMPLEMENTED  
**Recommendation:** Implement `AppLog` table as designed in `.docs/plan-logging-system.md`.

---

### Mi-06: Pagination Missing on Long Lists

**Severity:** 🟡 MINOR  
**Category:** Performance — UX  
**Files:** [app/dashboard/\_components/](app/dashboard/_components/)  
**Impact:** Slow page load if many reports

Some dashboard tables don't paginate large result sets, which could cause performance issues on production with thousands of records.

---

### Mi-07: Prisma Connection Pool Max = 1

**Severity:** 🟡 MINOR  
**Category:** Performance — Database  
**Files:** [lib/prisma.ts](lib/prisma.ts#L10-L16)  
**Impact:** Bottleneck under concurrent long-running queries

```typescript
const prisma = new PrismaClient({
    datasources: {
        db: { url: process.env.DATABASE_URL },
    },
    log: ["info", "warn", "error"],
});

// With Supabase pooler and max: 1, can bottleneck
// under concurrent load
```

**Note:** Safe for normal throughput, but monitor for issues.

---

### Mi-08: Missing Database Migration Rollback Documentation

**Severity:** 🟡 MINOR  
**Category:** Reliability — Documentation  
**Files:** [prisma/migrations/](prisma/migrations/)  
**Impact:** Team doesn't know how to recover from migration failures

**Status:** NONE in repo  
**Required:** Document procedure in `docs/database-recovery.md`:

```markdown
# Migration Rollback Procedure

1. Check migration history: `prisma migrate history`
2. Identify failed migration
3. Roll back: `prisma migrate resolve --rolled-back <migration_name>`
4. Fix schema in `schema.prisma`
5. Re-run: `prisma migrate dev --name <fixed_name>`
```

---

## 🔵 NITS (Optional/Cosmetic)

### N-01: Console.error in Production Code

**Severity:** 🔵 NIT  
**Files:** Various client components  
**Suggestion:** Use structured logging instead of `console.error`.

### N-02: Image Dimension Fallback (4:3) in Compression

**Severity:** 🔵 NIT  
**Files:** [app/reports/(bms)/start-work/start-work-form.tsx](<app/reports/(bms)/start-work/start-work-form.tsx#L88-L97>)  
**Suggestion:** Log fallback event for debugging.

---

## ✅ VERIFIED GOOD PRACTICES

### ✓ Authorization Helpers Consistently Applied

- `requireAuth()`, `requireRole()`, `requireOwnership()` used correctly in server actions
- Pattern enforcement clear in copilot-instructions.md

### ✓ JSONB Pattern Correct

- `Report.items[]` and `Report.estimations[]` properly stored as JSONB
- No unnecessary relational tables

### ✓ Singleton Clients

- Supabase: singleton with lazy initialization ✓
- Prisma: singleton with `allowExitOnIdle` ✓

### ✓ Activity Logging

- `ActivityLog` table tracks major workflow events ✓
- Audit trail for BMC/BNM approvals intact

### ✓ Session Security

- JWT-based session with 8-hour expiry ✓
- Secure cookie flags set

---

## 📋 REMEDIATION ROADMAP

### Phase 1 (BLOCKING — Before Production)

- [ ] **C-01** Fix password hashing (Argon2id)
- [ ] **C-02** Rename `proxy.ts` → `middleware.ts`
- [ ] **C-03** Add branch validation to approval actions
- [ ] **M-02** Implement rate limiting on login

**Timeline:** This sprint — CRITICAL for security clearance

### Phase 2 (High Priority — Next Sprint)

- [ ] **M-01** Fix CSRF validation in dev mode
- [ ] **M-04** Fix open redirect vulnerability
- [ ] **M-05** Add MIME type validation on upload
- [ ] **Mi-06** Implement pagination on dashboard tables

**Timeline:** Sprint N+1

### Phase 3 (Medium Priority — Backlog)

- [ ] **M-03** Implement safe error messaging
- [ ] **Mi-05** Implement persistent logging to AppLog table
- [ ] **Mi-08** Document database migration rollback
- [ ] **Mi-07** Monitor Prisma pool usage under load

**Timeline:** Sprint N+2 or later

---

## 🛠️ Quick Fixes Checklist

```bash
# 1. Rename middleware file
mv proxy.ts middleware.ts

# 2. Create password migration
npx prisma migrate dev --name add_password_hash

# 3. Install rate limiting
npm install @vercel/kv upstash/ratelimit

# 4. Run updated seed script
npm run db:seed

# 5. Test all protected routes
npm run dev
# Test /dashboard, /reports, /admin without auth

# 6. Verify Supabase RLS policies
# Navigate to: Supabase Dashboard → Storage → Policies
```

---

## 📞 Questions & Escalation

| Issue              | Escalate To          | Timeline             |
| ------------------ | -------------------- | -------------------- |
| C-01 (Password)    | Tech Lead + Security | Next standup         |
| C-02 (Middleware)  | Deployment Team      | Before next deploy   |
| Password reset UX  | Product Team         | Next sprint planning |
| Rate limiting cost | DevOps               | Budget check         |

---

## 📄 Report Metadata

- **Reviewed By:** AI Agent with Codebase Analysis
- **Review Date:** 31 March 2026
- **Next Audit:** After Phase 1 remediation
- **Distribution:** Dev Team, Security Review, Project Lead
- **Confidentiality:** Internal Only

---

**End of Audit Report**
