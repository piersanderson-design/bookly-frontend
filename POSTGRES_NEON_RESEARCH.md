# PostgreSQL Connection Research: postgres.js with Neon

## Executive Summary

This research covers 8 key topics for properly configuring the `postgres` npm library (postgres.js v3.4.9) with Neon PostgreSQL, with focus on reliability, timeouts, connection pooling, and serverless best practices.

---

## 1. How to Properly Configure postgres.js for Neon PostgreSQL

### Current Setup
```typescript
// /lib/db.ts
import postgres from 'postgres';
const connectionString = process.env.DATABASE_URL;
export const sql = postgres(connectionString);
```

**Connection String Format:**
```
postgresql://neondb_owner:npg_4eCkK6JufOXl@ep-sparkling-firefly-abtg2x24-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Key Configuration Requirements for Neon:

**Required Settings:**
- `sslmode=require` - SSL/TLS encryption is mandatory for Neon
- `channel_binding=require` - Prevents connection hijacking (Neon requirement)
- Use the `-pooler` endpoint for serverless functions (already in your connection string)

**Basic postgres.js Configuration:**
```javascript
const sql = postgres(connectionString, {
  ssl: 'require',  // Explicitly set SSL requirement
  // Other important options follow below
})
```

**Important Note:** postgres.js automatically handles SSL when using a Neon connection string with `sslmode=require`. The library properly supports Server Name Indication (SNI), which is required for Neon's routing.

---

## 2. Why Connections Might Be Closing/Timing Out with Neon

### Common Causes:

#### A. Cold Starts with Scale to Zero
- **Default Neon behavior**: Computes suspend after 5 minutes of inactivity
- **Activation time**: Takes a few hundred milliseconds to activate from idle state
- **Impact**: Connection timeouts if your app's connection timeout is too short

#### B. Idle-in-Transaction Timeout
- **Default setting**: `idle_in_transaction_session_timeout = 300000ms (5 minutes)`
- **Cause**: Sessions that remain idle within an open transaction get terminated
- **Error message**: "Terminating connection due to idle-in-transaction timeout"

#### C. Query Wait Timeout
- **PgBouncer setting**: `query_wait_timeout = 120 seconds`
- **Cause**: Queries waiting in the connection pool exceed the timeout
- **Error message**: "query_wait_timeout SSL connection has been closed unexpectedly"

#### D. Connection Pool Limits (Transaction Mode)
- **Neon uses**: PgBouncer in `transaction mode` (pool_mode=transaction)
- **Issue**: Connections return to pool after each transaction completes
- **Limitation**: SET/RESET statements don't persist across transactions
- **Per-user-per-database limit**: `default_pool_size = 0.9 × max_connections`

#### E. Serverless Function Issues
- **Problem**: Each invocation opens a new connection
- **Risk**: Quickly exceeding `max_connections` limit
- **Solution**: Use pooled connections (which you're already doing with `-pooler`)

#### F. Connection Leaks
- **Cause**: Connections not properly closed after transactions
- **Result**: Connection pool exhaustion over time

---

## 3. Required Client Options for Reliability (Timeouts, Idle, Connection Settings)

### Complete Recommended Configuration:

```typescript
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, {
  // === SSL/Security ===
  ssl: 'require',  // Neon requirement
  
  // === Connection Pool ===
  max: 10,                           // Max concurrent connections (default)
  // Adjust based on your serverless function concurrency
  
  // === Timeouts (CRITICAL for Neon) ===
  connect_timeout: 30,               // Connection establishment timeout (seconds)
  idle_timeout: 20,                  // Close idle connections after 20 seconds
  max_lifetime: 60 * 30,            // Max connection lifetime (30 minutes)
  
  // === Error Handling ===
  onnotice: console.log,            // Log PostgreSQL notices
  onparameter: (key, value) => {    // Log parameter changes
    console.log(`Server parameter changed: ${key} = ${value}`);
  },
  
  // === Optional: Debugging ===
  debug: process.env.DATABASE_DEBUG ? 
    (connection, query, params, types) => {
      console.log('Query:', query);
      console.log('Params:', params);
    } : undefined,
  
  // === Session-Level Settings ===
  connection: {
    application_name: 'bookly-frontend',
    // Other Postgres runtime config parameters can go here
  },
  
  // === Type Handling ===
  fetch_types: true,  // Auto-fetch custom types on connect
});

