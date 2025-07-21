import { supabase } from "@/integrations/supabase/client";

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
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: body,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      console.error(`Edge function ${functionName} error:`, error);
      throw new ApiError('EDGE_FUNCTION_ERROR', error.message, error);
    }

    // Handle standardized API response format
    if (data && typeof data === 'object' && 'success' in data) {
      const response = data as ApiResponse<T>;
      if (!response.success && response.error) {
        throw new ApiError(response.error.code, response.error.message, response.error.details);
      }
      return response.data as T;
    }

    // Fallback for legacy responses
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    console.error(`Unexpected error calling ${functionName}:`, error);
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