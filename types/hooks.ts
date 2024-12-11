// Tipos base para todos los hooks
export interface BaseHookState {
  loading: boolean
  error: Error | null
}

// Tipo base para errores
export interface BaseError {
  code: string
  message: string
  details?: unknown
}

// Tipo base para respuestas paginadas
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// Tipo base para auditoría
export interface AuditPayload {
  user_id?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// Tipo base para validación
export interface ValidationResult {
  isValid: boolean
  errors: string[]
} 