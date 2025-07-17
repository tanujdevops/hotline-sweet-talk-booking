// Common validation utilities for edge functions
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'uuid' | 'email' | 'phone';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: any[];
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'ValidationError';
  }
}

export function validateInput(data: any, schema: ValidationSchema): void {
  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      throw new ValidationError(field, 'is required');
    }

    // Skip validation for optional empty fields
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (rule.type) {
      switch (rule.type) {
        case 'string':
          if (typeof value !== 'string') {
            throw new ValidationError(field, 'must be a string');
          }
          break;
        case 'number':
          if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
            throw new ValidationError(field, 'must be a number');
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new ValidationError(field, 'must be a boolean');
          }
          break;
        case 'uuid':
          if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            throw new ValidationError(field, 'must be a valid UUID');
          }
          break;
        case 'email':
          if (typeof value !== 'string' || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) {
            throw new ValidationError(field, 'must be a valid email address');
          }
          break;
        case 'phone':
          if (typeof value !== 'string' || !/^\+?[\d\s\-\(\)]+$/.test(value)) {
            throw new ValidationError(field, 'must be a valid phone number');
          }
          break;
      }
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        throw new ValidationError(field, `must be at least ${rule.minLength} characters long`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        throw new ValidationError(field, `must be no more than ${rule.maxLength} characters long`);
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        throw new ValidationError(field, 'format is invalid');
      }
    }

    // Allowed values validation
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      throw new ValidationError(field, `must be one of: ${rule.allowedValues.join(', ')}`);
    }
  }
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with + if it's an international number
  if (cleaned.length > 10 && !cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  
  return cleaned;
}