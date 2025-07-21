import { supabase } from "@/integrations/supabase/client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class ApiError extends Error {
  code: string;
  details?: any;
  
  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function callEdgeFunction<T = any>(
  functionName: string, 
  body?: any
): Promise<T> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new ApiError('CONFIG_ERROR', 'Supabase client is not configured.');
    }

    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(body || {}),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Edge function ${functionName} error:`, data);
      const errorMessage = data?.message || data?.error || 'Edge function returned an error.';
      const errorCode = data?.code || 'EDGE_FUNCTION_ERROR';
      throw new ApiError(errorCode, errorMessage, data);
    }
    
    // Handle standardized API response format
    if (data && typeof data === 'object' && 'success' in data) {
      const apiResponse = data as ApiResponse<T>;
      if (!apiResponse.success && apiResponse.error) {
        throw new ApiError(apiResponse.error.code, apiResponse.error.message, apiResponse.error.details);
      }
      return apiResponse.data as T;
    }

    // Fallback for direct data responses
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    console.error(`Unexpected error calling ${functionName}:`, error);
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError) {
      throw new ApiError('INVALID_RESPONSE', 'Failed to parse server response.', error);
    }
    throw new ApiError('NETWORK_ERROR', 'Failed to call edge function', error);
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_PLAN_TYPE':
        return 'Invalid pricing plan selected. Please try again.';
      case 'NO_ACCOUNT':
        return 'Service temporarily unavailable. Please try again later.';
      case 'DATABASE_ERROR':
        return 'Database error occurred. Please try again.';
      case 'CONFIG_ERROR':
        return 'Service configuration error. Please contact support.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection and try again.';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}