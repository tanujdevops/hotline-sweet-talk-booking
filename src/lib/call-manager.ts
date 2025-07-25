
import { DatabaseError } from './errors';
import { callEdgeFunction, ApiError, handleApiError } from '@/lib/api-client';

// Lazy load Supabase client only when needed
const getSupabase = async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
};

export type CallStatus = 'failed' | 'cancelled' | 'completed';

export interface VapiConcurrencyResponse {
  canMakeCall: boolean;
  queuePosition?: number;
  planType?: string;
  currentCalls?: number;
  maxCalls?: number;
}

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
      const supabase = await getSupabase();
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
      const supabase = await getSupabase();
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

  static async checkVapiConcurrency(planType: string): Promise<VapiConcurrencyResponse> {
    try {
      return await callEdgeFunction<VapiConcurrencyResponse>('check-vapi-concurrency', { planType });
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(handleApiError(error));
      }
      throw error;
    }
  }

  static async initiateVapiCall(bookingId: string, phone: string, name: string): Promise<any> {
    try {
      return await callEdgeFunction('initiate-vapi-call', { 
        bookingId, 
        phone, 
        name 
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(handleApiError(error));
      }
      throw error;
    }
  }
}
