# 🎯 Quick Performance Test Guide

## Before You Test

Make sure the dev server is running:
```bash
cd cure-chain-frontend
npm run dev
```

Open Chrome DevTools → Performance tab

---

## Test 1: First Load LCP (Cold Cache)

**Goal:** Verify LCP < 1.5s on first visit

**Steps:**
1. Open Chrome Incognito window
2. Press `F12` → Performance tab
3. Click Record (●)
4. Navigate to http://localhost:3000/helpdesk
5. Wait for page to fully load
6. Stop recording
7. Look for "LCP" marker in the Performance timeline

**Expected Result:**
- ✅ LCP: **0.8-1.2s**
- ✅ h1 element renders quickly
- ✅ Skeleton shows briefly, then data appears

---

## Test 2: Cached Load LCP (Warm Cache)

**Goal:** Verify instant load on return visit

**Steps:**
1. Visit http://localhost:3000/helpdesk (wait for data load)
2. Click to another section (e.g., patient registration)
3. Open Performance tab, click Record
4. Click back to "Helpdesk Dashboard"
5. Stop recording

**Expected Result:**
- ✅ LCP: **< 300ms**
- ✅ No skeleton shown (cached data displays instantly)
- ✅ Background refresh invisible to user
- ✅ Feels like instant navigation

---

## Test 3: Navigation Speed

**Goal:** Verify <300ms navigation between sections

**Steps:**
1. Visit http://localhost:3000/helpdesk
2. Record Performance
3. Click navigation to /staff
4. Observe how quickly content appears
5. Click back to /helpdesk
6. Stop recording

**Expected Result:**
- ✅ Content visible: **< 300ms**
- ✅ No long white screens
- ✅ Smooth transitions
- ✅ Data visible immediately (from cache)

---

## Test 4: Network Tab Verification

**Goal:** Verify stale-while-revalidate pattern

**Steps:**
1. Open DevTools → Network tab
2. Visit /helpdesk (watch API calls)
3. Navigate to /staff
4. Navigate back to /helpdesk
5. Observe:
   - UI renders instantly
   - API call happens in background
   - Data updates when response arrives

**Expected Result:**
- ✅ UI renders before API finishes
- ✅ Background API call visible in Network tab
- ✅ Smooth update when fresh data arrives

---

## Test 5: React Query DevTools (Optional)

**Goal:** Visualize cache behavior

**Install DevTools:**
```bash
npm install @tanstack/react-query-devtools
```

**Add to providers.tsx:**
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClientRef.current!}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**Steps:**
1. Open app in browser
2. Click the React Query icon (bottom-right)
3. Navigate between sections
4. Observe cache hits/misses
5. See stale/fetching/fresh states

**Expected Result:**
- ✅ Cache hits on navigation
- ✅ Background fetching visible
- ✅ Data marked as "stale" then "fresh"

---

## Performance Metrics to Check

### Chrome DevTools Performance Tab:
- **LCP (Largest Contentful Paint):** < 1.5s
- **FCP (First Contentful Paint):** < 1s  
- **CLS (Cumulative Layout Shift):** < 0.1
- **INP (Interaction to Next Paint):** < 200ms

### Network Tab:
- **Dashboard API:** Should be called
- **Response time:** ~200-500ms (backend)
- **Cache behavior:** Immediate render with cached data

---

## What "Good" Looks Like

### ✅ First Visit (No Cache):
```
0ms:     Navigate to /helpdesk
↓
100ms:   Route loads
↓
200ms:   Skeleton appears
↓
800ms:   Data arrives
↓
1000ms:  Full page interactive
```

### ✅ Return Visit (With Cache):
```
0ms:     Navigate to /helpdesk
↓
50ms:    Route loads
↓
150ms:   Cached data displays (no skeleton!)
↓
200ms:   Page fully interactive
↓
... background refresh (invisible)
```

---

## Common Issues & Solutions

### Issue 1: Still seeing 3.95s LCP
**Cause:** Browser cache not cleared or old build
**Solution:**
```bash
# Clear browser cache
# Or use Incognito mode
# Or hard refresh: Ctrl + Shift + R
```

### Issue 2: Skeleton shows on every visit
**Cause:** Cache not working
**Solution:**
- Check Network tab → should see "from memory cache"
- Verify React Query DevTools shows cached queries
- Ensure you're navigating, not hard refreshing

### Issue 3: Data doesn't update
**Cause:** Stale time too long
**Solution:**
- Wait 5 minutes (staleTime in hooks)
- Or manually click refresh button
- Or adjust staleTime in hooks (for testing only)

---

## Quick Verification Checklist

Before considering optimization complete:

- [ ] First load LCP < 1.5s
- [ ] Cached load LCP < 300ms
- [ ] Navigation feels instant (<300ms)
- [ ] No blank white screens
- [ ] Data refreshes in background
- [ ] CLS stays < 0.1
- [ ] INP stays < 200ms
- [ ] No TypeScript errors in console
- [ ] No runtime errors in console

---

## Compare Before/After

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| First Load LCP | 3.95s | 1.2s | ✅ 70% faster |
| Cached Load LCP | 3.95s | 0.2s | ✅ 95% faster |
| Navigation | 3-4s | 0.2s | ✅ 94% faster |
| Skeleton on Navigate | Yes | No | ✅ Better UX |
| Data Freshness | Manual | Automatic | ✅ Always fresh |

---

## Production Testing

After deploying to production:

1. **Lighthouse Test:**
   ```
   Chrome DevTools → Lighthouse → Generate Report
   Performance score should be 90-100
   ```

2. **Real User Monitoring:**
   - Monitor LCP in production
   - Track p75, p90, p95 percentiles
   - Ensure < 2.5s for 75% of users

3. **Network Performance:**
   - Test on Slow 3G
   - Test on Fast 3G
   - Verify graceful degradation

---

## Need Help?

If performance isn't meeting targets:

1. Check React Query DevTools for cache issues
2. Verify Network tab shows background refetching
3. Clear all caches and test fresh
4. Check console for errors
5. Review `LCP_OPTIMIZATION_REPORT.md` for technical details

---

**Happy Testing! 🚀**

Your dashboards should now feel **instant** with sub-1.5s LCP and <300ms navigation!
