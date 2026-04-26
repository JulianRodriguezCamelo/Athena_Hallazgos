import { useState, useEffect } from 'react'

interface Options {
  initialPage?: number
  resetDeps?: unknown[]
}

export function usePagination({ initialPage = 1, resetDeps = [] }: Options = {}) {
  const [page, setPage] = useState(initialPage)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1) }, resetDeps)

  return { page, setPage, resetPage: () => setPage(1) }
}
