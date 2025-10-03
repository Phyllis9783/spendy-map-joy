# Security Documentation - Location Data Protection

## Overview
This application handles sensitive user location data (GPS coordinates) that could reveal personal habits and home addresses. We implement defense-in-depth security measures to protect this data.

## Security Measures Implemented

### 1. Row Level Security (RLS) ✅
**Status**: ENABLED on `expenses` table
- Users can only access their own expense records
- All operations (SELECT, INSERT, UPDATE, DELETE) are restricted by `user_id`
- `user_id` column is NOT NULL and enforced

### 2. Audit Logging 🔍
**Table**: `location_access_logs`
- Tracks all access to location data
- Records: user_id, expense_id, access_type, timestamp
- Protected by RLS (users can only view their own logs)
- Enables detection of suspicious access patterns

### 3. Security Definer Functions 🔒
**Function**: `user_owns_expense(expense_id, user_id)`
- Validates expense ownership without RLS recursion
- Used in critical security checks
- Prevents privilege escalation attacks

**Function**: `log_location_access(expense_id, access_type)`
- Logs access to sensitive location data
- Verifies user authentication and ownership
- Raises exceptions on unauthorized access attempts

**Function**: `check_suspicious_location_access(user_id)`
- Detects abnormal access patterns (>100 requests/hour)
- Returns suspicious activity summary
- Can trigger alerts for security monitoring

### 4. Reduced Precision View 📍
**View**: `expenses_low_precision`
- Provides ~1km precision coordinates (vs ~10m in main table)
- Use for non-critical operations (e.g., city-level analytics)
- Reduces impact if data is compromised
- Inherits RLS protection from base table

### 5. Performance Indexes 🚀
```sql
idx_expenses_user_id           -- Fast user-based filtering
idx_expenses_user_location     -- Efficient location queries
```
- Prevents timing attacks through consistent query performance
- Ensures RLS checks are fast and don't leak information

## Data Access Patterns

### High-Precision Locations (Use Sparingly)
```typescript
// Only when showing exact locations on map
const { data } = await supabase
  .from('expenses')
  .select('location_lat, location_lng')
  .eq('user_id', userId);
```

### Low-Precision Locations (Preferred for Analytics)
```typescript
// For city-level statistics
const { data } = await supabase
  .from('expenses_low_precision')
  .select('location_lat, location_lng')
  .eq('user_id', userId);
```

## Monitoring Location Access

Users can view their location access logs:
```typescript
const { data: logs } = await supabase
  .from('location_access_logs')
  .select('*')
  .order('accessed_at', { ascending: false });
```

Check for suspicious activity:
```typescript
const { data: suspicious } = await supabase
  .rpc('check_suspicious_location_access', { _user_id: userId });
```

## Security Best Practices

### ✅ DO
- Always filter by `user_id` in queries
- Use `expenses_low_precision` view for analytics
- Log sensitive operations using `log_location_access()`
- Monitor `location_access_logs` regularly
- Keep RLS policies up to date

### ❌ DON'T
- Never disable RLS on the `expenses` table
- Don't expose raw GPS coordinates in public APIs
- Don't log full coordinates in error messages
- Don't cache location data on client side
- Don't share location data across user boundaries

## Threat Model

### Mitigated Threats
✅ **RLS Bypass**: Multiple layers of defense
✅ **SQL Injection**: Parameterized queries + RLS
✅ **Timing Attacks**: Performance indexes
✅ **Privilege Escalation**: Security definer functions
✅ **Data Leakage**: Audit logging + precision reduction

### Remaining Considerations
⚠️ **Client-side security**: Ensure frontend doesn't leak data
⚠️ **API rate limiting**: Monitor for brute force attempts
⚠️ **Backup encryption**: Ensure backups are encrypted at rest
⚠️ **Legal compliance**: Follow GDPR/CCPA for location data

## Incident Response

If suspicious activity is detected:

1. **Check audit logs**:
   ```sql
   SELECT * FROM location_access_logs 
   WHERE user_id = [affected_user_id]
   ORDER BY accessed_at DESC;
   ```

2. **Look for patterns**:
   ```sql
   SELECT * FROM check_suspicious_location_access([user_id]);
   ```

3. **Review RLS policies**:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'expenses';
   ```

4. **Verify RLS is enabled**:
   ```sql
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'expenses';
   ```

## Compliance

This security implementation addresses:
- **GDPR Article 32**: Security of processing (location data as special category)
- **CCPA**: Reasonable security procedures for personal information
- **OWASP Top 10**: Broken Access Control (A01:2021)

## Regular Security Audits

Recommended quarterly checks:
- [ ] Verify RLS is enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'expenses'`
- [ ] Review access logs: `SELECT COUNT(*) FROM location_access_logs WHERE accessed_at > now() - interval '90 days'`
- [ ] Check for suspicious patterns: `SELECT * FROM check_suspicious_location_access([sample_users])`
- [ ] Audit RLS policies: Review and update as needed
- [ ] Test with least-privilege users: Ensure users can't access others' data

## Support

For security concerns, review the audit logs or contact the development team.

Last Updated: 2025-10-03
