/**
 * Location Security Utilities
 * 
 * Provides functions for secure handling of location data,
 * audit logging, and suspicious activity detection.
 */

import { supabase } from "@/integrations/supabase/client";

export interface LocationAccessLog {
  id: string;
  user_id: string;
  expense_id: string | null;
  access_type: 'view' | 'update' | 'delete';
  ip_address: string | null;
  user_agent: string | null;
  accessed_at: string;
}

export interface SuspiciousActivity {
  suspicious_activity: string;
  access_count: number;
  last_access: string;
}

/**
 * Log access to sensitive location data
 * Call this when viewing expense details with location
 */
export async function logLocationAccess(
  expenseId: string,
  accessType: 'view' | 'update' | 'delete'
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_location_access', {
      _expense_id: expenseId,
      _access_type: accessType,
    });

    if (error) {
      console.error('Failed to log location access:', error);
      // Don't throw - logging failure shouldn't break the app
    }
  } catch (err) {
    console.error('Error logging location access:', err);
  }
}

/**
 * Get user's location access history
 */
export async function getLocationAccessLogs(
  limit = 50
): Promise<LocationAccessLog[]> {
  const { data, error } = await supabase
    .from('location_access_logs')
    .select('*')
    .order('accessed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching location access logs:', error);
    return [];
  }

  return (data || []) as LocationAccessLog[];
}

/**
 * Check for suspicious access patterns
 * Returns any detected suspicious activity for the current user
 */
export async function checkSuspiciousActivity(): Promise<SuspiciousActivity[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc('check_suspicious_location_access', {
      _user_id: user.id,
    });

    if (error) {
      console.error('Error checking suspicious activity:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in checkSuspiciousActivity:', err);
    return [];
  }
}

/**
 * Verify user owns an expense before accessing location
 */
export async function verifyExpenseOwnership(
  expenseId: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('user_owns_expense', {
      _expense_id: expenseId,
      _user_id: user.id,
    });

    if (error) {
      console.error('Error verifying expense ownership:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error in verifyExpenseOwnership:', err);
    return false;
  }
}

/**
 * Get low-precision location data (for analytics/general view)
 * This provides ~1km precision instead of ~10m
 */
export async function getLowPrecisionExpenses() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('expenses_low_precision')
    .select('*')
    .eq('user_id', user.id)
    .order('expense_date', { ascending: false });

  if (error) {
    console.error('Error fetching low precision expenses:', error);
    return [];
  }

  return data || [];
}

/**
 * Sanitize location data for logging/error messages
 * Reduces precision to prevent location leakage in logs
 */
export function sanitizeLocationForLogging(
  lat: number | null,
  lng: number | null
): { lat: number | null; lng: number | null } {
  if (lat === null || lng === null) {
    return { lat: null, lng: null };
  }

  // Round to 2 decimal places (~1km precision)
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

/**
 * Check if location data should be shown based on context
 * Returns false for public/shared contexts
 */
export function shouldShowPreciseLocation(context: 'map' | 'share' | 'export'): boolean {
  switch (context) {
    case 'map':
      return true; // Show precise location on user's private map
    case 'share':
      return false; // Don't share precise coordinates publicly
    case 'export':
      return true; // User's own data export can have precise data
    default:
      return false;
  }
}
