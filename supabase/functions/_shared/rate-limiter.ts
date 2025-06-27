// Simple in-memory rate limiter for webhook endpoints
// In production, consider using Redis or a database-backed rate limiter

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string, 
  config: RateLimitConfig
): { allowed: boolean; remainingRequests: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Clean up expired entries
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
  
  let entry = rateLimitStore.get(identifier);
  
  if (!entry || entry.resetTime <= now) {
    // Create new entry or reset expired entry
    entry = {
      count: 1,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(identifier, entry);
    
    return {
      allowed: true,
      remainingRequests: config.maxRequests - 1,
      resetTime: entry.resetTime
    };
  }
  
  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: entry.resetTime
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(identifier, entry);
  
  return {
    allowed: true,
    remainingRequests: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

export function getClientIdentifier(req: Request): string {
  // Try to get real IP from various headers (for when behind proxies)
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a generic identifier
  return "unknown";
}