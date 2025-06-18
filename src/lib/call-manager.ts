import { supabase } from '@/integrations/supabase/client';
import { DatabaseError } from './errors';

export type CallStatus = 'failed' | 'cancelled' | 'completed';

export interface StaleCall {
  booking_id: string;
  started_at: string;
}

export class CallManager {
  static async cleanupInactiveCall(
    bookingId: string,
    status: CallStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_inactive_call', {
        p_booking_id: bookingId,
        p_status: status,
        p_error_message: errorMessage
      });

      if (error) {
        throw new DatabaseError('Failed to cleanup inactive call', error);
      }
    } catch (error) {
      console.error(`Error cleaning up call for booking ${bookingId}:`, error);
      throw error;
    }
  }

  static async checkAndCleanupStaleCalls(): Promise<void> {
    try {
      // Find calls that have been active for too long (e.g., > 2 hours)
      const { data: staleCalls, error } = await supabase
        .from('active_calls')
        .select('booking_id, started_at')
        .lt('started_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

      if (error) {
        throw new DatabaseError('Failed to find stale calls', error);
      }

      // Cleanup each stale call
      for (const call of (staleCalls as StaleCall[])) {
        await this.cleanupInactiveCall(
          call.booking_id,
          'failed',
          'Call timed out after 2 hours'
        );
      }
    } catch (error) {
      console.error('Error checking for stale calls:', error);
      throw error;
    }
  }
} 