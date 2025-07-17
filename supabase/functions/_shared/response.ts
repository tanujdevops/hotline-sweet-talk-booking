// Common response utilities for edge functions
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

export function createErrorResponse(code: string, message: string, details?: any, status = 500): Response {
  const response: ApiResponse = {
    success: false,
    error: { code, message, details }
  };
  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

export function createSuccessResponse<T>(data: T): Response {
  const response: ApiResponse<T> = {
    success: true,
    data
  };
  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

export async function parseRequestBody<T = any>(req: Request): Promise<T> {
  try {
    const text = await req.text();
    if (!text.trim()) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
}