export default sql;
```

### Explanation of Timeout Settings:

| Setting | Value | Purpose | Notes |
|---------|-------|---------|-------|
| `connect_timeout` | 30s | Max time to establish TCP connection | May need to increase to 60s for cold starts |
| `idle_timeout` | 20s | Close connections idle for 20s | Prevents connection exhaustion in serverless |
| `max_lifetime` | 1800s (30 min) | Max time connection can exist | Default is 30-90 min random; 30 min is safe |

### For Serverless Environments (Next.js Functions):

```typescript
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 5,                    // Reduced pool size for serverless
  connect_timeout: 60,       // Longer timeout for cold starts
  idle_timeout: 10,          // Aggressive idle closure for serverless
  max_lifetime: 60 * 15,     // 15 minutes (shorter for function restarts)
  connection: {
    application_name: 'bookly-serverless'
  }
});
```

---

## 4. Is Connection Pooling Properly Configured?

### Current Status: PARTIALLY

**Your connection string includes `-pooler`:**
```
ep-sparkling-firefly-abtg2x24-pooler.eu-west-2.aws.neon.tech
```
✓ This is CORRECT - you're using Neon's PgBouncer connection pooler

### Neon's Connection Pooling Details:

**What Neon provides:**
- **PgBouncer**: Neon's connection pooling service
- **Pool mode**: Transaction mode (`pool_mode=transaction`)
- **Client connection limit**: 10,000 concurrent connections
- **Pool size calculation**: `0.9 × max_connections`
- **Per-user-per-database**: Separate pools for each user/database combination

**Example for 1 CU compute:**
```
max_connections = 419
default_pool_size = 377 (90% of 419)
```

**Limitations of Transaction Mode:**
❌ `SET`/`RESET` statements don't persist across transactions
❌ `LISTEN`/`NOTIFY` won't work
❌ `WITH HOLD CURSOR` not supported
❌ SQL-level `PREPARE`/`DEALLOCATE` not supported
❌ Temporary tables with persistence not supported

### For Your Use Case:

✓ **What works well:**
- Dynamic inserts/updates/selects
- Regular SELECT queries
- Transactions via `sql.begin()`
- Protocol-level prepared statements (automatic)

✗ **What doesn't work:**
- If you use `SET search_path TO ...` expecting it to persist
- If you need persistent session state

### Recommendation:

Your current configuration is GOOD for typical web application usage. However, add explicit configuration:

```typescript
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 10,           // Reasonable for Next.js
  idle_timeout: 20,  // Essential for serverless
  // ... other settings
});
```

---

## 5. Common Issues with Serverless Functions and PostgreSQL Connections

### Issue 1: Connection Pool Exhaustion

**Problem:**
- Each Lambda/serverless invocation creates a new connection
- 100 concurrent invocations = 100 connection attempts
- Neon's default `max_connections` for 0.25 CU = 104 total

**Solution:**
```typescript
// Use pooled connection string (you already do this ✓)
// Add idle_timeout to close unused connections
const sql = postgres(DATABASE_URL, {
  idle_timeout: 10,     // Close after 10s of inactivity
  max: 5,              // Lower pool size for serverless
  connect_timeout: 60  // Longer timeout for cold starts
});
```

### Issue 2: Cold Start Latency

**Problem:**
- Neon scale-to-zero causes compute startup delay
- Connection timeouts if client timeout < cold start time (typically 100-500ms)

**Solution:**
1. **Increase connection timeout:**
```typescript
connect_timeout: 60  // 60 seconds instead of 30
```

2. **Implement retry logic with exponential backoff:**
```typescript
import retry from 'async-retry';

async function queryWithRetry(query) {
  return retry(
    async () => await sql`SELECT * FROM users`,
    {
      retries: 5,
      minTimeout: 1000,
      randomize: true
    }
  );
}
```

3. **Use application-level caching** to reduce database calls

### Issue 3: Transaction Mode Limitations

**Problem:**
- Can't use `SET` statements for persistent session settings
- Each transaction starts fresh

**Solution:**
```typescript
// ✓ DO THIS: Use explicit column references
await sql`SELECT * FROM users WHERE schema_name.table_name = ${value}`;

// ✓ DO THIS: Set at role level (persists across transactions)
// Run once during setup:
// ALTER ROLE neondb_owner SET search_path TO myschema, public;

// ❌ DON'T DO THIS: Expect SET to persist
await sql`SET search_path TO myschema`;
await sql`SELECT * FROM table`;  // Will fail - setting lost
```

### Issue 4: Idle-in-Transaction Timeout

**Problem:**
- 5-minute default timeout for idle transactions
- Long-running requests trigger disconnection

**Solutions:**

**Option A:** Adjust timeout (not recommended)
```sql
-- At session level:
SET idle_in_transaction_session_timeout = 0;

