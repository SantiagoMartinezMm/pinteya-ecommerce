import { useState, useCallback } from 'react'

interface PaginationOptions {
  initialPage?: number
  pageSize?: number
  total?: number
}

export function usePagination(options: PaginationOptions = {}) {
  const {
    initialPage = 1,
    pageSize = 10,
    total = 0
  } = options

  const [page, setPage] = useState(initialPage)
  const totalPages = Math.ceil(total / pageSize)

  const nextPage = useCallback(() => {
    setPage(prev => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(prev - 1, 1))
  }, [])

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.min(Math.max(newPage, 1), totalPages))
  }, [totalPages])

  return {
    page,
    pageSize,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  }
} 