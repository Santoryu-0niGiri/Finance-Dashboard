# Firebase Data Not Displaying - Fix Instructions

## Problem
Transactions and goals are being saved to Firebase but not displaying in the dashboard, transactions, goals, or charts components.

## Root Cause
**Missing Firestore Composite Indexes** - When querying with `where()` + `orderBy()` on different fields, Firestore requires composite indexes.

## Solution Steps

### 1. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

This will create the required composite indexes for:
- `transactions` collection: userId + date
- `goals` collection: userId + targetDate

### 2. Alternative: Create Indexes via Firebase Console
If the command doesn't work, create indexes manually:

**For Transactions:**
1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Collection ID: `transactions`
4. Add fields:
   - Field: `userId`, Order: Ascending
   - Field: `date`, Order: Descending
5. Click "Create"

**For Goals:**
1. Click "Create Index" again
2. Collection ID: `goals`
3. Add fields:
   - Field: `userId`, Order: Ascending
   - Field: `targetDate`, Order: Descending
4. Click "Create"

### 3. Check Browser Console
Open your browser's Developer Tools (F12) and check the Console tab for:
- "Fetching transactions for userId: [your-uid]"
- "Fetching goals for userId: [your-uid]"
- Any error messages about missing indexes

### 4. Verify Data in Firebase Console
1. Go to Firebase Console → Firestore Database
2. Check the `transactions` collection
3. Verify that documents have:
   - `userId` field matching your Firebase Auth UID
   - `date` field with valid date string
4. Check the `goals` collection similarly

### 5. Common Issues & Fixes

**Issue: "Missing or insufficient permissions"**
- Your Firestore rules are correct
- Make sure you're logged in
- Check that `userId` in documents matches your Firebase Auth UID

**Issue: "The query requires an index"**
- Wait 2-5 minutes after creating indexes
- Click the link in the error message to auto-create the index
- Or follow steps 1 or 2 above

**Issue: Data still not showing**
- Clear browser cache and reload
- Check that transactions have valid `date` field
- Check that goals have valid `targetDate` field
- Verify userId matches: Open console and check the logged userId

### 6. Temporary Workaround (Testing Only)
If you need immediate results while indexes build, you can temporarily remove the `orderBy()`:

**DON'T USE IN PRODUCTION** - This is just for testing:

In `api.service.ts`, temporarily comment out orderBy:
```typescript
// For transactions
const q = query(
  collection(this.firestore, 'transactions'),
  where('userId', '==', uid)
  // orderBy('date', 'desc')  // Temporarily commented
);

// For goals
const q = query(
  collection(this.firestore, 'goals'),
  where('userId', '==', uid)
  // orderBy('targetDate', 'desc')  // Temporarily commented
);
```

After indexes are created, uncomment the orderBy lines.

## Verification
After applying the fix:
1. Refresh your application
2. Check browser console for successful fetch logs
3. Verify data appears in dashboard
4. Check that charts display correctly
5. Confirm transactions list shows all entries

## Additional Notes
- Index creation can take 2-5 minutes
- You only need to create indexes once
- The `firestore.indexes.json` file is now in your project for future deployments
