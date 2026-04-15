# PostgreSQL Connection Configuration - Quick Reference

## Current Status

Your project uses:
- **Library**: postgres.js v3.4.9
- **Database**: Neon PostgreSQL with connection pooler
- **Connection string**: Includes `-pooler` endpoint ✓
- **Configuration**: Currently minimal (needs improvement)

## Critical Issues to Address

### 1. Missing Timeout Configuration
**Current:**
```typescript
export const sql = postgres(connectionString);
```

**Problem:** No timeouts configured; connections may hang indefinitely on Neon's cold starts.

**Solution:** Add these options:
```typescript
export const sql = postgres(connectionString, {
  ssl: 'require',
  connect_timeout: 60,      // Critical for cold starts
  idle_timeout: 20,         // Close unused connections
  max_lifetime: 60 * 30,    // 30 minutes
  max: 5,                   // Reduced for serverless
});
```

### 2. Connection Pool Exhaustion Risk in Serverless
**Problem:** Each Next.js function invocation creates/reuses connections; lack of `idle_timeout` means connections persist indefinitely.

**Impact:** 
- 100 concurrent requests → potential 100 connections
- Neon default `max_connections` for 0.25 CU = 104
- System quickly becomes unavailable

**Solution:** Add `idle_timeout: 10` to close stale connections.

### 3. No Retry Logic
**Problem:** Neon's scale-to-zero causes 100-500ms cold start delays; default 30-second timeout still fails.

**Solution:** Implement exponential backoff retry with 60-second `connect_timeout`.

## Implementation Plan

### Step 1: Update `/lib/db.ts` (Priority: HIGH)

```typescript
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = postgres(connectionString, {
  // === SSL/Security ===
  ssl: 'require',  // Neon requirement
  
  // === Timeouts (CRITICAL) ===
  connect_timeout: 60,          // Allow cold starts
  idle_timeout: 20,             // Close idle connections
  max_lifetime: 60 * 30,        // 30 minutes
  
  // === Pool Configuration ===
  max: process.env.NODE_ENV === 'production' ? 5 : 10,
  
  // === Error Handling ===
  onnotice: process.env.DATABASE_DEBUG ? console.log : false,
  
  // === Session Metadata ===
  connection: {
    application_name: 'bookly-frontend'
  }
});
```

### Step 2: Add Retry Helper (Priority: HIGH)

```typescript
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error as Error;
      
      // Skip auth/permission errors
      if (lastError.message.includes('password authentication failed') ||
          lastError.message.includes('permission denied')) {
        throw lastError;
      }
      
      // Exponential backoff
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

### Step 3: Update Database Calls (Priority: MEDIUM)

In `lib/tools/users.ts` and similar files:

```typescript
// OLD:
const result = await sql`SELECT ...`;

// NEW:
import { queryWithRetry } from './db';

const result = await queryWithRetry(() => 
  sql`SELECT ...`
);
```

## Key Settings Explained

| Setting | Value | Why |
|---------|-------|-----|
| `connect_timeout` | 60s | Neon cold starts take 100-500ms; need buffer |
| `idle_timeout` | 20s | Close connections unused for 20s; critical for serverless |
| `max_lifetime` | 30 min | Periodic reconnection keeps connections fresh |
| `max` | 5 (production) | Reduce connection pressure on Neon |
| `ssl: 'require'` | Required | Neon enforces this |

## Common Mistakes to Avoid

### ❌ DON'T: Try to use `SET` statements

```typescript
// This won't work with Neon's pooled connection:
await sql`SET search_path TO myschema`;
await sql`SELECT * FROM mytable`;  // ❌ Will fail - setting lost
```

**Why:** Neon uses PgBouncer in transaction mode; connections return to pool after each transaction.

**Instead:** Use explicit schema references:
```typescript
await sql`SELECT * FROM myschema.mytable`;
```

Or set at role level (one-time setup):
```sql
ALTER ROLE neondb_owner SET search_path TO myschema, public;
```

### ❌ DON'T: Leave connections open indefinitely

```typescript
// ❌ Bad for serverless:
const sql = postgres(connectionString, {
  // missing idle_timeout
});
```

**Impact:** Connections accumulate → pool exhaustion → "too many connections" errors.

### ❌ DON'T: Assume connection pooling means no configuration needed

Even with `-pooler` endpoint, client-side configuration is critical for:
- Cold start resilience
- Connection cleanup in serverless
- Resource management

## Testing Checklist

- [ ] Update `/lib/db.ts` with timeout configuration
- [ ] Test with `connect_timeout: 60` in development
- [ ] Add retry logic to critical database queries
- [ ] Monitor Neon Console for connection pool usage
- [ ] Test cold starts (simulate with `curl` after 5-min idle)
- [ ] Verify `idle_timeout` closes connections
- [ ] Check error logs for timeout-related errors

## Monitoring

In Neon Console:
1. Go to **Monitoring** tab
2. Watch **Pooler client connections** graph
3. Look for sustained high connection counts
4. Verify connections close with `idle_timeout`

## References

- Full research: See `POSTGRES_NEON_RESEARCH.md`
- postgres.js docs: `node_modules/postgres/README.md`
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling

## Questions & Support

Refer to `POSTGRES_NEON_RESEARCH.md` sections:
- **Section 1**: Configuration details
- **Section 2**: Timeout causes
- **Section 3**: All available options
- **Section 5**: Serverless-specific issues
- **Section 7**: Implementation examples
- **Section 8**: Neon-specific settings

