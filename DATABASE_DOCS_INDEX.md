# Database Documentation Index

This directory contains comprehensive research on configuring PostgreSQL connections with Neon and postgres.js.

## Documents

### 1. POSTGRES_NEON_SUMMARY.md (START HERE)
**Quick reference guide** - Read this first if you're short on time.

Contents:
- Current status assessment
- Critical issues identified (3 main problems)
- 3-step implementation plan
- Key settings explained
- Common mistakes to avoid
- Testing checklist
- Monitoring instructions

**Time to read:** 10-15 minutes

### 2. POSTGRES_NEON_RESEARCH.md (COMPREHENSIVE)
**Full research document** - Detailed coverage of all 8 topics.

Sections:
1. How to properly configure postgres.js for Neon
2. Why connections might close/timeout
3. Required client options for reliability
4. Connection pooling configuration assessment
5. Common serverless function issues (5 specific issues with solutions)
6. Pooled vs. Direct connections comparison
7. How to add connection timeout configuration
8. Should we add idle_in_transaction_session_timeout and Neon-specific settings

**Time to read:** 30-45 minutes
**Best for:** Understanding the full context and making informed decisions

### 3. Current Code Location
- **File:** `/lib/db.ts`
- **Status:** Minimal configuration (needs update)
- **Current lines:** 50 (mostly helper functions)
- **postgres version:** 3.4.9

## Key Findings

### Current Setup Status
```
✓ Using Neon with connection pooler (-pooler endpoint)
✓ Connection string has required SSL settings
✓ postgres.js is properly installed
✗ Missing timeout configuration
✗ No retry logic
✗ No idle connection management
```

### Critical Configuration Missing
```typescript
// Currently:
export const sql = postgres(connectionString);

// Should be:
export const sql = postgres(connectionString, {
  ssl: 'require',
  connect_timeout: 60,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  max: 5
});
```

## Implementation Priority

### HIGH Priority (Do First)
1. Update `/lib/db.ts` with timeout configuration
2. Add `idle_timeout` to prevent connection exhaustion
3. Add `connect_timeout: 60` for Neon cold starts

### MEDIUM Priority (Do Soon)
1. Add retry logic with exponential backoff
2. Update database calls to use retry helper
3. Add monitoring in Neon Console

### LOW Priority (Nice to Have)
1. Environment-specific configurations
2. Additional debugging options
3. Custom error handling

## Common Scenarios

### Scenario 1: "Too many connections" Error
**Problem:** Connection pool exhaustion
**Solution:** Add `idle_timeout: 10` to close unused connections

### Scenario 2: Connection Timeouts
**Problem:** Neon cold starts take 100-500ms
**Solution:** Increase `connect_timeout: 60` and add retry logic

### Scenario 3: Transactions Failing After 5 Minutes
**Problem:** Idle-in-transaction timeout
**Solution:** Ensure transactions complete quickly; don't rely on persistent sessions

### Scenario 4: SET Statements Not Working
**Problem:** Neon uses PgBouncer transaction mode
**Solution:** Use explicit schema references or set at role level

## Related Files

### In node_modules
- `node_modules/postgres/README.md` - postgres.js full documentation
- `node_modules/postgres/src/` - postgres.js source code

### In project
- `/lib/tools/users.ts` - Example database usage
- `/lib/tools/orders.ts` - Example database usage
- `/.env.local` - Database connection string (DO NOT COMMIT)

## External References

### Neon Documentation
- Connection pooling: https://neon.com/docs/connect/connection-pooling
- Connection errors: https://neon.com/docs/connect/connection-errors
- Connection latency: https://neon.com/docs/connect/connection-latency
- Postgres compatibility: https://neon.com/docs/reference/compatibility

### postgres.js
- GitHub: https://github.com/porsager/postgres
- npm: https://www.npmjs.com/package/postgres
- Current version in project: 3.4.9

## Quick Answers

**Q: Should we use pooled or direct connections?**
A: Use pooled (already configured). Only use direct for migrations/admin tasks.

**Q: Do we need to override idle_in_transaction_session_timeout?**
A: No. Detect issues with `connect_timeout` instead.

**Q: Can we use SET statements?**
A: Not persistently. Use schema-qualified names or set at role level.

**Q: How do we handle Neon's scale-to-zero?**
A: Increase `connect_timeout` to 60s and add retry logic with exponential backoff.

**Q: Is the current configuration secure?**
A: Yes. SSL is required and connection string includes `channel_binding=require`.

## Next Steps

1. Read `POSTGRES_NEON_SUMMARY.md` (10 min)
2. If you need details, read relevant sections in `POSTGRES_NEON_RESEARCH.md`
3. Implement the 3-step plan from SUMMARY
4. Follow the testing checklist
5. Monitor Neon Console

## Document Metadata

- **Created:** April 15, 2026
- **postgres.js version:** 3.4.9
- **Neon features:** Connection pooling with PgBouncer (transaction mode)
- **Next.js version:** 16.2.3
- **Project:** bookly-frontend

---

For questions or clarifications, refer to the detailed sections in the research documents.
