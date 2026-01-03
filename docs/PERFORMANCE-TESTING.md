# Performance Testing Guide

## Overview

This document outlines performance testing strategies, benchmarks, and optimization techniques for the Philippine Government Financial Management System.

## Performance Goals

### Page Load Targets

| Page Type | Target | Maximum Acceptable |
|-----------|--------|-------------------|
| Dashboard | < 1.5s | 2.5s |
| DV List | < 2.0s | 3.0s |
| DV Detail | < 1.0s | 2.0s |
| Report Generation | < 10s | 30s |
| Search Results | < 1.5s | 2.5s |

### API Response Targets

| Endpoint Type | Target | Maximum |
|--------------|--------|---------|
| GET (single record) | < 100ms | 300ms |
| GET (list) | < 300ms | 1000ms |
| POST/PUT | < 500ms | 2000ms |
| DELETE | < 200ms | 1000ms |

### System Capacity

- **Concurrent Users:** 50+ simultaneous users
- **Database Queries:** < 50ms average
- **Report Generation:** Handle 10,000+ records
- **File Uploads:** Support up to 10MB files
- **Session Management:** Handle 1000+ active sessions

---

## Performance Testing Tools

### 1. Lighthouse (Built-in Chrome DevTools)

**Usage:**
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:4321/dashboard --output html --output-path ./report.html

# With specific categories
lighthouse http://localhost:4321 --only-categories=performance
```

**Metrics:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Cumulative Layout Shift (CLS): < 0.1
- Total Blocking Time (TBT): < 200ms

### 2. k6 (Load Testing)

**Installation:**
```bash
# Install k6
# Windows: choco install k6
# Mac: brew install k6
# Linux: snap install k6
```

**Basic Load Test:**
```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],    // Less than 1% failures
  },
};

export default function () {
  // Test dashboard load
  const dashboardRes = http.get('http://localhost:4321/dashboard');
  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard loads in < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);

  // Test DV list
  const dvListRes = http.get('http://localhost:4321/disbursements');
  check(dvListRes, {
    'DV list status is 200': (r) => r.status === 200,
    'DV list loads in < 3s': (r) => r.timings.duration < 3000,
  });

  sleep(2);
}
```

**Run Test:**
```bash
k6 run tests/performance/load-test.js
```

### 3. Apache Bench (ab)

**Simple Load Test:**
```bash
# 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:4321/dashboard

# With authentication
ab -n 1000 -c 10 -C "session=your_session_cookie" \
   http://localhost:4321/disbursements
```

### 4. Artillery

**Installation:**
```bash
npm install -g artillery
```

**Configuration (artillery.yml):**
```yaml
config:
  target: "http://localhost:4321"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Sustained load"
    - duration: 60
      arrivalRate: 20
      name: "Spike test"

scenarios:
  - name: "Browse and create DV"
    flow:
      - get:
          url: "/dashboard"
      - get:
          url: "/disbursements"
      - post:
          url: "/api/disbursements"
          json:
            payeeName: "Test"
            amount: 10000
```

**Run:**
```bash
artillery run artillery.yml
```

---

## Database Performance

### Query Optimization

**Check Slow Queries:**
```sql
-- Enable slow query log (MySQL)
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1; -- Log queries > 1 second

-- View slow queries
SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;
```

**Index Analysis:**
```sql
-- Check if queries use indexes
EXPLAIN SELECT * FROM disbursement_vouchers
WHERE status = 'pending_budget';

-- Add index if needed
CREATE INDEX idx_dv_status ON disbursement_vouchers(status);
```

**Recommended Indexes:**
```sql
-- Disbursement vouchers
CREATE INDEX idx_dv_status ON disbursement_vouchers(status);
CREATE INDEX idx_dv_fund_cluster ON disbursement_vouchers(fund_cluster_id);
CREATE INDEX idx_dv_created_at ON disbursement_vouchers(created_at);
CREATE INDEX idx_dv_payee ON disbursement_vouchers(payee_name);

-- Approval workflows
CREATE INDEX idx_workflow_dv_stage ON approval_workflows(dv_id, stage);
CREATE INDEX idx_workflow_status ON approval_workflows(status);

-- Audit logs
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_record_id ON audit_logs(table_name, record_id);

