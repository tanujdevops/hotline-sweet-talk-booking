// Common response utilities for edge functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
export function createErrorResponse(code, message, details, status = 500) {
  const response = {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
  return new Response(JSON.stringify(response), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    },
    status
  });
}
export function createSuccessResponse(data) {
  const response = {
    success: true,
    data
  };
  return new Response(JSON.stringify(response), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    },
    status: 200
  });
}
export function handleCors(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  return null;
}
export async function parseRequestBody(req) {
  try {
    const text = await req.text();
    if (!text.trim()) {
      return {};
    }
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
}