-- At role level (persists):
ALTER ROLE neondb_owner SET idle_in_transaction_session_timeout = 0;
```

**Option B:** Ensure transactions complete quickly (RECOMMENDED)
```typescript
await sql.begin(async sql => {
  // Keep transaction duration minimal
  const user = await sql`SELECT * FROM users WHERE id = ${id}`;
  await sql`UPDATE users SET active = true WHERE id = ${id}`;
  // Return quickly
  return user;
});
```

### Issue 5: Query Wait Timeout

**Problem:**
- 120-second PgBouncer timeout for queries waiting in queue
- High-concurrency scenarios can exceed this

**Solution:**
```typescript
// Optimize slow queries
// Use indexes
// Implement client-side query queuing
// Consider using a separate direct connection for batch operations
```

---

## 6. Difference Between Pooled and Direct Connections in Neon

### Pooled Connection (Current Setup)

**Endpoint:** `ep-...-pooler.aws.neon.tech`

**Characteristics:**
- **Routing:** Through PgBouncer connection pooler
- **Concurrency:** Up to 10,000 client connections
- **Actual connections:** Limited by `default_pool_size` (~90% of `max_connections`)
- **Mode:** Transaction mode (connections return after each transaction)
- **Latency:** Minimal overhead

**Best for:**
- Web applications (your use case)
- Serverless functions
- High-concurrency scenarios
- Connection-per-request frameworks

**Limitations:**
- No persistent session state (`SET` doesn't stick)
- No `LISTEN`/`NOTIFY`
- No SQL-level prepared statements

### Direct Connection

**Endpoint:** `ep-...-pool.aws.neon.tech` → `ep-....aws.neon.tech` (remove `-pooler`)

**Characteristics:**
- **Routing:** Direct to compute
- **Concurrency:** Limited by `max_connections` (varies by compute size)
- **Actual connections:** 1:1 with server connections
- **Mode:** Session mode (persistent session)
- **Latency:** Minimal (bypasses pooler)

**Best for:**
- Schema migrations
- `pg_dump`/`pg_restore`
- Long-running analytics queries
- Admin tasks needing persistent sessions

**When to use:**
```typescript
// For migrations or admin tasks:
const adminSql = postgres(DIRECT_CONNECTION_STRING, {
  ssl: 'require',
  max: 1  // Only one connection for admin tasks
});

// For regular app operations (your current setup):
const appSql = postgres(POOLED_CONNECTION_STRING, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20
});
```

---

## 7. How to Add Connection Timeout Configuration

### Current Implementation

Your current `db.ts` doesn't have timeout configuration:
```typescript
export const sql = postgres(connectionString);
```

### Improved Implementation

```typescript
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Create postgres client with comprehensive timeout configuration
export const sql = postgres(connectionString, {
  // === Connection Establishment ===
  connect_timeout: process.env.NODE_ENV === 'production' ? 60 : 30,
  
  // === Idle Connection Management ===
  idle_timeout: process.env.NODE_ENV === 'production' ? 20 : 0,
  
  // === Connection Lifetime ===
  max_lifetime: 60 * 30,  // 30 minutes
  
  // === Pool Size ===
  max: process.env.NODE_ENV === 'production' ? 5 : 10,
  
  // === SSL/Security ===
  ssl: 'require',
  
  // === Debugging ===
  onnotice: process.env.DATABASE_DEBUG ? console.log : false,
  
  // === Connection Metadata ===
  connection: {
    application_name: 'bookly-frontend'
  },
  
  // === Type Handling ===
  fetch_types: true
});

// Helper function with retry logic for serverless
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof Error && 
          (error.message.includes('password authentication failed') ||
           error.message.includes('permission denied'))) {
        throw error;
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

// Helper for managing transaction timeouts
export async function transactionWithTimeout<T>(
  callback: (sql: typeof sql) => Promise<T>,
  timeoutMs = 30000
): Promise<T> {
  return Promise.race([
    sql.begin(callback),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Transaction timeout')), timeoutMs)
    )
  ]);
}
```

### Environment-Specific Configuration

For Next.js serverless functions, create separate configurations:

```typescript
// lib/db.serverless.ts
import postgres from 'postgres';

