export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super('DATABASE_ERROR', message, 500, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class ConcurrencyError extends AppError {
  constructor(message: string, details?: any) {
    super('CONCURRENCY_ERROR', message, 409, details);
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      status: error.statusCode
    };
  }
  
  console.error('Unhandled error:', error);
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    },
    status: 500
  };
}; 