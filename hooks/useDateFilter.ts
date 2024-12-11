import { useState, useCallback } from 'react'
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  subMonths, 
  subYears,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'

export type DateRangeType = 'today' | '7days' | '30days' | '12months' | 'custom'

export interface DateRange {
  start: Date
  end: Date
}

export interface CustomDateRange extends DateRange {
  isValid: boolean
}

export interface DateFilterError {
  message: string
  code: 'INVALID_DATE' | 'START_AFTER_END' | 'FUTURE_DATE'
}

interface DateFilterState {
  dateRange: DateRangeType
  customRange: CustomDateRange
  error: DateFilterError | null
}

interface DateFilterActions {
  setDateRange: (range: DateRangeType) => void
  setCustomRange: (range: Partial<DateRange>) => void
  getDateRange: () => DateRange
  formatDateRange: (format?: string) => string
  validateDateRange: (range: DateRange) => boolean
  resetDateRange: () => void
}

export type DateFilterHookReturn = DateFilterState & DateFilterActions

export function useDateFilter(initialRange: DateRangeType = '7days'): DateFilterHookReturn {
  const [dateRange, setDateRangeState] = useState<DateRangeType>(initialRange)
  const [customRange, setCustomRangeState] = useState<CustomDateRange>({
    start: new Date(),
    end: new Date(),
    isValid: true
  })
  const [error, setError] = useState<DateFilterError | null>(null)

  const validateDateRange = useCallback((range: DateRange): boolean => {
    if (!isValid(range.start) || !isValid(range.end)) {
      setError({
        message: 'Las fechas proporcionadas no son válidas',
        code: 'INVALID_DATE'
      })
      return false
    }

    if (isAfter(range.start, range.end)) {
      setError({
        message: 'La fecha de inicio no puede ser posterior a la fecha final',
        code: 'START_AFTER_END'
      })
      return false
    }

    if (isAfter(range.end, new Date())) {
      setError({
        message: 'No se pueden seleccionar fechas futuras',
        code: 'FUTURE_DATE'
      })
      return false
    }

    setError(null)
    return true
  }, [])

  const setDateRange = useCallback((range: DateRangeType) => {
    setError(null)
    setDateRangeState(range)
  }, [])

  const setCustomRange = useCallback((range: Partial<DateRange>) => {
    const newRange = {
      start: range.start || customRange.start,
      end: range.end || customRange.end
    }

    const isValid = validateDateRange(newRange)

    setCustomRangeState({
      ...newRange,
      isValid
    })
  }, [customRange, validateDateRange])

  const getDateRange = useCallback((): DateRange => {
    const end = endOfDay(new Date())
    let start: Date

    switch (dateRange) {
      case 'today':
        start = startOfDay(new Date())
        break
      case '7days':
        start = subDays(end, 7)
        break
      case '30days':
        start = subDays(end, 30)
        break
      case '12months':
        start = subMonths(end, 12)
        break
      case 'custom':
        return {
          start: startOfDay(customRange.start),
          end: endOfDay(customRange.end)
        }
      default:
        start = subDays(end, 7)
    }

    return { start, end }
  }, [dateRange, customRange])

  const formatDateRange = useCallback((dateFormat: string = 'dd/MM/yyyy'): string => {
    const { start, end } = getDateRange()
    return `${format(start, dateFormat, { locale: es })} - ${format(end, dateFormat, { locale: es })}`
  }, [getDateRange])

  const resetDateRange = useCallback(() => {
    setDateRangeState('7days')
    setCustomRangeState({
      start: new Date(),
      end: new Date(),
      isValid: true
    })
    setError(null)
  }, [])

  return {
    dateRange,
    customRange,
    error,
    setDateRange,
    setCustomRange,
    getDateRange,
    formatDateRange,
    validateDateRange,
    resetDateRange
  }
}