export const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
  max: 3,                 // Minimal pool for serverless
  connect_timeout: 60,    // Longer for cold starts
  idle_timeout: 5,        // Aggressive cleanup
  max_lifetime: 60 * 5,   // 5 minutes
  connection: {
    application_name: 'bookly-serverless'
  }
});
```

---

## 8. Should We Add idle_in_transaction_session_timeout or Other Neon-Specific Settings?

### Current Neon Settings (Set by Neon)

Neon enforces these Postgres parameters:
```
idle_in_transaction_session_timeout = 300000  (5 minutes)
query_wait_timeout = 120  (seconds, PgBouncer)
max_connections = varies by compute
```

### Recommendation: YES, add these client-side settings

**Not to override Neon's settings, but to:**
1. Detect issues earlier
2. Handle cold starts
3. Prevent connection leaks
4. Improve serverless reliability

### Recommended Client-Side Configuration

```typescript
const sql = postgres(connectionString, {
  // === Socket-Level Timeouts ===
  connect_timeout: 60,        // Handles Neon cold starts
  idle_timeout: 15,           // Close stale connections (serverless)
  
  // === Connection Lifetime ===
  max_lifetime: 60 * 30,      // Periodic reconnection for freshness
  
  // === Pool Management ===
  max: 5,                     // Conservative for serverless
  
  // === Explicit Error Handling ===
  onnotice: (notice) => {
    // Log but don't crash
    console.warn('PostgreSQL notice:', notice);
  }
});
```

### DO NOT Try to Override These (They're Fixed by Neon):

```typescript
// ❌ DON'T: These won't work with pooled connections
// Neon's PgBouncer is in transaction mode
const sql = postgres(connectionString, {
  // These connection parameters won't persist:
  connection: {
    search_path: 'myschema',  // Will be lost after transaction
    client_encoding: 'UTF8'   // OK, this one is supported
  }
});
```

### Workaround for Neon Transaction Mode

```typescript
// ✓ DO: Set at role level (one-time setup)
// Run in your migration or setup script:
// ALTER ROLE neondb_owner SET search_path TO public, myschema;

// ✓ DO: Use explicit schema references
const users = await sql`
  SELECT * FROM myschema.users WHERE id = ${id}
`;
```

### Best Practices for Serverless

```typescript
// lib/db.ts
import postgres from 'postgres';

const createSql = () => postgres(process.env.DATABASE_URL!, {
  // === Essential for Neon Serverless ===
  ssl: 'require',
  
  // === Timeout Configuration ===
  connect_timeout: 60,        // Allow for cold starts
  idle_timeout: 10,           // Aggressive in serverless
  max_lifetime: 60 * 10,      // 10 minutes (function restart interval)
  
  // === Resource Limits ===
  max: process.env.SERVERLESS_FUNCTIONS_CONCURRENCY ? 3 : 10,
  
  // === Connection Metadata ===
  connection: {
    application_name: 'bookly-frontend'
  },
  
  // === Error Handling ===
  onnotice: false,  // Silence notices in production
  debug: process.env.DATABASE_DEBUG ? console.log : undefined
});

let sql: ReturnType<typeof createSql> | null = null;

export function getSql() {
  if (!sql) {
    sql = createSql();
  }
  return sql;
}

// For proper cleanup in serverless
export async function closeSql() {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = null;
  }
}
```

---

## Summary Table: Recommended Configuration

| Aspect | Recommendation | Reason |
|--------|---|---|
| Connection Type | **Pooled** (use `-pooler` endpoint) | Your setup ✓ Already correct |
| `connect_timeout` | **60 seconds** | Allow for Neon cold starts |
| `idle_timeout` | **10-20 seconds** | Prevent connection exhaustion in serverless |
| `max_lifetime` | **30 minutes** | Periodic reconnection, sync with default |
| `max` pool size | **5-10** (serverless: 3-5) | Prevent exceeding `default_pool_size` |
| `ssl` | **'require'** | Neon requirement |
| Channel binding | **Keep in connection string** | Already in your URL ✓ |
| Query wait timeout | **Don't override** | Neon's 120s is adequate |
| Idle in transaction timeout | **Don't override** | Use for detection, not override |
| `SET` statements | **Avoid or use role-level** | Transaction mode limitations |

---

## Action Items

1. **Update `/lib/db.ts`** with complete timeout configuration (Section 7)
2. **Add retry logic** for serverless functions (Section 5, Issue 1)
3. **Update environment-specific configs** for development vs. production
4. **Monitor connection pool usage** in Neon Console
5. **Test cold starts** with extended `connect_timeout`
6. **Document transaction mode limitations** for team (Section 5, Issue 3)