-- Cash advances
CREATE INDEX idx_ca_status ON cash_advances(status);
CREATE INDEX idx_ca_employee ON cash_advances(employee_id);
CREATE INDEX idx_ca_fund_cluster ON cash_advances(fund_cluster_id);
```

### Connection Pooling

**Drizzle Configuration:**
```typescript
// src/lib/db/connection.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,      // Max connections
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});
```

### Query Performance Tips

1. **Use SELECT specific columns** instead of SELECT *
```typescript
// Good
db.select({ id, dvNo, status }).from(disbursementVouchers)

// Bad
db.select().from(disbursementVouchers)
```

2. **Limit result sets**
```typescript
db.select().from(disbursementVouchers).limit(100)
```

3. **Use joins efficiently**
```typescript
// Good - Single query with join
db.select()
  .from(disbursementVouchers)
  .leftJoin(fundClusters, eq(disbursementVouchers.fundClusterId, fundClusters.id))
  .limit(50)

// Bad - N+1 queries
const dvs = await db.select().from(disbursementVouchers)
for (const dv of dvs) {
  const cluster = await db.select().from(fundClusters).where(eq(fundClusters.id, dv.fundClusterId))
}
```

4. **Use database views for complex queries**
```sql
CREATE VIEW vw_budget_availability AS
SELECT
  a.id,
  a.allotment_amount,
  COALESCE(SUM(o.obligation_amount), 0) as total_obligations,
  a.allotment_amount - COALESCE(SUM(o.obligation_amount), 0) as unobligated_balance
FROM registry_allotments a
LEFT JOIN registry_obligations o ON a.id = o.allotment_id
GROUP BY a.id;
```

---

## Frontend Performance

### Astro Optimization

**Static Generation:**
```typescript
// Generate static pages where possible
export const prerender = true;
```

**Lazy Loading:**
```astro
---
// Only load heavy components when needed
const HeavyComponent = lazy(() => import('./HeavyComponent.vue'));
---
```

**Image Optimization:**
```astro
---
import { Image } from 'astro:assets';
---

<Image
  src={photo}
  alt="Description"
  width={800}
  height={600}
  loading="lazy"
/>
```

### Vue Component Optimization

**Use v-memo for expensive lists:**
```vue
<div v-for="item in largeList" :key="item.id" v-memo="[item.id]">
  {{ item.name }}
</div>
```

**Lazy load components:**
```vue
<script setup>
import { defineAsyncComponent } from 'vue';

const AsyncComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
);
</script>
```

**Computed caching:**
```vue
<script setup>
import { computed } from 'vue';

// Cached until dependencies change
const expensiveCalculation = computed(() => {
  return heavyOperation(props.data);
});
</script>
```

### Bundle Size Optimization

**Check bundle size:**
```bash
npm run build
# Check .astro/dist folder size
```

**Code splitting:**
```typescript
// Dynamic imports
const module = await import('./large-module.js');
```

**Tree shaking:**
```typescript
// Good - Import only what you need
import { specificFunction } from 'library';

// Bad - Import everything
import * as library from 'library';
```

---

## Caching Strategies

### Browser Caching

**Static Assets (Nginx):**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### API Response Caching

```typescript
// Simple in-memory cache
const cache = new Map();

export async function getCachedData(key: string, fetcher: () => Promise<any>, ttl = 300) {
  const cached = cache.get(key);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, {
    data,
    expires: Date.now() + (ttl * 1000),
  });

  return data;
}

