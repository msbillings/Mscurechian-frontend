# Performance Budgets & Monitoring

## 🎯 **Performance Budgets (ENFORCED)**

These are **hard limits** that should trigger alerts/CI failures if exceeded.

### Page Load Metrics

| Metric                             | Budget  | Current | Status               |
| ---------------------------------- | ------- | ------- | -------------------- |
| **LCP (Largest Contentful Paint)** | < 2.5s  | ~4s     | ⚠️ NEEDS IMPROVEMENT |
| **FID (First Input Delay)**        | < 100ms | TBD     | ⏳ MEASURE           |
| **CLS (Cumulative Layout Shift)**  | < 0.1   | TBD     | ⏳ MEASURE           |
| **TTI (Time to Interactive)**      | < 3.5s  | TBD     | ⏳ MEASURE           |
| **TBT (Total Blocking Time)**      | < 300ms | TBD     | ⏳ MEASURE           |

### API Request Metrics

| Metric                      | Budget  | Current | Status     |
| --------------------------- | ------- | ------- | ---------- |
| **Requests per navigation** | < 3     | 15+     | ❌ FAILING |
| **Unrelated API calls**     | 0       | 10-12   | ❌ FAILING |
| **Cache hit rate**          | > 80%   | ~20%    | ❌ FAILING |
| **Average request time**    | < 500ms | TBD     | ⏳ MEASURE |
| **Failed requests**         | < 1%    | TBD     | ⏳ MEASURE |

### Bundle Size Budgets

| Asset Type               | Budget  | Current | Status     |
| ------------------------ | ------- | ------- | ---------- |
| **Initial JS**           | < 200KB | TBD     | ⏳ MEASURE |
| **Page-specific chunks** | < 150KB | TBD     | ⏳ MEASURE |
| **CSS**                  | < 50KB  | TBD     | ⏳ MEASURE |
| **Images (per page)**    | < 500KB | TBD     | ⏳ MEASURE |
| **Total page weight**    | < 1MB   | TBD     | ⏳ MEASURE |

---

## 📊 **How to Monitor**

### 1. Local Development

Add this to your `package.json`:

```json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "measure-perf": "lighthouse http://localhost:3000/hospital-admin --view"
  }
}
```

### 2. React Query DevTools

Already enabled in dev. Check for:

- ✅ **Green queries** = Using cache (good)
- ⚠️ **Yellow queries** = Fetching (acceptable on first load)
- ❌ **Red queries** = Error (investigate immediately)

### 3. Network Tab Checklist

On **EVERY page navigation**, verify:

```
✅ Only page-specific APIs fire
✅ < 3 total requests
✅ No doctors/staff/helpdesk on unrelated pages
✅ Cached data shows "(from disk cache)"
✅ Load time < 2-3 seconds
```

### 4. Browser Performance API

Add this to measure real user metrics:

```tsx
// lib/performance.ts
export const measurePageLoad = () => {
  if (typeof window === "undefined") return;

  window.addEventListener("load", () => {
    const perfData = window.performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;

    console.log("Performance Metrics:", {
      DNS: perfData.domainLookupEnd - perfData.domainLookupStart,
      TCP: perfData.connectEnd - perfData.connectStart,
      Request: perfData.responseStart - perfData.requestStart,
      Response: perfData.responseEnd - perfData.responseStart,
      DOM:
        perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      Total: perfData.loadEventEnd - perfData.fetchStart,
    });

    // Send to analytics
    // analytics.track('page_load', { ... });
  });
};
```

---

## 🚨 **Alert Triggers**

Set up alerts for:

1. **LCP > 4s** → Investigate immediately
2. **Requests > 5 per navigation** → Layout invalidation issue
3. **Cache hit rate < 60%** → Query key stability issue
4. **Error rate > 2%** → Backend or integration issue

---

## 🎯 **Performance Testing Workflow**

### Before Every Deployment:

1. **Clear cache and storage**

   ```js
   sessionStorage.clear();
   localStorage.clear();
   ```

2. **Test navigation flow**

   ```
   Login → Dashboard → Staff → Doctors → Helpdesk → Transactions
   ```

3. **Verify metrics**
   - Open Network tab
   - Clear network log
   - Navigate to each page
   - Count requests (should be < 3 per page)

4. **Check React Query cache**
   - Open React Query DevTools
   - Verify queries are cached (green)
   - No refetching on revisit

5. **Run Lighthouse**

   ```bash
   npm run measure-perf
   ```

   **Target Scores:**
   - Performance: > 90
   - Accessibility: > 95
   - Best Practices: > 90
   - SEO: > 90

---

## 📈 **Regression Prevention**

### Pre-commit Hook

Add this to `.husky/pre-commit`:

```bash
#!/bin/sh
# Check for common performance anti-patterns

echo "🔍 Checking for performance anti-patterns..."

# Check for user object destructuring in layouts
if grep -r "const { user" app/*/layout.tsx; then
  echo "❌ ERROR: Layout is destructuring user object"
  echo "   Use primitive selectors instead:"
  echo "   const userName = useAuthStore(state => state.user?.name);"
  exit 1
fi

# Check for object-based query keys
if grep -r "queryKey: \[.*{" app/; then
  echo "⚠️  WARNING: Found potential object in queryKey"
  echo "   Use primitives only in query keys"
fi

echo "✅ Performance checks passed"
```

### CI/CD Pipeline

Add to your GitHub Actions / GitLab CI:

```yaml
- name: Performance Budget Check
  run: |
    npm run build
    npm run analyze
    # Check bundle sizes
    if [ $(stat -f%z .next/static/chunks/pages/*.js | head -1) -gt 200000 ]; then
      echo "❌ Bundle size exceeds 200KB"
      exit 1
    fi
```

---

## 📋 **Weekly Performance Review**

Every week, check:

1. **Lighthouse scores trend** (should stay > 90)
2. **API request count trend** (should stay < 3 per page)
3. **Cache hit rate** (should stay > 80%)
4. **User complaints about speed** (should be zero)

---

## 🎯 **Success Criteria**

You've achieved optimal performance when:

✅ LCP < 2.5s on all pages
✅ Requests < 3 per navigation  
✅ Cache hit rate > 80%  
✅ No unrelated API calls  
✅ Lighthouse score > 90  
✅ Zero speed-related user complaints

---

**Created:** 2026-01-27  
**Owner:** Engineering Team  
**Review Frequency:** Weekly  
**Last Updated:** 2026-01-27
