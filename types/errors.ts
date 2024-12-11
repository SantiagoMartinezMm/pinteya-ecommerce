export enum ErrorCode {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER'
}

export interface AppError extends Error {
  code: ErrorCode
  details?: Record<string, unknown>
  timestamp: string
  retryable: boolean
}

export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): AppError {
  return {
    name: 'AppError',
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    retryable: [ErrorCode.NETWORK, ErrorCode.SERVER].includes(code)
  } as AppError
} 