// Usage
const reports = await getCachedData(
  'monthly-report',
  () => generateMonthlyReport(),
  600 // 10 minutes
);
```

### Report Caching

```typescript
// Cache heavy reports
export async function getOrGenerateReport(params: ReportParams) {
  const cacheKey = `report-${params.type}-${params.year}-${params.month}`;

  // Check database cache
  const cached = await db.select()
    .from(reportCache)
    .where(eq(reportCache.cacheKey, cacheKey))
    .limit(1);

  if (cached.length > 0 && !isExpired(cached[0].expiresAt)) {
    return JSON.parse(cached[0].data);
  }

  // Generate report
  const report = await generateReport(params);

  // Cache for 24 hours
  await db.insert(reportCache).values({
    cacheKey,
    data: JSON.stringify(report),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return report;
}
```

---

## Performance Monitoring

### Application Performance Monitoring (APM)

**Recommended Tools:**
1. New Relic
2. Datadog
3. AppSignal
4. Sentry Performance

**Basic Timing:**
```typescript
export async function monitoredFunction() {
  const start = Date.now();

  try {
    const result = await expensiveOperation();
    const duration = Date.now() - start;

    console.log(`Operation took ${duration}ms`);

    if (duration > 1000) {
      console.warn(`Slow operation detected: ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Operation failed after ${duration}ms`, error);
    throw error;
  }
}
```

### Database Monitoring

```typescript
// Log slow queries
import { drizzle } from 'drizzle-orm/mysql2';

const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      const start = Date.now();

      return () => {
        const duration = Date.now() - start;

        if (duration > 100) {
          console.warn(`Slow query (${duration}ms):`, query);
        }
      };
    },
  },
});
```

---

## Performance Testing Checklist

### Before Release

- [ ] Run Lighthouse audit (score > 90)
- [ ] Run load test with 50 concurrent users
- [ ] Check database query performance
- [ ] Verify all indexes are in place
- [ ] Test report generation with large datasets
- [ ] Check bundle sizes
- [ ] Verify caching is working
- [ ] Test on slow network (3G simulation)
- [ ] Check memory leaks
- [ ] Monitor CPU usage under load

### Regular Monitoring

- [ ] Weekly Lighthouse audits
- [ ] Monthly load testing
- [ ] Quarterly performance review
- [ ] Database query analysis
- [ ] Review slow query logs
- [ ] Check cache hit rates
- [ ] Monitor error rates
- [ ] Track page load times
- [ ] Review APM dashboards

---

## Performance Optimization Priority

### High Priority
1. Database query optimization
2. API response times
3. Page load speed
4. Report generation

### Medium Priority
1. Bundle size reduction
2. Image optimization
3. Caching implementation
4. Code splitting

### Low Priority
1. Prefetching
2. Service workers
3. Progressive enhancement
4. Advanced caching strategies

---

## Common Performance Issues

### Issue: Slow Page Load

**Diagnosis:**
```bash
# Check Lighthouse audit
lighthouse http://localhost:4321/page --view

# Check network tab in DevTools
# Look for:
# - Large asset files
# - Slow API responses
# - Render-blocking resources
```

**Solutions:**
- Optimize images
- Enable compression
- Minimize CSS/JS
- Use CDN for static assets
- Implement lazy loading

### Issue: Slow Database Queries

**Diagnosis:**
```sql
-- Check query execution time
EXPLAIN ANALYZE SELECT * FROM disbursement_vouchers WHERE status = 'pending';

-- Check missing indexes
SELECT * FROM sys.schema_unused_indexes;
```

**Solutions:**
- Add appropriate indexes
- Optimize JOIN queries
- Use database views
- Implement query caching
- Paginate large result sets

### Issue: Memory Leaks

**Diagnosis:**
```javascript
// Use Chrome DevTools Memory Profiler
// Take heap snapshots
// Look for detached DOM nodes
// Check for growing arrays/objects
```

**Solutions:**
- Clear event listeners
- Properly cleanup Vue components
- Avoid global variables
- Use WeakMap for caching
- Implement proper garbage collection

---

## Performance Best Practices

### Do's ✅
- ✅ Use pagination for large lists
- ✅ Implement proper indexing
- ✅ Cache frequently accessed data
- ✅ Optimize database queries
- ✅ Use compression (gzip/brotli)
- ✅ Minimize bundle sizes
- ✅ Use lazy loading
- ✅ Monitor performance metrics
- ✅ Profile before optimizing
- ✅ Test with real-world data

### Don'ts ❌
- ❌ Load all records without pagination
- ❌ Use SELECT * in production
- ❌ Ignore database indexes
- ❌ Skip performance testing
- ❌ Premature optimization
- ❌ Forget to compress assets
- ❌ Use synchronous operations
- ❌ Ignore memory leaks
- ❌ Skip code reviews
- ❌ Deploy without testing

---

## Resources

### Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [k6](https://k6.io/)
- [Artillery](https://artillery.io/)
- [WebPageTest](https://webpagetest.org/)
- [GTmetrix](https://gtmetrix.com/)

### Documentation
- [Astro Performance](https://docs.astro.build/en/concepts/why-astro/#server-first)
- [Vue Performance](https://vuejs.org/guide/best-practices/performance.html)
- [MySQL Optimization](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
- [Web Vitals](https://web.dev/vitals/)

---

Last Updated: January 2026
Version: 1.0
